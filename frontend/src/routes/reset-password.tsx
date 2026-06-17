import { createFileRoute, useNavigate, useSearch, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, resetPassword } from "@/lib/auth";
import { KeyRound, Mail, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>) => ({
    email: typeof s.email === "string" ? s.email : "",
    step: s.step === "reset" ? "reset" : "request",
  }),
  head: () => ({ meta: [{ title: "Reset password — FIM" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { email: initialEmail, step: initialStep } = useSearch({ from: "/reset-password" });
  const [step, setStep] = useState<"request" | "reset">(initialStep as "request" | "reset");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const sendInstructions = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await requestPasswordReset(email);
      toast.success("Reset instructions sent to your email 📬");
      setStep("reset");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await requestPasswordReset(email);
      toast.success("Reset code resent");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email, code, password);
      toast.success("Password updated. Please sign in.");
      navigate({ to: "/auth", search: { redirect: "/", mode: "signin" } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-5 py-8 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <KeyRound className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="font-display font-bold text-2xl mt-4">
            {step === "request" ? "Forgot password?" : "Set new password"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {step === "request"
              ? "Enter your email and we'll send reset instructions."
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-3xl p-5 shadow-sm">
          {step === "request" ? (
            <form onSubmit={sendInstructions} className="space-y-3">
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="mt-1"
                  autoComplete="email"
                  required
                />
              </div>
              <Button type="submit" disabled={busy || !email} className="w-full mt-2">
                <Mail className="w-4 h-4 mr-2" />
                {busy ? "Sending…" : "Send reset instructions"}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitReset} className="space-y-3">
              <div>
                <Label className="text-xs">6-digit code</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="mt-1 text-center tracking-[0.5em] font-bold"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">New password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Confirm password</Label>
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                  autoComplete="new-password"
                  required
                />
              </div>
              <Button type="submit" disabled={busy} className="w-full mt-2">
                {busy ? "Updating…" : "Update password"}
              </Button>
              <div className="flex justify-between text-xs pt-1">
                <button type="button" onClick={resend} className="text-primary font-semibold tap-scale">
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => setStep("request")}
                  className="text-muted-foreground tap-scale"
                >
                  Use different email
                </button>
              </div>
            </form>
          )}
        </div>

        <Link
          to="/auth"
          search={{ redirect: "/", mode: "signin" }}
          className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-6 tap-scale"
        >
          <ArrowLeft className="w-3 h-3" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
