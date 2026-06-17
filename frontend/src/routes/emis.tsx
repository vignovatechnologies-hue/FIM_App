import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Plus, Zap, Calendar, Percent } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, processRazorpayPayment } from "@/lib/api/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/emis")({
  head: () => ({
    meta: [
      { title: "EMIs — FIM" },
      { name: "description", content: "Manage all your loans and EMIs in one place." },
    ],
  }),
  component: EmisPage,
});

type Loan = {
  id: number;
  name: string;
  type: string;
  emi: number;
  left: number;
  tenure: string;
  rate: number;
  due: number;
  logo: string;
  paid: boolean;
};

const FILTERS = ["All", "Home", "Personal", "Auto", "Education", "Consumer"] as const;

function EmisPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [confirmAll, setConfirmAll] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", emi: "", rate: "", type: "Personal", due_day: "15" });

  const fetchLoans = async () => {
    try {
      const data = await apiFetch<Loan[]>("/api/loans");
      setLoans(data);
    } catch (err) {
      console.error("Error loading loans:", err);
      toast.error("Failed to load loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const visible = filter === "All" ? loans : loans.filter((l) => l.type === filter);
  const total = loans.filter((l) => !l.paid).reduce((s, l) => s + l.emi, 0);

  const payOne = async (id: number, name: string, emiAmount: number) => {
    try {
      await processRazorpayPayment(emiAmount, [id], () => {
        fetchLoans();
      });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const payAll = async () => {
    setConfirmAll(false);
    const unpaidLoans = loans.filter((l) => !l.paid);
    const unpaidLoanIds = unpaidLoans.map((l) => l.id);

    try {
      await processRazorpayPayment(total, unpaidLoanIds, () => {
        fetchLoans();
      });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const addLoan = async () => {
    if (!form.name || !form.emi) return toast.error("Name and EMI are required");
    const parsedEmi = Number(form.emi);
    const parsedRate = Number(form.rate) || 12;
    const parsedDue = Number(form.due_day) || 15;

    const tid = toast.loading("Adding loan…");
    try {
      await apiFetch("/api/loans", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          emi: parsedEmi,
          rate: parsedRate,
          due_day: parsedDue,
        }),
      });
      toast.success("Loan added successfully", { id: tid });
      setForm({ name: "", emi: "", rate: "", type: "Personal", due_day: "15" });
      setAddOpen(false);
      fetchLoans();
    } catch (err) {
      toast.error((err as Error).message, { id: tid });
    }
  };

  return (
    <MobileShell>
      <ScreenHeader
        title="Your EMIs"
        subtitle={`${loans.length} active loans`}
        right={
          <button
            onClick={() => setAddOpen(true)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow tap-scale"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      {loading ? (
        <div className="min-h-[40dvh] w-full flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          <section className="px-5">
            <div className="rounded-3xl bg-gradient-card p-5 text-primary-foreground shadow-soft relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary-glow/30 blur-2xl" />
              <p className="text-xs uppercase tracking-widest opacity-70">Total monthly EMI</p>
              <h2 className="font-display text-4xl font-bold mt-1">₹ {total.toLocaleString("en-IN")}</h2>
              <p className="text-xs opacity-80 mt-1">Across {loans.length} lenders · Due by 15th</p>

              <button
                onClick={() => (total === 0 ? toast("All paid for this cycle ✓") : setConfirmAll(true))}
                className="mt-5 w-full bg-background text-foreground rounded-2xl py-3.5 font-bold flex items-center justify-center gap-2 tap-scale"
              >
                <Zap className="w-4 h-4 text-accent-foreground fill-accent" />
                Smart Pay All EMIs
              </button>
            </div>
          </section>

          <section className="px-5 mt-5 flex gap-2 overflow-x-auto hide-scrollbar">
            {FILTERS.map((t) => {
              const active = t === filter;
              return (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border tap-scale transition-colors ${
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-surface text-muted-foreground border-border"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </section>

          <section className="px-5 mt-4 space-y-3 pb-4">
            {visible.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">No {filter} loans.</p>
            )}
            {visible.map((l) => {
              const [done, totalT] = l.tenure.split("/").map(Number);
              const percentage = totalT > 0 ? (done / totalT) * 100 : 0;
              return (
                <div key={l.id} className={`bg-surface border border-border rounded-3xl p-4 shadow-sm ${l.paid ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center text-xl">{l.logo}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground truncate">{l.name}</p>
                        <p className="font-display font-bold text-foreground">₹{l.emi.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                        <span className="bg-muted px-2 py-0.5 rounded-full font-semibold">{l.type}</span>
                        <span className="flex items-center gap-1"><Percent className="w-3 h-3" />{l.rate}%</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{l.due} Jun</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span>Outstanding ₹{(l.left / 100000).toFixed(1)}L</span>
                      <span>{l.tenure} months</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={l.paid}
                      onClick={() => payOne(l.id, l.name, l.emi)}
                      className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold tap-scale disabled:opacity-50"
                    >
                      {l.paid ? "Paid ✓" : "Pay now"}
                    </button>
                    <button
                      onClick={() => toast(`${l.name} details`, { description: `EMI ₹${l.emi.toLocaleString("en-IN")} · ${l.rate}% APR · Tenure ${l.tenure}` })}
                      className="flex-1 py-2 rounded-xl bg-muted text-foreground text-xs font-bold tap-scale"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        </>
      )}

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Pay all EMIs?</AlertDialogTitle>
            <AlertDialogDescription>
              ₹ {total.toLocaleString("en-IN")} across {loans.filter((l) => !l.paid).length} lenders will be auto-debited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={payAll}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add a loan</DialogTitle>
            <DialogDescription>Track a new EMI in FIM.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="ln">Lender / nickname</Label>
              <Input id="ln" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Axis Personal" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="emi">Monthly EMI</Label>
                <Input id="emi" inputMode="numeric" value={form.emi} onChange={(e) => setForm({ ...form, emi: e.target.value })} placeholder="5000" />
              </div>
              <div>
                <Label htmlFor="rate">Rate %</Label>
                <Input id="rate" inputMode="decimal" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="12" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="type">Loan Type</Label>
                <select
                  id="type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none"
                >
                  {["Home", "Personal", "Auto", "Education", "Consumer"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="due">Due Day (1-28)</Label>
                <Input id="due" inputMode="numeric" value={form.due_day} onChange={(e) => setForm({ ...form, due_day: e.target.value })} placeholder="15" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addLoan}>Add loan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}
