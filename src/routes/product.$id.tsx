import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Star, ShieldCheck, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { finalPrice, faNum } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "مشخصات و خرید محصول | موبایل پارس" },
      { name: "description", content: "مشخصات فنی، قیمت و نظرات کاربران درباره این محصول." },
      { property: "og:title", content: "خرید محصول | موبایل پارس" },
      { property: "og:description", content: "مشخصات، قیمت و نظرات کاربران" },
    ],
  }),
  component: ProductPage,
});

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          onClick={() => onChange?.(n)}
          className={`size-4 ${onChange ? "cursor-pointer" : ""} ${n <= value ? "fill-warning text-warning" : "text-border"}`}
        />
      ))}
    </div>
  );
}

function ProductPage() {
  const { id } = Route.useParams();
  const { add } = useCart();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: p, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => (await supabase.from("products").select("*, categories(name, slug)").eq("id", id).maybeSingle()).data,
  });
  const { data: reviews } = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => (await supabase.from("reviews").select("*").eq("product_id", id).order("created_at", { ascending: false })).data ?? [],
  });

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">در حال بارگذاری...</div>;
  if (!p) return <div className="py-20 text-center">محصول پیدا نشد.</div>;

  const fp = finalPrice(Number(p.price), p.discount_percent);
  const avg = reviews?.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const specs = Object.entries((p.specs ?? {}) as Record<string, string>);

  const submitReview = async () => {
    if (!user) return;
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const { error } = await supabase.from("reviews").insert({
      product_id: id,
      user_id: user.id,
      rating,
      comment: comment.trim().slice(0, 1000),
      author_name: prof?.full_name || user.email?.split("@")[0] || "کاربر",
    });
    if (error) { toast.error("ثبت نظر ناموفق بود"); return; }
    setComment("");
    toast.success("نظر شما ثبت شد");
    qc.invalidateQueries({ queryKey: ["reviews", id] });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 rounded-2xl bg-card p-4 shadow-card md:grid-cols-[1fr_1.3fr_0.9fr] md:p-6">
        <div className="aspect-square overflow-hidden rounded-xl bg-muted">
          {p.image_url && <img src={p.image_url} alt={p.name} className="size-full object-cover" />}
        </div>
        <div>
          {p.categories && (
            <Link to="/category/$slug" params={{ slug: p.categories.slug }} className="text-sm text-primary">{p.categories.name}</Link>
          )}
          <h1 className="mt-1 text-xl font-bold leading-8">{p.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Stars value={Math.round(avg)} /> {reviews?.length ? `${faNum(Number(avg.toFixed(1)))} از ${faNum(reviews.length)} نظر` : "بدون نظر"}
          </div>
          {p.brand && <p className="mt-3 text-sm">برند: <b>{p.brand}</b></p>}
          {specs.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 font-bold">ویژگی‌ها</h3>
              <ul className="space-y-1.5 text-sm">
                {specs.map(([k, v]) => <li key={k}><span className="text-muted-foreground">{k}:</span> {v}</li>)}
              </ul>
            </div>
          )}
        </div>
        <div className="h-fit space-y-4 rounded-xl border bg-muted/50 p-4">
          <div className="flex items-center gap-2 text-sm"><ShieldCheck className="size-4 text-success" /> گارانتی اصالت و سلامت</div>
          <div className="flex items-center gap-2 text-sm"><Truck className="size-4 text-primary" /> ارسال از انبار موبایل پارس</div>
          <div className="border-t pt-4 text-left">
            {p.discount_percent > 0 && (
              <div className="flex items-center justify-end gap-2 text-sm">
                <span className="text-muted-foreground line-through">{faNum(Number(p.price))}</span>
                <span className="rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">{faNum(p.discount_percent)}٪</span>
              </div>
            )}
            <div className="text-2xl font-black">{faNum(fp)} <span className="text-sm font-normal">تومان</span></div>
          </div>
          {p.stock > 0 ? (
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                add({ id: p.id, name: p.name, price: fp, image: p.image_url, stock: p.stock });
                toast.success("به سبد خرید اضافه شد");
              }}
            >
              افزودن به سبد خرید
            </Button>
          ) : (
            <Button className="w-full" size="lg" disabled>ناموجود</Button>
          )}
          {p.stock > 0 && p.stock <= 5 && <p className="text-center text-xs text-destructive">تنها {faNum(p.stock)} عدد در انبار باقی مانده</p>}
        </div>
      </div>

      {p.description && (
        <section className="mt-6 rounded-2xl bg-card p-5 shadow-card">
          <h2 className="mb-2 font-bold">معرفی محصول</h2>
          <p className="leading-7 text-muted-foreground">{p.description}</p>
        </section>
      )}

      <section className="mt-6 rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-4 font-bold">نظرات کاربران</h2>
        {user ? (
          <div className="mb-6 space-y-3 rounded-xl border p-4">
            <div className="flex items-center gap-2 text-sm">امتیاز شما: <Stars value={rating} onChange={setRating} /></div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="نظر خود را بنویسید..." maxLength={1000} />
            <Button onClick={submitReview} disabled={!comment.trim()}>ثبت نظر</Button>
          </div>
        ) : (
          <p className="mb-6 text-sm">برای ثبت نظر <Link to="/auth" className="text-primary">وارد شوید</Link>.</p>
        )}
        <div className="divide-y">
          {reviews?.map((r) => (
            <div key={r.id} className="py-3">
              <div className="flex items-center gap-2 text-sm"><b>{r.author_name}</b><Stars value={r.rating} /></div>
              {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
          {reviews?.length === 0 && <p className="text-sm text-muted-foreground">هنوز نظری ثبت نشده است.</p>}
        </div>
      </section>
    </div>
  );
}
