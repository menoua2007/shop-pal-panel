import { Link } from "@tanstack/react-router";
import { finalPrice, faNum } from "@/lib/format";
import type { Tables } from "@/integrations/supabase/types";

export function ProductCard({ p }: { p: Tables<"products"> }) {
  const fp = finalPrice(Number(p.price), p.discount_percent);
  return (
    <Link
      to="/product/$id"
      params={{ id: p.id }}
      className="group flex flex-col rounded-xl bg-card p-3 shadow-card transition hover:-translate-y-0.5"
    >
      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
        {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" className="size-full object-cover transition group-hover:scale-105" />}
      </div>
      <h3 className="mt-3 line-clamp-2 min-h-10 text-sm leading-5">{p.name}</h3>
      <div className="mt-auto pt-3">
        {p.stock <= 0 ? (
          <span className="text-sm text-muted-foreground">ناموجود</span>
        ) : (
          <div className="flex items-end justify-between gap-2">
            {p.discount_percent > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                {faNum(p.discount_percent)}٪
              </span>
            ) : <span />}
            <div className="text-left">
              <div className="font-bold">{faNum(fp)} <span className="text-xs font-normal">تومان</span></div>
              {p.discount_percent > 0 && (
                <div className="text-xs text-muted-foreground line-through">{faNum(Number(p.price))}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
