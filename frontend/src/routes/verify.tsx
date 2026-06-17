import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MailCheck, ArrowLeft } from "lucide-react";
import { getCurrentUser, resendVerification, verifyEmail, signOut } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/verify")({
  validateSearch: (s: Record<string, unknown>) => ({
    email: typeof s.email === "string" ? s.email : "",
    redirect: typeof s.redirect === "string" ? s.redirect : "/",
  }),
  head: () => ({ meta: [{ title: "Verify email — FIM" }] }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const { email, redirect } = useSearch({ from: "/verify" });
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) navigate({ to: "/auth", search: { redirect, mode: "signin" } });
    else if (u.verified) navigate({ to: redirect || "/" });
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const setDigit = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    text.split("").forEach((c, i) => (next[i] = c));
    setDigits(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setBusy(true);
    try {
      const user = await verifyEmail(email, code);
      toast.success(`Email verified · Welcome, ${user.name.split(" ")[0]} 🎉`);
      navigate({ to: redirect || "/" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await resendVerification(email);
      setCooldown(30);
      toast.success("Verification code resent");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const useDifferent = () => {
    signOut();
    navigate({ to: "/auth", search: { redirect, mode: "signin" } });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 py-8 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <MailCheck className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-2xl mt-4">Verify your email</h1>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>
          </p>
        </div>

        <form onSubmit={submit} className="bg-surface border border-border rounded-3xl p-5 shadow-sm">
          <div className="flex justify-between gap-2" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
                }}
                inputMode="numeric"
                maxLength={1}
                className={cn(
                  "w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-2xl border border-border bg-background",
                  "focus:outline-none focus:ring-2 focus:ring-primary"
                )}
              />
            ))}
          </div>

          <Button type="submit" disabled={busy} className="w-full mt-5">
            {busy ? "Verifying…" : "Verify email"}
          </Button>

          <div className="flex items-center justify-between mt-4 text-xs">
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0}
              className="font-semibold text-primary tap-scale disabled:opacity-40"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              onClick={useDifferent}
              className="font-semibold text-muted-foreground flex items-center gap-1 tap-scale"
            >
              <ArrowLeft className="w-3 h-3" /> Use a different email
            </button>
          </div>
        </form>


      </div>
    </div>
  );
}
