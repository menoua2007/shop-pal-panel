import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { toman } from "@/lib/format";
import { checkCoupon, createOrder } from "@/lib/shop.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/checkout")({
  head: () => ({
    meta: [
      { title: "تکمیل خرید | موبایل پارس" },
      { name: "description", content: "ثبت آدرس و پرداخت سفارش." },
      { property: "og:title", content: "تکمیل خرید | موبایل پارس" },
      { property: "og:description", content: "پرداخت امن سفارش" },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { user } = Route.useRouteContext();
  const { items, subtotal } = useCart();
  const [form, setForm] = useState({ full_name: "", phone: "", address: "" });
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const check = useServerFn(checkCoupon);
  const create = useServerFn(createOrder);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({ full_name: data.full_name ?? "", phone: data.phone ?? "", address: data.address ?? "" });
    });
  }, [user.id]);

  if (!items.length)
    return <div className="py-20 text-center">سبد خرید خالی است. <Link to="/" className="text-primary">بازگشت</Link></div>;

  const discount = coupon?.discount ?? 0;
  const total = subtotal - discount;

  const applyCoupon = async () => {
    const r = await check({ data: { code, subtotal } });
    if (r.ok && r.code) {
      setCoupon({ code: r.code, discount: r.discount });
      toast.success("کد تخفیف اعمال شد");
    } else toast.error(r.ok ? "کد نامعتبر" : r.error);
  };

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^09\d{9}$/.test(form.phone)) { toast.error("شماره موبایل معتبر نیست (مثال: 09121234567)"); return; }
    setBusy(true);
    try {
      const r = await create({
        data: { items: items.map((i) => ({ id: i.id, qty: i.qty })), coupon: coupon?.code, ...form, origin: window.location.origin },
      });
      if (!r.ok) {
        toast.error(r.error);
        setBusy(false);
        return;
      }
      window.location.href = r.url;
    } catch {
      toast.error("خطا در ثبت سفارش");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={pay} className="mx-auto grid max-w-6xl gap-4 px-4 py-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4 rounded-xl bg-card p-5 shadow-card">
        <h1 className="text-lg font-bold">اطلاعات ارسال</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>نام گیرنده</Label><Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>شماره موبایل</Label><Input required dir="ltr" placeholder="09121234567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        </div>
        <div className="space-y-1.5"><Label>آدرس کامل پستی</Label><Textarea required minLength={10} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      </div>
      <aside className="h-fit space-y-3 rounded-xl bg-card p-4 shadow-card">
        <div className="flex gap-2">
          <Input placeholder="کد تخفیف" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button type="button" variant="outline" onClick={applyCoupon} disabled={!code}>اعمال</Button>
        </div>
        <div className="flex justify-between text-sm"><span>قیمت کالاها</span><span>{toman(subtotal)}</span></div>
        {discount > 0 && <div className="flex justify-between text-sm text-primary"><span>تخفیف ({coupon?.code})</span><span>{toman(discount)}-</span></div>}
        <div className="flex justify-between border-t pt-3 font-bold"><span>مبلغ قابل پرداخت</span><span>{toman(total)}</span></div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? "در حال انتقال..." : "پرداخت با زرین‌پال"}</Button>
      </aside>
    </form>
  );
}
