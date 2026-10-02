import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Search, User, LogOut, LayoutDashboard, Package } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { faNum } from "@/lib/format";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";

export function Header() {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data: cats } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort")).data ?? [],
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link to="/" className="shrink-0 text-xl font-black text-primary sm:text-2xl">
          موبایل پارس
        </Link>
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/search", search: { q } });
          }}
        >
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو در موبایل پارس"
            className="w-full rounded-lg bg-muted py-2.5 pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 rounded-lg border px-2.5 py-2 text-sm">
              <User className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/orders"><Package className="size-4" /> سفارش‌های من</Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/admin"><LayoutDashboard className="size-4" /> پنل مدیریت</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={signOut}><LogOut className="size-4" /> خروج</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/auth" className="hidden rounded-lg border px-3 py-2 text-sm font-medium sm:block">
            ورود | ثبت‌نام
          </Link>
        )}
        {!user && (
          <Link to="/auth" className="rounded-lg border p-2 sm:hidden" aria-label="ورود"><User className="size-5" /></Link>
        )}
        <Link to="/cart" className="relative rounded-lg p-2" aria-label="سبد خرید">
          <ShoppingCart className="size-6" />
          {count > 0 && (
            <span className="absolute -top-0.5 -left-0.5 grid size-5 place-items-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
              {faNum(count)}
            </span>
          )}
        </Link>
      </div>
      <nav className="mx-auto flex max-w-7xl gap-5 overflow-x-auto px-4 pb-2 text-sm text-muted-foreground">
        {cats?.map((c) => (
          <Link key={c.id} to="/category/$slug" params={{ slug: c.slug }} className="shrink-0 py-1 hover:text-primary" activeProps={{ className: "text-primary" }}>
            {c.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm text-muted-foreground sm:grid-cols-3">
        <div>
          <div className="text-lg font-black text-primary">موبایل پارس</div>
          <p className="mt-2">فروشگاه آنلاین کالای دیجیتال با ضمانت اصالت و ارسال سریع.</p>
        </div>
        <div className="space-y-1">
          <div className="font-bold text-foreground">خدمات مشتریان</div>
          <p>ضمانت ۷ روزه بازگشت کالا</p>
          <p>پرداخت امن با زرین‌پال</p>
        </div>
        <div className="space-y-1">
          <div className="font-bold text-foreground">ارتباط با ما</div>
          <p>پشتیبانی ۷ روز هفته</p>
        </div>
      </div>
    </footer>
  );
}
