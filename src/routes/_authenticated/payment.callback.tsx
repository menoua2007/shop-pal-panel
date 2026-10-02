import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { verifyPayment } from "@/lib/shop.functions";
import { useCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/payment/callback")({
  validateSearch: z.object({ order: z.string().catch(""), Authority: z.string().catch(""), Status: z.string().catch("") }),
  head: () => ({
    meta: [
      { title: "نتیجه پرداخت | موبایل پارس" },
      { name: "description", content: "نتیجه پرداخت سفارش شما." },
      { property: "og:title", content: "نتیجه پرداخت | موبایل پارس" },
      { property: "og:description", content: "وضعیت پرداخت" },
    ],
  }),
  component: Callback,
});

function Callback() {
  const s = Route.useSearch();
  const verify = useServerFn(verifyPayment);
  const { clear } = useCart();
  const [res, setRes] = useState<{ ok: boolean; refId?: string | null; error?: string | undefined } | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    verify({ data: { order: s.order, authority: s.Authority, status: s.Status } })
      .then((r) => {
        setRes(r);
        if (r.ok) clear();
      })
      .catch(() => setRes({ ok: false, error: "خطا در بررسی پرداخت" }));
  }, [s, verify, clear]);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-8 text-center shadow-card">
        {!res ? (
          <><Loader2 className="size-12 animate-spin text-primary" /><p>در حال بررسی پرداخت...</p></>
        ) : res.ok ? (
          <>
            <CheckCircle2 className="size-14 text-success" />
            <h1 className="text-xl font-bold">پرداخت با موفقیت انجام شد</h1>
            {res.refId && <p className="text-sm text-muted-foreground">کد پیگیری: <span dir="ltr" className="font-bold">{res.refId}</span></p>}
            <Button asChild><Link to="/orders">مشاهده سفارش‌ها</Link></Button>
          </>
        ) : (
          <>
            <XCircle className="size-14 text-destructive" />
            <h1 className="text-xl font-bold">پرداخت ناموفق</h1>
            <p className="text-sm text-muted-foreground">{res.error}</p>
            <Button asChild variant="outline"><Link to="/cart">بازگشت به سبد خرید</Link></Button>
          </>
        )}
      </div>
    </div>
  );
}
