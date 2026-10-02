import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/shop/ProductCard";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().optional().default("") }),
  head: () => ({
    meta: [
      { title: "جستجوی محصولات | موبایل پارس" },
      { name: "description", content: "جستجو در میان محصولات دیجیتال موبایل پارس." },
      { property: "og:title", content: "جستجوی محصولات | موبایل پارس" },
      { property: "og:description", content: "جستجو در کالای دیجیتال" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();
  const { data } = useQuery({
    queryKey: ["search", q],
    queryFn: async () => {
      let qb = supabase.from("products").select("*").eq("is_active", true);
      const term = q.replace(/[%,()]/g, "").trim();
      if (term) qb = qb.or(`name.ilike.%${term}%,brand.ilike.%${term}%`);
      return (await qb.order("created_at", { ascending: false })).data ?? [];
    },
  });
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-4 text-xl font-bold">{q ? `نتایج جستجو برای «${q}»` : "همه محصولات"}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {data?.map((p) => <ProductCard key={p.id} p={p} />)}
      </div>
      {data?.length === 0 && <p className="py-20 text-center text-muted-foreground">نتیجه‌ای پیدا نشد.</p>}
    </div>
  );
}
