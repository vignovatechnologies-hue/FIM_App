import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Briefcase, Laptop, TrendingUp, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/income")({
  head: () => ({ meta: [{ title: "Income — FIM" }, { name: "description", content: "Track all your income sources." }] }),
  component: IncomePage,
});

type Src = {
  id: number;
  name: string;
  type: string;
  amount: number;
  icon?: any;
  when: string;
  color: string;
};

const iconMap: Record<string, any> = {
  "Salary": Briefcase,
  "Freelance": Laptop,
  "Investment": TrendingUp,
  "Rental": Briefcase,
};

function IncomePage() {
  const [sources, setSources] = useState<Src[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", amount: "", type: "Salary" });

  const fetchIncome = async () => {
    try {
      const data = await apiFetch<any[]>("/api/income");
      const mapped = data.map((item) => ({
        ...item,
        icon: iconMap[item.type] || Briefcase,
      }));
      setSources(mapped);
    } catch (err) {
      console.error("Error loading income sources:", err);
      toast.error("Failed to load income sources");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncome();
  }, []);

  const total = sources.reduce((s, x) => s + x.amount, 0);

  const add = async () => {
    const amt = Number(form.amount);
    if (!form.name || !amt) return toast.error("Name and amount required");

    const tid = toast.loading("Adding income source…");
    try {
      await apiFetch("/api/income", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          amount: amt,
          type: form.type,
        }),
      });
      toast.success(`Added ${form.name}`, { id: tid });
      setForm({ name: "", amount: "", type: "Salary" });
      setOpen(false);
      fetchIncome();
    } catch (err) {
      toast.error((err as Error).message, { id: tid });
    }
  };

  return (
    <MobileShell>
      <ScreenHeader
        title="Income"
        subtitle="All sources"
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
          <button className="flex-1 py-2 rounded-xl bg-surface text-foreground text-sm font-semibold shadow-sm">Income</button>
          <Link to="/savings" className="flex-1 py-2 rounded-xl text-muted-foreground text-sm font-semibold text-center">Savings</Link>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[40dvh] w-full flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          <section className="px-5 mt-5">
            <div className="rounded-3xl p-6 bg-gradient-card text-primary-foreground relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary-glow/30 blur-2xl" />
              <p className="text-xs uppercase tracking-widest opacity-70">Monthly inflow</p>
              <h2 className="font-display text-4xl font-bold mt-1">₹ {total.toLocaleString("en-IN")}</h2>
              <div className="mt-4 flex gap-2 text-xs">
                <span className="bg-white/10 px-2 py-1 rounded-full">↑ 12% MoM</span>
                <span className="bg-white/10 px-2 py-1 rounded-full">{sources.length} sources</span>
              </div>
            </div>
          </section>

          <section className="px-5 mt-5 space-y-3 pb-4">
            {sources.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => toast(s.name, { description: `${s.type} · ${s.when} · ₹${s.amount.toLocaleString("en-IN")}` })}
                  className="w-full text-left bg-surface border border-border rounded-2xl p-4 flex items-center gap-3 tap-scale"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground">{s.type} · {s.when}</p>
                  </div>
                  <p className="font-display font-bold text-success">+₹{s.amount.toLocaleString("en-IN")}</p>
                </button>
              );
            })}
          </section>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add income source</DialogTitle>
            <DialogDescription>Track a new inflow.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="in">Source</Label>
              <Input id="in" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Side project" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ia">Amount ₹</Label>
                <Input id="ia" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="it">Type</Label>
                <select id="it" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none">
                  {["Salary", "Freelance", "Investment", "Rental"].map((c) => (<option key={c}>{c}</option>))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={add}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}
