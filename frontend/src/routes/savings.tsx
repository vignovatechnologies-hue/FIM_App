import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Plus, Plane, GraduationCap, Shield, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/savings")({
  head: () => ({ meta: [{ title: "Savings — FIM" }, { name: "description", content: "Track savings goals and emergency funds." }] }),
  component: SavingsPage,
});

type Goal = {
  id: number;
  name: string;
  icon?: any;
  saved: number;
  target: number;
  eta: string;
  color: string;
};

const getIcon = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("emergency") || n.includes("shield") || n.includes("fund")) return Shield;
  if (n.includes("trip") || n.includes("bali") || n.includes("travel") || n.includes("plane")) return Plane;
  if (n.includes("education") || n.includes("kid") || n.includes("college") || n.includes("school")) return GraduationCap;
  return Home;
};

function SavingsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contrib, setContrib] = useState<{ id: number; idx: number; amount: string } | null>(null);
  const [form, setForm] = useState({ name: "", target: "" });

  const fetchGoals = async () => {
    try {
      const data = await apiFetch<any[]>("/api/savings");
      const mapped = data.map((item) => ({
        ...item,
        icon: getIcon(item.name),
      }));
      setGoals(mapped);
    } catch (err) {
      console.error("Error loading savings goals:", err);
      toast.error("Failed to load savings goals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const total = goals.reduce((s, g) => s + g.saved, 0);

  const addGoal = async () => {
    const t = Number(form.target);
    if (!form.name || !t) return toast.error("Name and target required");

    const tid = toast.loading("Creating goal…");
    try {
      await apiFetch("/api/savings", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          target_amount: t,
        }),
      });
      toast.success("Goal created successfully", { id: tid });
      setForm({ name: "", target: "" });
      setOpen(false);
      fetchGoals();
    } catch (err) {
      toast.error((err as Error).message, { id: tid });
    }
  };

  const addContribution = async () => {
    if (!contrib) return;
    const amt = Number(contrib.amount);
    if (!amt) return toast.error("Enter amount");

    const tid = toast.loading("Adding money…");
    try {
      await apiFetch(`/api/savings/${contrib.id}/add-money`, {
        method: "POST",
        body: JSON.stringify({ amount: amt }),
      });
      toast.success(`Added ₹${amt.toLocaleString("en-IN")} to ${goals[contrib.idx].name}`, { id: tid });
      setContrib(null);
      fetchGoals();
    } catch (err) {
      toast.error((err as Error).message, { id: tid });
    }
  };

  return (
    <MobileShell>
      <ScreenHeader
        title="Savings"
        subtitle="Goals & funds"
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
          <Link to="/expenses" className="flex-1 py-2 rounded-xl text-muted-foreground text-sm font-semibold text-center">Expenses</Link>
          <Link to="/income" className="flex-1 py-2 rounded-xl text-muted-foreground text-sm font-semibold text-center">Income</Link>
          <button className="flex-1 py-2 rounded-xl bg-surface text-foreground text-sm font-semibold shadow-sm">Savings</button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40dvh] w-full flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          <section className="px-5 mt-5">
            <div className="rounded-3xl p-6 bg-gradient-accent text-accent-foreground relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/30 blur-2xl" />
              <p className="text-xs uppercase tracking-widest opacity-70">Total saved</p>
              <h2 className="font-display text-4xl font-bold mt-1">₹ {(total / 100000).toFixed(2)}L</h2>
              <p className="text-xs mt-1 opacity-80">Across {goals.length} goals · auto-saving ₹ 18,000/mo</p>
            </div>
          </section>

          <section className="px-5 mt-5 space-y-3 pb-4">
            {goals.map((g, i) => {
              const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
              const Icon = g.icon || Shield;
              return (
                <div key={g.id} className="bg-surface border border-border rounded-3xl p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${g.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{g.name}</p>
                      <p className="text-[11px] text-muted-foreground">Reach in {g.eta}</p>
                    </div>
                    <p className="font-display font-bold text-foreground">{pct}%</p>
                  </div>
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                    <span>₹{Math.round(g.saved).toLocaleString("en-IN")} saved</span>
                    <span>of ₹{Math.round(g.target).toLocaleString("en-IN")}</span>
                  </div>
                  <button
                    onClick={() => setContrib({ id: g.id, idx: i, amount: "" })}
                    className="mt-3 w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold tap-scale"
                  >
                    Add money
                  </button>
                </div>
              );
            })}
          </section>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>New savings goal</DialogTitle>
            <DialogDescription>Set a target and start saving.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="gn">Goal name</Label>
              <Input id="gn" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="New laptop" />
            </div>
            <div>
              <Label htmlFor="gt">Target ₹</Label>
              <Input id="gt" inputMode="numeric" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="120000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addGoal}>Create goal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contrib !== null} onOpenChange={(o) => !o && setContrib(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add money</DialogTitle>
            <DialogDescription>{contrib && goals[contrib.idx]?.name}</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="ca">Amount ₹</Label>
            <Input
              id="ca"
              inputMode="numeric"
              value={contrib?.amount ?? ""}
              onChange={(e) => contrib && setContrib({ ...contrib, amount: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setContrib(null)}>Cancel</Button>
            <Button onClick={addContribution}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}
