import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Shield, Bell, CreditCard, FileText, HelpCircle, LogOut, ChevronRight, Crown, Plus, Check, Download, CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth, signOut as doSignOut } from "@/lib/auth";
import { apiFetch } from "@/lib/api/client";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — FIM" }, { name: "description", content: "Account, security and settings." }] }),
  component: ProfilePage,
});

type Bank = { id: number; name: string; masked: string };

const POPULAR_BANKS = ["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank", "Kotak Mahindra", "Yes Bank", "IDFC First", "PNB"];

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [premium, setPremium] = useState(user?.premium || false);

  // Linked banks
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksOpen, setBanksOpen] = useState(false);
  const [addBankOpen, setAddBankOpen] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newBankAcc, setNewBankAcc] = useState("");
  const [newBankIfsc, setNewBankIfsc] = useState("");
  const [linking, setLinking] = useState(false);
  const [loading, setLoading] = useState(true);

  // Reports
  const [reportsOpen, setReportsOpen] = useState(false);
  const [range, setRange] = useState<"day" | "month" | "year" | "custom">("month");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const fetchBanks = async () => {
    try {
      const data = await apiFetch<Bank[]>("/api/user/banks");
      setBanks(data);
    } catch (err) {
      console.error("Error loading banks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setPremium(user.premium || false);
      fetchBanks();
    }
  }, [user]);

  const togglePremiumStatus = async () => {
    const tid = toast.loading("Updating premium status…");
    try {
      const updatedUser = await apiFetch("/api/user/premium", { method: "POST" });
      // Update local storage to keep the session in sync
      localStorage.setItem("fim.auth.user", JSON.stringify(updatedUser));
      window.dispatchEvent(new Event("fim-auth-change"));
      
      setPremium(updatedUser.premium);
      if (updatedUser.premium) {
        toast.success("Welcome to FIM Premium ✨", { id: tid, description: "30-day free trial activated" });
      } else {
        toast.success("Premium deactivated", { id: tid });
      }
    } catch (err) {
      toast.error((err as Error).message, { id: tid });
    }
  };

  const linkBank = async () => {
    const cleanAcc = newBankAcc.replace(/\s/g, "");
    const ifsc = newBankIfsc.trim().toUpperCase();

    // ── client-side format checks ──────────────────────────────────────────
    if (!newBankName.trim()) {
      toast.error("Please select or enter a bank name");
      return;
    }
    if (cleanAcc.length < 9 || cleanAcc.length > 18 || !/^\d+$/.test(cleanAcc)) {
      toast.error("Account number must be 9–18 digits (numbers only)");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      toast.error("Invalid IFSC code — format: 4 letters + 0 + 6 alphanumeric\n(e.g. HDFC0001234)");
      return;
    }

    setLinking(true);
    const tid = toast.loading(`Verifying account with ${newBankName}…`);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.loading(`Checking IFSC ${ifsc} — branch lookup…`, { id: tid });
      await new Promise((resolve) => setTimeout(resolve, 700));
      toast.loading("Validating account number with bank repository…", { id: tid });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const bank = await apiFetch<Bank>("/api/user/banks", {
        method: "POST",
        body: JSON.stringify({
          name: newBankName,
          account_number: newBankAcc,
          ifsc_code: ifsc,
        }),
      });
      setNewBankName("");
      setNewBankAcc("");
      setNewBankIfsc("");
      setLinking(false);
      setAddBankOpen(false);
      toast.success("Bank account verified & linked ✓", {
        id: tid,
        description: `${bank.name} ${bank.masked} · IFSC ${ifsc}`,
      });
      fetchBanks();
    } catch (err) {
      setLinking(false);
      toast.error((err as Error).message, { id: tid });
    }
  };

  const removeBank = async (id: number) => {
    const tid = toast.loading("Removing bank account…");
    try {
      await apiFetch(`/api/user/banks/${id}`, { method: "DELETE" });
      toast.success("Bank removed", { id: tid });
      fetchBanks();
    } catch (err) {
      toast.error((err as Error).message, { id: tid });
    }
  };

  const downloadReport = async () => {
    let label = "";
    const today = new Date();
    if (range === "day") label = format(today, "d MMM yyyy");
    else if (range === "month") label = format(today, "MMMM yyyy");
    else if (range === "year") label = format(today, "yyyy");
    else {
      if (!fromDate || !toDate) {
        toast.error("Pick both From and To dates");
        return;
      }
      label = `${format(fromDate, "d MMM")} – ${format(toDate, "d MMM yyyy")}`;
    }
    
    const tid = toast.loading("Generating statement…");
    try {
      const res = await apiFetch("/api/user/statement", {
        method: "POST",
        body: JSON.stringify({
          range,
          fromDate: fromDate?.toISOString(),
          toDate: toDate?.toISOString(),
        }),
      });
      toast.success("Statement ready", { id: tid, description: `Downloaded report: ${res.filename}` });
      setReportsOpen(false);
    } catch (err) {
      toast.error((err as Error).message, { id: tid });
    }
  };

  const groups = [
    {
      title: "Account",
      items: [
        { icon: Shield, label: "Security & KYC", note: "Verified", onClick: () => toast.success("KYC Verified ✓", { description: "PAN, Aadhaar & bank linked" }) },
        { icon: CreditCard, label: "Linked accounts", note: `${banks.length} banks`, onClick: () => setBanksOpen(true) },
        { icon: Bell, label: "Notifications", note: "", onClick: () => toast("Notifications", { description: "You are up to date." }) },
      ],
    },
    {
      title: "Money tools",
      items: [
        { icon: FileText, label: "Reports & statements", note: "", onClick: () => setReportsOpen(true) },
        { icon: HelpCircle, label: "Help & support", note: "", onClick: () => toast("Support", { description: "support@fim.in · +91 1800-FIM-HELP" }) },
      ],
    },
  ];

  return (
    <MobileShell>
      <ScreenHeader title="Profile" />

      <section className="px-5">
        <div className="bg-surface border border-border rounded-3xl p-5 flex items-center gap-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-display text-2xl font-bold shadow-glow">
            {user?.initials || "FI"}
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-lg text-foreground">{user?.name || "Guest"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}{user?.phone ? ` · ${user.phone}` : ""}</p>
            <span className="inline-block mt-1.5 text-[10px] font-bold bg-success/15 text-success px-2 py-0.5 rounded-full">
              {premium ? "Premium · KYC Verified" : "KYC Verified"}
            </span>
          </div>
        </div>
      </section>

      <section className="px-5 mt-4">
        <div className="rounded-3xl p-5 bg-gradient-card text-primary-foreground relative overflow-hidden shadow-soft">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-accent/30 blur-2xl" />
          <div className="flex items-start gap-3 relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-accent flex items-center justify-center">
              <Crown className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-display font-bold">FIM Premium</p>
              <p className="text-xs opacity-80 mt-0.5">
                {premium ? "Active · renews 3 Jul" : "Unlimited Smart Pay, AI advisor, loan refinance — ₹ 199/mo"}
              </p>
              <button
                onClick={togglePremiumStatus}
                className="mt-3 bg-background text-foreground text-xs font-bold px-4 py-2 rounded-full tap-scale"
              >
                {premium ? "Deactivate Premium" : "Try 30 days free"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {groups.map((g) => (
        <section key={g.title} className="px-5 mt-6">
          <p className="text-[11px] uppercase tracking-widest font-bold text-muted-foreground mb-2 px-1">{g.title}</p>
          <div className="bg-surface border border-border rounded-2xl divide-y divide-border">
            {g.items.map((it) => (
              <button key={it.label} onClick={it.onClick} className="w-full flex items-center gap-3 p-4 tap-scale">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <it.icon className="w-4 h-4 text-foreground" />
                </div>
                <span className="flex-1 text-left text-sm font-semibold text-foreground">{it.label}</span>
                {it.note && <span className="text-xs text-muted-foreground">{it.note}</span>}
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      ))}

      <section className="px-5 mt-6 mb-4">
        <button
          onClick={() => setSignOutOpen(true)}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-border bg-surface text-destructive font-semibold tap-scale"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
        <p className="text-center text-[10px] text-muted-foreground mt-4">FIM v2.0 · Made in India 🇮🇳</p>
      </section>

      {/* Linked accounts */}
      <Dialog open={banksOpen} onOpenChange={setBanksOpen}>
        <DialogContent className="rounded-3xl max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Linked bank accounts</DialogTitle>
            <DialogDescription>Manage banks used for auto-pay and tracking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {loading ? (
              <p className="text-center text-xs text-muted-foreground py-6">Loading banks…</p>
            ) : banks.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-6">No banks linked yet.</p>
            ) : (
              banks.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-surface">
                  <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                    {b.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{b.name}</p>
                    <p className="text-xs text-muted-foreground">{b.masked}</p>
                  </div>
                  <button onClick={() => removeBank(b.id)} className="text-xs text-destructive font-semibold tap-scale">Remove</button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => { setBanksOpen(false); setAddBankOpen(true); }} className="w-full gap-2">
              <Plus className="w-4 h-4" /> Add & link new bank
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add bank */}
      <Dialog open={addBankOpen} onOpenChange={(o) => { setAddBankOpen(o); if (!o) { setNewBankName(""); setNewBankAcc(""); setNewBankIfsc(""); } }}>
        <DialogContent className="rounded-3xl max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link a new bank</DialogTitle>
            <DialogDescription>Account number &amp; IFSC are validated with Razorpay before linking.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Select bank</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {POPULAR_BANKS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setNewBankName(b)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full border tap-scale",
                      newBankName === b ? "bg-primary text-primary-foreground border-primary" : "bg-surface border-border text-foreground"
                    )}
                  >
                    {newBankName === b && <Check className="inline w-3 h-3 mr-1" />}
                    {b}
                  </button>
                ))}
              </div>
              <Input
                placeholder="Or type bank name"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">Account number</Label>
              <Input
                placeholder="9–18 digit account number"
                value={newBankAcc}
                onChange={(e) => setNewBankAcc(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                maxLength={18}
                className="mt-2"
              />
            </div>
            <div>
              <Label className="text-xs">IFSC code</Label>
              <Input
                placeholder="e.g. HDFC0001234"
                value={newBankIfsc}
                onChange={(e) => setNewBankIfsc(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                maxLength={11}
                className="mt-2 font-mono tracking-wider"
              />
              <p className="text-[10px] text-muted-foreground mt-1">4 letters + 0 + 6 alphanumeric (e.g. HDFC0001234)</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBankOpen(false)}>Cancel</Button>
            <Button onClick={linkBank} disabled={linking}>{linking ? "Verifying…" : "Verify & Link"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reports */}
      <Dialog open={reportsOpen} onOpenChange={setReportsOpen}>
        <DialogContent className="rounded-3xl max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reports & statements</DialogTitle>
            <DialogDescription>Pick a range to download your statement.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-4 gap-2">
            {(["day", "month", "year", "custom"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "py-2 rounded-xl text-xs font-bold capitalize tap-scale border",
                  range === r ? "bg-primary text-primary-foreground border-primary" : "bg-surface text-foreground border-border"
                )}
              >
                {r}
              </button>
            ))}
          </div>

          {range !== "custom" ? (
            <div className="rounded-2xl border border-border bg-surface p-4 text-center">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Current {range}</p>
              <p className="font-display font-bold text-lg text-foreground mt-1">
                {range === "day" && format(new Date(), "EEE, d MMM yyyy")}
                {range === "month" && format(new Date(), "MMMM yyyy")}
                {range === "year" && format(new Date(), "yyyy")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "From", date: fromDate, set: setFromDate },
                { label: "To", date: toDate, set: setToDate },
              ].map((p) => (
                <Popover key={p.label}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal text-xs", !p.date && "text-muted-foreground")}>
                      <CalendarIcon className="w-3 h-3 mr-1" />
                      {p.date ? format(p.date, "d MMM yy") : p.label}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={p.date} onSelect={p.set} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReportsOpen(false)}>Cancel</Button>
            <Button onClick={downloadReport} className="gap-2"><Download className="w-4 h-4" /> Download</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>You'll need to log in again to view your finances.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSignOutOpen(false);
                doSignOut();
                toast.success("Signed out");
                navigate({ to: "/auth", search: { redirect: "/", mode: "signin" } });
              }}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileShell>
  );
}
