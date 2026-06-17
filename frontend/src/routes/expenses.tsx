import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ShoppingBag, Utensils, Car, Film, Home, Plus, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
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

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Money — FIM" },
      { name: "description", content: "Track expenses, income and savings goals." },
    ],
  }),
  component: MoneyPage,
});

type Txn = { id: number; name: string; cat: string; amount: number; payment_status: string; when: string };

type BudgetCategory = {
  name: string;
  spent: number;
  budget: number;
  color: string;
  icon?: any;
};

const iconMap: Record<string, any> = {
  "Food & Dining": Utensils,
  "Shopping": ShoppingBag,
  "Transport": Car,
  "Entertainment": Film,
  "Home & Bills": Home,
};

function MoneyPage() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [cats, setCats] = useState<BudgetCategory[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", amount: "", cat: "Food" });

  const fetchData = async () => {
    try {
      const txnsData = await apiFetch<Txn[]>("/api/transactions");
      setTxns(txnsData);

      const budgetsData = await apiFetch<BudgetCategory[]>("/api/budgets");
      const mappedBudgets = budgetsData.map((b) => ({
        ...b,
        icon: iconMap[b.name] || Home,
      }));
      setCats(mappedBudgets);
    } catch (err) {
      console.error("Error loading financial data:", err);
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalSpent = cats.reduce((s, c) => s + c.spent, 0);
  const totalBudget = cats.reduce((s, c) => s + c.budget, 0);

  const addExpense = async () => {
    const amt = Number(form.amount);
    if (!form.name || !amt) return toast.error("Add a name and amount");

    const tid = toast.loading("Logging expense…");
    try {
      await apiFetch("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          category: form.cat,
          amount: amt,
        }),
      });
      toast.success(`Logged ₹${amt} · ${form.cat}`, { id: tid });
      setForm({ name: "", amount: "", cat: form.cat });
      setOpen(false);
      fetchData();
    } catch (err) {
      toast.error((err as Error).message, { id: tid });
    }
  };

  return (
    <MobileShell>
      <ScreenHeader
        title="Money"
        subtitle="June 2026"
        right={
          <button
            onClick={() => setOpen(true)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow tap-scale"
          >
            <Plus className="w-5 h-5" />
          </button>
        }
      />

      <div className="px-5">
        <div className="flex gap-1 p-1 bg-muted rounded-2xl">
          <button className="flex-1 py-2 rounded-xl bg-surface text-foreground text-sm font-semibold shadow-sm">Expenses</button>
          <Link to="/income" className="flex-1 py-2 rounded-xl text-muted-foreground text-sm font-semibold text-center">Income</Link>
          <Link to="/savings" className="flex-1 py-2 rounded-xl text-muted-foreground text-sm font-semibold text-center">Savings</Link>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40dvh] w-full flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          <section className="px-5 mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-surface border border-border p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowUpRight className="w-3.5 h-3.5 text-destructive" />Spent</div>
              <p className="font-display text-2xl font-bold text-foreground mt-1">₹ {totalSpent.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-muted-foreground">of ₹ {totalBudget.toLocaleString("en-IN")} budget</p>
            </div>
            <div className="rounded-2xl bg-surface border border-border p-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowDownRight className="w-3.5 h-3.5 text-success" />Saved</div>
              <p className="font-display text-2xl font-bold text-success mt-1">₹ {Math.max(0, totalBudget - totalSpent).toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-muted-foreground">vs budget</p>
            </div>
          </section>

          <section className="px-5 mt-6">
            <h3 className="font-display font-bold text-foreground mb-3">By category</h3>
            <div className="space-y-3">
              {cats.map((c) => {
                const pct = c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;
                const over = c.spent > c.budget;
                const Icon = c.icon;
                return (
                  <button
                    key={c.name}
                    onClick={() => toast(c.name, { description: `₹${c.spent.toLocaleString("en-IN")} of ₹${c.budget.toLocaleString("en-IN")} (${pct}%)` })}
                    className="w-full text-left bg-surface border border-border rounded-2xl p-4 tap-scale"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="font-semibold text-sm text-foreground">{c.name}</p>
                          <p className={`font-display font-bold text-sm ${over ? "text-destructive" : "text-foreground"}`}>
                            ₹{c.spent.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="flex justify-between text-[11px] text-muted-foreground mt-0.5">
                          <span>of ₹{c.budget.toLocaleString("en-IN")}</span>
                          <span className={over ? "text-destructive font-semibold" : ""}>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                          <div className={`h-full rounded-full ${over ? "bg-destructive" : "bg-gradient-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="px-5 mt-6 pb-4">
            <h3 className="font-display font-bold text-foreground mb-3">Recent transactions</h3>
            <div className="bg-surface border border-border rounded-2xl divide-y divide-border">
              {txns.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3.5">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{t.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {t.cat} · {t.when} · <span className={`font-medium ${t.payment_status === "credit" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{t.payment_status === "credit" ? "Credited" : "Debited"}</span>
                    </p>
                  </div>
                  <p className={`font-display font-bold text-sm ${t.payment_status === "credit" ? "text-success" : "text-foreground"}`}>
                    {t.payment_status === "credit" ? "+" : "-"}₹{Math.abs(t.amount).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Log expense</DialogTitle>
            <DialogDescription>Quickly capture a spend.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="en">Description</Label>
              <Input id="en" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Swiggy dinner" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ea">Amount ₹</Label>
                <Input id="ea" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="ec">Category</Label>
                <select
                  id="ec"
                  value={form.cat}
                  onChange={(e) => setForm({ ...form, cat: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none"
                >
                  {["Food", "Shopping", "Transport", "Entertainment", "Home"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addExpense}>Log expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}
