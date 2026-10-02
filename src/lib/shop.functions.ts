import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function zarinpalBase() {
  const merchant = process.env["ZARINPAL_MERCHANT_ID"];
  const sandbox = !merchant || process.env["ZARINPAL_SANDBOX"] === "true";
  return {
    merchant: merchant || "00000000-0000-0000-0000-000000000000",
    api: sandbox ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com",
  };
}

async function computeCoupon(code: string | undefined, subtotal: number) {
  if (!code) return { discount: 0, code: null as string | null };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("is_active", true)
    .maybeSingle();
  if (!data) throw new Error("کد تخفیف نامعتبر است");
  if (data.expires_at && new Date(data.expires_at) < new Date()) throw new Error("کد تخفیف منقضی شده است");
  let discount = Math.round((subtotal * data.percent) / 100);
  if (data.max_discount) discount = Math.min(discount, Number(data.max_discount));
  return { discount, code: data.code };
}

export const checkCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(1).max(50), subtotal: z.number().min(0) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const r = await computeCoupon(data.code, data.subtotal);
      return { ok: true as const, discount: r.discount, code: r.code };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        items: z.array(z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(20) })).min(1).max(50),
        coupon: z.string().max(50).optional(),
        full_name: z.string().trim().min(2).max(100),
        phone: z.string().trim().regex(/^09\d{9}$/),
        address: z.string().trim().min(10).max(500),
        origin: z.string().url(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ids = data.items.map((i) => i.id);
    const { data: products, error } = await supabaseAdmin.from("products").select("*").in("id", ids).eq("is_active", true);
    if (error || !products) return { ok: false as const, error: "خطا در دریافت محصولات" };

    let subtotal = 0;
    const lines = [];
    for (const it of data.items) {
      const p = products.find((x) => x.id === it.id);
      if (!p) return { ok: false as const, error: "یکی از محصولات موجود نیست" };
      if (p.stock < it.qty) return { ok: false as const, error: `موجودی «${p.name}» کافی نیست` };
      const unit = Math.round(Number(p.price) * (1 - p.discount_percent / 100));
      subtotal += unit * it.qty;
      lines.push({ product_id: p.id, name: p.name, unit_price: unit, quantity: it.qty });
    }

    let coupon;
    try {
      coupon = await computeCoupon(data.coupon || undefined, subtotal);
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
    const total = Math.max(subtotal - coupon.discount, 1000);

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
        subtotal,
        discount: coupon.discount,
        total,
        coupon_code: coupon.code,
        full_name: data.full_name,
        phone: data.phone,
        address: data.address,
      })
      .select()
      .single();
    if (oErr || !order) return { ok: false as const, error: "ثبت سفارش ناموفق بود" };
    await supabaseAdmin.from("order_items").insert(lines.map((l) => ({ ...l, order_id: order.id })));
    await supabaseAdmin.from("profiles").update({ full_name: data.full_name, phone: data.phone, address: data.address }).eq("id", context.userId);

    const zp = zarinpalBase();
    const res = await fetch(`${zp.api}/pg/v4/payment/request.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_id: zp.merchant,
        amount: total,
        currency: "IRT",
        callback_url: `${data.origin}/payment/callback?order=${order.id}`,
        description: `سفارش ${order.id.slice(0, 8)} - موبایل پارس`,
        metadata: { mobile: data.phone },
      }),
    });
    const json = (await res.json().catch(() => null)) as { data?: { code?: number; authority?: string } } | null;
    const authority = json?.data?.authority;
    if (!authority || json?.data?.code !== 100) {
      console.error("zarinpal request failed", json);
      await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
      return { ok: false as const, error: "اتصال به درگاه پرداخت ناموفق بود" };
    }
    await supabaseAdmin.from("orders").update({ authority }).eq("id", order.id);
    return { ok: true as const, url: `${zp.api}/pg/StartPay/${authority}` };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order: z.string().uuid(), authority: z.string().min(1).max(100), status: z.string().max(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", data.order).maybeSingle();
    if (!order || order.user_id !== context.userId) return { ok: false as const, error: "سفارش یافت نشد" };
    if (order.status !== "pending") return { ok: order.status !== "failed", refId: order.ref_id, error: order.status === "failed" ? "پرداخت ناموفق" : undefined };
    if (data.status !== "OK" || order.authority !== data.authority) {
      await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
      return { ok: false as const, error: "پرداخت توسط کاربر لغو شد یا ناموفق بود" };
    }
    const zp = zarinpalBase();
    const res = await fetch(`${zp.api}/pg/v4/payment/verify.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ merchant_id: zp.merchant, amount: Number(order.total), currency: "IRT", authority: data.authority }),
    });
    const json = (await res.json().catch(() => null)) as { data?: { code?: number; ref_id?: number } } | null;
    const code = json?.data?.code;
    if (code === 100 || code === 101) {
      const refId = String(json?.data?.ref_id ?? "");
      await supabaseAdmin.from("orders").update({ status: "paid", ref_id: refId }).eq("id", order.id);
      const { data: items } = await supabaseAdmin.from("order_items").select("product_id, quantity").eq("order_id", order.id);
      for (const it of items ?? []) {
        if (!it.product_id) continue;
        const { data: p } = await supabaseAdmin.from("products").select("stock").eq("id", it.product_id).single();
        if (p) await supabaseAdmin.from("products").update({ stock: Math.max(0, p.stock - it.quantity) }).eq("id", it.product_id);
      }
      return { ok: true as const, refId };
    }
    console.error("zarinpal verify failed", json);
    await supabaseAdmin.from("orders").update({ status: "failed" }).eq("id", order.id);
    return { ok: false as const, error: "تایید پرداخت ناموفق بود" };
  });
