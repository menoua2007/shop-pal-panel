import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/shop/ProductCard";

export const Route = createFileRoute("/category/$slug")({
  head: () => ({
    meta: [
      { title: "دسته‌بندی محصولات | موبایل پارس" },
      { name: "description", content: "مشاهده و خرید محصولات این دسته در موبایل پارس." },
      { property: "og:title", content: "دسته‌بندی محصولات | موبایل پارس" },
      { property: "og:description", content: "خرید آنلاین کالای دیجیتال" },
    ],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const [sort, setSort] = useState("new");
  const { data } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data: cat } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
      if (!cat) return { cat: null, products: [] };
      const { data: products } = await supabase.from("products").select("*").eq("category_id", cat.id).eq("is_active", true);
      return { cat, products: products ?? [] };
    },
  });
  const list = [...(data?.products ?? [])].sort((a, b) =>
    sort === "cheap" ? a.price - b.price : sort === "expensive" ? b.price - a.price : sort === "discount" ? b.discount_percent - a.discount_percent : b.created_at.localeCompare(a.created_at),
  );
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{data?.cat?.name ?? "..."}</h1>
        <div className="flex gap-2 text-sm">
          {[["new", "جدیدترین"], ["cheap", "ارزان‌ترین"], ["expensive", "گران‌ترین"], ["discount", "بیشترین تخفیف"]].map(([k, l]) => (
            <button key={k} onClick={() => setSort(k)} className={sort === k ? "font-bold text-primary" : "text-muted-foreground"}>{l}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {data && list.length === 0 && <p className="py-20 text-center text-muted-foreground">محصولی در این دسته وجود ندارد.</p>}
    </div>
  );
}
