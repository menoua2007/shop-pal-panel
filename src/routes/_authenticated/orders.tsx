import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { statusLabel, toman } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "سفارش‌های من | موبایل پارس" },
      { name: "description", content: "پیگیری سفارش‌های شما در موبایل پارس." },
      { property: "og:title", content: "سفارش‌های من | موبایل پارس" },
      { property: "og:description", content: "پیگیری سفارش‌ها" },
    ],
  }),
  component: Orders,
});

function Orders() {
  const { user } = Route.useRouteContext();
  const { data } = useQuery({
    queryKey: ["my-orders", user.id],
    queryFn: async () =>
      (await supabase.from("orders").select("*, order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false })).data ?? [],
  });
  return (
    <div className="mx-auto max-w-4xl space-y-3 px-4 py-6">
      <h1 className="text-xl font-bold">سفارش‌های من</h1>
      {data?.length === 0 && <p className="py-10 text-center text-muted-foreground">هنوز سفارشی ثبت نکرده‌اید.</p>}
      {data?.map((o) => (
        <div key={o.id} className="rounded-xl bg-card p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-bold">{statusLabel[o.status]}</span>
            <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fa-IR")}</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {o.order_items.map((i) => <li key={i.id}>{i.name} × {i.quantity.toLocaleString("fa-IR")}</li>)}
          </ul>
          <div className="mt-3 flex justify-between border-t pt-3 text-sm">
            <span>{o.ref_id ? <>کد پیگیری: <span dir="ltr">{o.ref_id}</span></> : null}</span>
            <b>{toman(Number(o.total))}</b>
          </div>
        </div>
      ))}
    </div>
  );
}
