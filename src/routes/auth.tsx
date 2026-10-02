import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "ورود و ثبت‌نام | موبایل پارس" },
      { name: "description", content: "ورود یا ساخت حساب کاربری در موبایل پارس." },
      { property: "og:title", content: "ورود و ثبت‌نام | موبایل پارس" },
      { property: "og:description", content: "حساب کاربری موبایل پارس" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("ایمیل یا رمز عبور اشتباه است");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
      });
      if (error) toast.error(error.message);
      else toast.success("لینک تایید به ایمیل شما ارسال شد. لطفاً ایمیل خود را بررسی کنید.");
    }
    setBusy(false);
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error("ورود با گوگل ناموفق بود");
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <div className="rounded-2xl bg-card p-6 shadow-card">
        <h1 className="text-center text-2xl font-black text-primary">موبایل پارس</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">{mode === "in" ? "ورود به حساب کاربری" : "ساخت حساب کاربری"}</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "up" && (
            <div className="space-y-1.5"><Label>نام و نام خانوادگی</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          )}
          <div className="space-y-1.5"><Label>ایمیل</Label><Input type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="space-y-1.5"><Label>رمز عبور</Label><Input type="password" dir="ltr" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "ورود" : "ثبت‌نام"}</Button>
        </form>
        <Button variant="outline" className="mt-3 w-full" onClick={google}>ادامه با گوگل</Button>
        <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 w-full text-sm text-primary">
          {mode === "in" ? "حساب ندارید؟ ثبت‌نام کنید" : "حساب دارید؟ وارد شوید"}
        </button>
      </div>
    </div>
  );
}
