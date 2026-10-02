import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart";
import { faNum, toman } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "سبد خرید | موبایل پارس" },
      { name: "description", content: "مشاهده و ویرایش سبد خرید شما." },
      { property: "og:title", content: "سبد خرید | موبایل پارس" },
      { property: "og:description", content: "سبد خرید موبایل پارس" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal, count } = useCart();
  if (!items.length)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-20 text-center">
        <ShoppingCart className="size-16 text-muted-foreground" />
        <h1 className="text-lg font-bold">سبد خرید شما خالی است!</h1>
        <Button asChild><Link to="/">رفتن به فروشگاه</Link></Button>
      </div>
    );
  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {items.map((i) => (
          <div key={i.id} className="flex gap-3 rounded-xl bg-card p-3 shadow-card">
            <img src={i.image ?? ""} alt={i.name} className="size-24 rounded-lg bg-muted object-cover" />
            <div className="flex flex-1 flex-col">
              <Link to="/product/$id" params={{ id: i.id }} className="line-clamp-2 text-sm">{i.name}</Link>
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-3 rounded-lg border px-2 py-1 text-primary">
                  <button onClick={() => setQty(i.id, i.qty + 1)} aria-label="افزایش"><Plus className="size-4" /></button>
                  <span className="w-5 text-center font-bold">{faNum(i.qty)}</span>
                  <button onClick={() => (i.qty === 1 ? remove(i.id) : setQty(i.id, i.qty - 1))} aria-label="کاهش">
                    {i.qty === 1 ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                  </button>
                </div>
                <b>{toman(i.price * i.qty)}</b>
              </div>
            </div>
          </div>
        ))}
      </div>
      <aside className="h-fit space-y-3 rounded-xl bg-card p-4 shadow-card">
        <div className="flex justify-between text-sm"><span>قیمت کالاها ({faNum(count)})</span><span>{toman(subtotal)}</span></div>
        <div className="flex justify-between font-bold"><span>جمع سبد خرید</span><span>{toman(subtotal)}</span></div>
        <Button asChild size="lg" className="w-full"><Link to="/checkout">ادامه و ثبت سفارش</Link></Button>
      </aside>
    </div>
  );
}
