import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { faNum, statusLabel, toman } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "پنل مدیریت | موبایل پارس" },
      { name: "description", content: "مدیریت محصولات، سفارش‌ها و کدهای تخفیف." },
      { property: "og:title", content: "پنل مدیریت | موبایل پارس" },
      { property: "og:description", content: "مدیریت فروشگاه" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { isAdmin, loading } = useAuth();
  if (loading) return <div className="py-20 text-center">...</div>;
  if (!isAdmin)
    return <div className="py-20 text-center">شما به این بخش دسترسی ندارید. <Link to="/" className="text-primary">بازگشت</Link></div>;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-black">پنل مدیریت</h1>
      <Tabs defaultValue="dash" dir="rtl">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="dash">داشبورد</TabsTrigger>
          <TabsTrigger value="products">محصولات</TabsTrigger>
          <TabsTrigger value="orders">سفارش‌ها</TabsTrigger>
          <TabsTrigger value="coupons">کد تخفیف</TabsTrigger>
          <TabsTrigger value="cats">دسته‌بندی‌ها</TabsTrigger>
        </TabsList>
        <TabsContent value="dash"><Dashboard /></TabsContent>
        <TabsContent value="products"><Products /></TabsContent>
        <TabsContent value="orders"><Orders /></TabsContent>
        <TabsContent value="coupons"><Coupons /></TabsContent>
        <TabsContent value="cats"><Categories /></TabsContent>
      </Tabs>
    </div>
  );
}

const box = "rounded-xl bg-card p-4 shadow-card";

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [{ data: orders }, { count: products }] = await Promise.all([
        supabase.from("orders").select("total,status"),
        supabase.from("products").select("*", { count: "exact", head: true }),
      ]);
      const paid = (orders ?? []).filter((o) => !["pending", "failed", "cancelled"].includes(o.status));
      return { revenue: paid.reduce((s, o) => s + Number(o.total), 0), paid: paid.length, all: orders?.length ?? 0, products: products ?? 0 };
    },
  });
  const cards = [
    ["فروش کل", data ? toman(data.revenue) : "-"],
    ["سفارش‌های پرداخت‌شده", data ? faNum(data.paid) : "-"],
    ["کل سفارش‌ها", data ? faNum(data.all) : "-"],
    ["تعداد محصولات", data ? faNum(data.products) : "-"],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(([t, v]) => (
        <div key={t} className={box}><div className="text-sm text-muted-foreground">{t}</div><div className="mt-2 text-xl font-black">{v}</div></div>
      ))}
    </div>
  );
}

type Product = Tables<"products">;
const emptyP = { name: "", brand: "", description: "", price: 0, discount_percent: 0, stock: 0, image_url: "", category_id: "", is_active: true, specs: "" };

function Products() {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<(typeof emptyP & { id?: string }) | null>(null);
  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort")).data ?? [] });
  const { data } = useQuery({ queryKey: ["admin-products"], queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false })).data ?? [] });

  const open = (p?: Product) =>
    setEdit(
      p
        ? {
            id: p.id, name: p.name, brand: p.brand ?? "", description: p.description ?? "", price: Number(p.price), discount_percent: p.discount_percent,
            stock: p.stock, image_url: p.image_url ?? "", category_id: p.category_id ?? "", is_active: p.is_active,
            specs: Object.entries((p.specs ?? {}) as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join("\n"),
          }
        : { ...emptyP },
    );

  const save = async () => {
    if (!edit) return;
    const specs: Record<string, string> = {};
    edit.specs.split("\n").forEach((l) => {
      const [k, ...v] = l.split(":");
      if (k?.trim() && v.length) specs[k.trim()] = v.join(":").trim();
    });
    const row = {
      name: edit.name, brand: edit.brand || null, description: edit.description || null, price: edit.price,
      discount_percent: edit.discount_percent, stock: edit.stock, image_url: edit.image_url || null,
      category_id: edit.category_id || null, is_active: edit.is_active, specs,
    };
    const { error } = edit.id ? await supabase.from("products").update(row).eq("id", edit.id) : await supabase.from("products").insert(row);
    if (error) { toast.error("ذخیره ناموفق بود"); return; }
    toast.success("ذخیره شد");
    setEdit(null);
    qc.invalidateQueries();
  };
  const del = async (id: string) => {
    if (!confirm("حذف شود؟")) return;
    await supabase.from("products").delete().eq("id", id);
    qc.invalidateQueries();
  };

  return (
    <div className={box}>
      <div className="mb-3 flex justify-between"><b>محصولات</b><Button size="sm" onClick={() => open()}><Plus className="size-4" /> محصول جدید</Button></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground"><tr className="border-b text-right"><th className="p-2">محصول</th><th>قیمت</th><th>تخفیف</th><th>موجودی</th><th>وضعیت</th><th /></tr></thead>
          <tbody>
            {data?.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="flex items-center gap-2 p-2"><img src={p.image_url ?? ""} alt="" className="size-10 rounded bg-muted object-cover" /><span className="line-clamp-1 max-w-60">{p.name}</span></td>
                <td>{faNum(Number(p.price))}</td><td>{faNum(p.discount_percent)}٪</td><td>{faNum(p.stock)}</td>
                <td>{p.is_active ? "فعال" : "غیرفعال"}</td>
                <td className="whitespace-nowrap">
                  <Button size="icon" variant="ghost" onClick={() => open(p)}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del(p.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle>{edit?.id ? "ویرایش محصول" : "محصول جدید"}</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid gap-3">
              <div className="space-y-1"><Label>نام</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>برند</Label><Input value={edit.brand} onChange={(e) => setEdit({ ...edit, brand: e.target.value })} /></div>
                <div className="space-y-1"><Label>دسته</Label>
                  <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={edit.category_id} onChange={(e) => setEdit({ ...edit, category_id: e.target.value })}>
                    <option value="">-</option>{cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1"><Label>قیمت (تومان)</Label><Input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: +e.target.value })} /></div>
                <div className="space-y-1"><Label>تخفیف ٪</Label><Input type="number" min={0} max={99} value={edit.discount_percent} onChange={(e) => setEdit({ ...edit, discount_percent: +e.target.value })} /></div>
                <div className="space-y-1"><Label>موجودی</Label><Input type="number" value={edit.stock} onChange={(e) => setEdit({ ...edit, stock: +e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>آدرس تصویر</Label><Input dir="ltr" value={edit.image_url} onChange={(e) => setEdit({ ...edit, image_url: e.target.value })} /></div>
              <div className="space-y-1"><Label>توضیحات</Label><Textarea value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
              <div className="space-y-1"><Label>مشخصات (هر خط: عنوان: مقدار)</Label><Textarea rows={4} value={edit.specs} onChange={(e) => setEdit({ ...edit, specs: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={edit.is_active} onCheckedChange={(v) => setEdit({ ...edit, is_active: v })} /> نمایش در فروشگاه</label>
              <Button onClick={save} disabled={!edit.name || edit.price <= 0}>ذخیره</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Orders() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-orders"], queryFn: async () => (await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })).data ?? [] });
  const setStatus = async (id: string, status: Tables<"orders">["status"]) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error("خطا"); else { toast.success("به‌روز شد"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); }
  };
  return (
    <div className="space-y-3">
      {data?.length === 0 && <p className="text-muted-foreground">سفارشی ثبت نشده.</p>}
      {data?.map((o) => (
        <div key={o.id} className={box}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div><b>{o.full_name}</b> · <span dir="ltr">{o.phone}</span> · {new Date(o.created_at).toLocaleString("fa-IR")}</div>
            <select className="h-9 rounded-md border bg-background px-2" value={o.status} onChange={(e) => setStatus(o.id, e.target.value as Tables<"orders">["status"])}>
              {Object.entries(statusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{o.address}</p>
          <ul className="mt-2 text-sm">{o.order_items.map((i) => <li key={i.id}>{i.name} × {faNum(i.quantity)} — {toman(Number(i.unit_price))}</li>)}</ul>
          <div className="mt-2 flex justify-between border-t pt-2 text-sm">
            <span>{o.coupon_code && `کد: ${o.coupon_code}`} {o.ref_id && <>· پیگیری: <span dir="ltr">{o.ref_id}</span></>}</span>
            <b>{toman(Number(o.total))}</b>
          </div>
        </div>
      ))}
    </div>
  );
}

function Coupons() {
  const qc = useQueryClient();
  const [f, setF] = useState({ code: "", percent: 10, max_discount: 0, expires_at: "" });
  const { data } = useQuery({ queryKey: ["admin-coupons"], queryFn: async () => (await supabase.from("coupons").select("*").order("created_at", { ascending: false })).data ?? [] });
  const add = async () => {
    const { error } = await supabase.from("coupons").insert({
      code: f.code.trim().toUpperCase(), percent: f.percent, max_discount: f.max_discount || null, expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null,
    });
    if (error) { toast.error("ثبت ناموفق (شاید کد تکراری است)"); return; }
    setF({ code: "", percent: 10, max_discount: 0, expires_at: "" });
    qc.invalidateQueries({ queryKey: ["admin-coupons"] });
  };
  const toggle = async (id: string, v: boolean) => { await supabase.from("coupons").update({ is_active: v }).eq("id", id); qc.invalidateQueries({ queryKey: ["admin-coupons"] }); };
  const del = async (id: string) => { await supabase.from("coupons").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["admin-coupons"] }); };
  return (
    <div className={box}>
      <div className="grid items-end gap-3 sm:grid-cols-5">
        <div className="space-y-1"><Label>کد</Label><Input dir="ltr" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></div>
        <div className="space-y-1"><Label>درصد</Label><Input type="number" min={1} max={100} value={f.percent} onChange={(e) => setF({ ...f, percent: +e.target.value })} /></div>
        <div className="space-y-1"><Label>سقف (تومان)</Label><Input type="number" value={f.max_discount} onChange={(e) => setF({ ...f, max_discount: +e.target.value })} /></div>
        <div className="space-y-1"><Label>انقضا</Label><Input type="date" value={f.expires_at} onChange={(e) => setF({ ...f, expires_at: e.target.value })} /></div>
        <Button onClick={add} disabled={!f.code}>افزودن</Button>
      </div>
      <div className="mt-4 divide-y text-sm">
        {data?.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2">
            <div><b dir="ltr">{c.code}</b> · {faNum(c.percent)}٪ {c.max_discount ? `· سقف ${toman(Number(c.max_discount))}` : ""} {c.expires_at ? `· تا ${new Date(c.expires_at).toLocaleDateString("fa-IR")}` : ""}</div>
            <div className="flex items-center gap-2"><Switch checked={c.is_active} onCheckedChange={(v) => toggle(c.id, v)} /><Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="size-4 text-destructive" /></Button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Categories() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const { data } = useQuery({ queryKey: ["categories"], queryFn: async () => (await supabase.from("categories").select("*").order("sort")).data ?? [] });
  const add = async () => {
    const { error } = await supabase.from("categories").insert({ name, slug: slug.trim().toLowerCase(), sort: (data?.length ?? 0) + 1 });
    if (error) { toast.error("ثبت ناموفق"); return; }
    setName(""); setSlug("");
    qc.invalidateQueries({ queryKey: ["categories"] });
  };
  const del = async (id: string) => { if (!confirm("حذف شود؟")) return; await supabase.from("categories").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["categories"] }); };
  return (
    <div className={box}>
      <div className="grid items-end gap-3 sm:grid-cols-3">
        <div className="space-y-1"><Label>نام</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-1"><Label>نامک انگلیسی</Label><Input dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
        <Button onClick={add} disabled={!name || !slug}>افزودن</Button>
      </div>
      <div className="mt-4 divide-y text-sm">
        {data?.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2"><span>{c.name} <span className="text-muted-foreground" dir="ltr">/{c.slug}</span></span>
            <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="size-4 text-destructive" /></Button></div>
        ))}
      </div>
    </div>
  );
}
