import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Smartphone, Laptop, Tablet, Headphones, Watch, Cable, Truck, ShieldCheck, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/shop/ProductCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "موبایل پارس | خرید آنلاین موبایل و کالای دیجیتال" },
      { name: "description", content: "خرید موبایل، لپ‌تاپ، تبلت و هدفون با بهترین قیمت و پرداخت امن زرین‌پال." },
      { property: "og:title", content: "موبایل پارس | فروشگاه کالای دیجیتال" },
      { property: "og:description", content: "خرید آنلاین کالای دیجیتال با تخفیف‌های ویژه." },
    ],
  }),
  component: Index,
});

const icons: Record<string, typeof Smartphone> = { smartphone: Smartphone, laptop: Laptop, tablet: Tablet, headphones: Headphones, watch: Watch, cable: Cable };

function Index() {
  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort")).data ?? [],
  });
  const { data: products } = useQuery({
    queryKey: ["products", "home"],
    queryFn: async () => (await supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false })).data ?? [],
  });
  const deals = products?.filter((p) => p.discount_percent > 0).sort((a, b) => b.discount_percent - a.discount_percent) ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      <section className="relative overflow-hidden rounded-2xl bg-promo p-8 text-primary-foreground sm:p-12">
        <div className="max-w-lg">
          <p className="text-sm opacity-90">جشنواره پاییزه</p>
          <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">تا ۲۰٪ تخفیف روی کالای دیجیتال</h1>
          <p className="mt-3 opacity-90">با کد <b>WELCOME10</b> روی اولین خریدت ۱۰٪ تخفیف بیشتر بگیر.</p>
          <Link to="/search" search={{ q: "" }} className="mt-6 inline-block rounded-lg bg-card px-5 py-2.5 font-bold text-primary">
            مشاهده محصولات
          </Link>
        </div>
        <Smartphone className="absolute -bottom-6 left-6 size-48 opacity-15 sm:size-64" />
      </section>

      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {cats?.map((c) => {
          const Icon = icons[c.icon ?? ""] ?? Smartphone;
          return (
            <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }} className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 shadow-card hover:text-primary">
              <span className="grid size-12 place-items-center rounded-full bg-accent text-accent-foreground"><Icon className="size-6" /></span>
              <span className="text-xs font-medium sm:text-sm">{c.name}</span>
            </Link>
          );
        })}
      </section>

      {deals.length > 0 && (
        <section className="rounded-2xl bg-primary p-4 sm:p-5">
          <h2 className="mb-4 text-xl font-black text-primary-foreground">پیشنهاد شگفت‌انگیز</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {deals.map((p) => (
              <div key={p.id} className="w-44 shrink-0 sm:w-52"><ProductCard p={p} /></div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold">جدیدترین محصولات</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {products?.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { i: Truck, t: "ارسال سریع به سراسر ایران" },
          { i: ShieldCheck, t: "ضمانت اصالت کالا" },
          { i: CreditCard, t: "پرداخت امن با زرین‌پال" },
        ].map(({ i: I, t }) => (
          <div key={t} className="flex items-center gap-3 rounded-xl bg-card p-4 shadow-card">
            <I className="size-6 text-primary" /> <span className="text-sm font-medium">{t}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
