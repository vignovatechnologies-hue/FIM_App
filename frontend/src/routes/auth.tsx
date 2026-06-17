import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp, verifyEmail, getCurrentUser } from "@/lib/auth";
import { Wallet, ShieldCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
    mode: s.mode === "signup" ? "signup" : "signin",
  }),
  head: () => ({ meta: [{ title: "Sign in — FIM" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, mode: initialMode } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">(initialMode as "signin" | "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (u && u.verified) navigate({ to: redirect || "/" });
    else if (u && !u.verified) navigate({ to: "/verify", search: { email: u.email, redirect } });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const user = await signIn(email, password);
        if (!user.verified) {
          toast.message("Please verify your email to continue.");
          navigate({ to: "/verify", search: { email: user.email, redirect } });
          return;
        }
        toast.success(`Welcome back, ${user.name.split(" ")[0]} 👋`);
        navigate({ to: redirect || "/" });
      } else {
        const user = await signUp(name, email, password);
        toast.success("Account created ✨ Check your inbox for the code.");
        navigate({ to: "/verify", search: { email: user.email, redirect } });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const demo = async () => {
    setEmail("demo@fim.in");
    setPassword("demo1234");
    setBusy(true);
    try {
      // For demo, we just call signin directly since seed script pre-populated demo@fim.in
      const u = await signIn("demo@fim.in", "demo1234");
      toast.success(`Welcome back, ${u.name.split(" ")[0]} 👋`);
      navigate({ to: redirect || "/" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 py-8 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Wallet className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-2xl mt-4">FIM</h1>
          <p className="text-xs text-muted-foreground mt-1">Financial Intelligence Manager</p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-5 shadow-sm">
          <div className="flex bg-muted rounded-2xl p-1 mb-5">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-xl tap-scale",
                  mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <Label className="text-xs">Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Arjun Reddy" className="mt-1" />
              </div>
            )}
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="mt-1"
                autoComplete="email"
              />
            </div>
            <div>
              <Label className="text-xs">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </div>
            {mode === "signin" && (
              <div className="flex justify-end">
                <Link
                  to="/reset-password"
                  search={{ email, step: "request" }}
                  className="text-xs font-semibold text-primary tap-scale"
                >
                  Forgot password?
                </Link>
              </div>
            )}
            <Button type="submit" disabled={busy} className="w-full mt-2">
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <button
            onClick={demo}
            className="w-full mt-3 text-xs font-semibold text-primary tap-scale"
          >
            <Sparkles className="inline w-3 h-3 mr-1" /> Continue with demo account
          </button>
        </div>

        <p className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mt-6">
          <ShieldCheck className="w-3 h-3" /> Secured with 256-bit encryption · Made in India 🇮🇳
        </p>
      </div>
    </div>
  );
}
