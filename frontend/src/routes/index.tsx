import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import {
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Plus,
  Calendar,
  TrendingUp,
  Shield,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { apiFetch, processRazorpayPayment } from "@/lib/api/client";
import { getCurrentUser } from "@/lib/auth";
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FIM — Your Financial Dashboard" },
      { name: "description", content: "Track EMIs, income, expenses and savings in one place. Pay all EMIs with one Smart Pay." },
    ],
  }),
  component: Dashboard,
});

type Summary = {
  net_balance: number;
  income: number;
  spent: number;
  active_loans_count: number;
  outstanding_loans_amount: number;
  health_score: number;
  savings_goal_percent: number;
  savings_goal_text: string;
  next_emi_days: string;
  next_emi_name: string;
};

type Emi = {
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

function Dashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [confirmPay, setConfirmPay] = useState(false);
  const [paid, setPaid] = useState(false);
  
  const [summary, setSummary] = useState<Summary | null>(null);
  const [upcoming, setUpcoming] = useState<Emi[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const summaryData = await apiFetch<Summary>("/api/dashboard/summary");
      setSummary(summaryData);
      
      const loansData = await apiFetch<Emi[]>("/api/loans");
      // Filter out paid loans and show top 3 closest due
      const unpaid = loansData.filter((l) => !l.paid).slice(0, 3);
      setUpcoming(unpaid);
      
      // If there are no unpaid loans, consider them "all paid this cycle"
      if (unpaid.length === 0 && loansData.length > 0) {
        setPaid(true);
      } else {
        setPaid(false);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePayAll = async () => {
    setConfirmPay(false);
    const totalAmount = upcoming.reduce((sum, l) => sum + l.emi, 0);
    const unpaidLoanIds = upcoming.map((l) => l.id);

    try {
      await processRazorpayPayment(totalAmount, unpaidLoanIds, () => {
        setPaid(true);
        fetchData();
      });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const quickActionHandlers: Record<string, () => void> = {
    "Add Loan": () => navigate({ to: "/emis" }),
    "Log Expense": () => navigate({ to: "/expenses" }),
    "Add Income": () => navigate({ to: "/income" }),
    "Set Goal": () => navigate({ to: "/savings" }),
  };

  if (loading || !summary) {
    return (
      <MobileShell>
        <div className="min-h-[60dvh] w-full flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </MobileShell>
    );
  }

  // Calculate sum of unpaid EMIs
  const totalUnpaidEmi = upcoming.reduce((sum, l) => sum + l.emi, 0);

  return (
    <MobileShell>
      <div className="animate-slide-up">
        {/* Greeting */}
        <header className="px-5 pt-6 pb-3 flex items-center justify-between">
          <Link to="/profile" className="flex items-center gap-3 tap-scale">
            <div className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold shadow-glow">
              {user?.initials || "FI"}
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">Good morning</p>
              <p className="font-display font-bold text-foreground">{user?.name || "Guest"}</p>
            </div>
          </Link>
          <button
            onClick={() => toast("Notifications", { description: `${upcoming.length} EMIs due soon.` })}
            className="relative p-2.5 rounded-full bg-surface border border-border tap-scale"
          >
            <Bell className="w-5 h-5 text-foreground" />
            {upcoming.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
            )}
          </button>
        </header>

        {/* Balance card */}
        <section className="px-5 mt-3">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-card p-6 text-primary-foreground shadow-soft">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary-glow/30 blur-2xl" />
            <div className="absolute -bottom-20 -left-10 w-48 h-48 rounded-full bg-accent/20 blur-2xl" />
            <div className="relative">
              <p className="text-xs uppercase tracking-widest opacity-70">Net Balance this month</p>
              <h2 className="font-display text-4xl font-bold mt-1">₹ {summary.net_balance.toLocaleString("en-IN")}</h2>
              <div className="mt-4 flex gap-3">
                <Link to="/income" className="flex-1 rounded-2xl bg-white/10 backdrop-blur p-3 tap-scale">
                  <div className="flex items-center gap-1.5 text-xs opacity-80">
                    <ArrowDownRight className="w-3.5 h-3.5" /> Income
                  </div>
                  <p className="font-semibold mt-1">₹ {summary.income.toLocaleString("en-IN")}</p>
                </Link>
                <Link to="/expenses" className="flex-1 rounded-2xl bg-white/10 backdrop-blur p-3 tap-scale">
                  <div className="flex items-center gap-1.5 text-xs opacity-80">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Spent
                  </div>
                  <p className="font-semibold mt-1">₹ {summary.spent.toLocaleString("en-IN")}</p>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Smart Pay CTA */}
        <section className="px-5 mt-4">
          <button
            onClick={() => (paid || upcoming.length === 0 ? toast("All paid for this cycle ✓") : setConfirmPay(true))}
            className="w-full rounded-3xl bg-surface border border-border p-4 flex items-center gap-4 tap-scale shadow-soft"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-accent flex items-center justify-center">
              <Zap className="w-6 h-6 text-accent-foreground" fill="currentColor" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-display font-bold text-foreground">
                {paid || upcoming.length === 0 ? "All EMIs paid this month" : `Smart Pay ${upcoming.length} EMIs`}
              </p>
              <p className="text-xs text-muted-foreground">
                {paid || upcoming.length === 0 
                  ? "Next due in 30 days" 
                  : `One tap. ₹ ${totalUnpaidEmi.toLocaleString("en-IN")} due soon`}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </section>

        {/* Quick stats */}
        <section className="px-5 mt-5 grid grid-cols-2 gap-3">
          <Link to="/emis"><StatCard label="Active Loans" value={summary.active_loans_count.toString()} sub={`₹ ${(summary.outstanding_loans_amount / 100000).toFixed(1)}L outstanding`} icon={TrendingUp} tone="primary" /></Link>
          <Link to="/insights"><StatCard label="Health Score" value={summary.health_score.toString()} sub="Good · improving" icon={Shield} tone="success" /></Link>
          <Link to="/savings"><StatCard label="Savings Goal" value={`${summary.savings_goal_percent}%`} sub={summary.savings_goal_text} icon={TrendingUp} tone="accent" /></Link>
          <Link to="/emis"><StatCard label="Next EMI" value={summary.next_emi_days} sub={summary.next_emi_name} icon={Calendar} tone="warning" /></Link>
        </section>

        {/* Upcoming EMIs */}
        <section className="px-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-foreground">Upcoming EMIs</h3>
            <Link to="/emis" className="text-xs font-semibold text-primary tap-scale">See all</Link>
          </div>
          <div className="space-y-2.5">
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center bg-surface border border-border rounded-2xl p-6 text-center">
                <span className="text-xl">🎉</span>
                <p className="text-xs text-muted-foreground mt-1">All EMIs paid for this month!</p>
              </div>
            ) : (
              upcoming.map((e) => (
                <EmiRow key={e.id} {...e} />
              ))
            )}
          </div>
        </section>

        {/* Insight teaser */}
        <section className="px-5 mt-6">
          <div className="rounded-3xl p-5 bg-foreground text-background relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-background/10 px-2.5 py-1 rounded-full">
                <Sparkle /> AI Insight
              </div>
              <p className="font-display text-lg font-semibold mt-3 leading-snug">
                You can save ₹ 14,200/yr by refinancing your Bajaj personal loan.
              </p>
              <button
                onClick={() => navigate({ to: "/insights" })}
                className="mt-4 text-xs font-bold bg-background text-foreground px-4 py-2 rounded-full tap-scale"
              >
                Show me how →
              </button>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="px-5 mt-6 mb-4">
          <h3 className="font-display font-bold text-foreground mb-3">Quick actions</h3>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((q) => (
              <button
                key={q.label}
                onClick={quickActionHandlers[q.label]}
                className="flex flex-col items-center gap-1.5 tap-scale"
              >
                <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center">
                  <q.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground text-center">{q.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <AlertDialog open={confirmPay} onOpenChange={setConfirmPay}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Smart Pay {upcoming.length} EMIs?</AlertDialogTitle>
            <AlertDialogDescription>
              ₹ {totalUnpaidEmi.toLocaleString("en-IN")} will be debited from your primary HDFC account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePayAll}>Pay ₹ {totalUnpaidEmi.toLocaleString("en-IN")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileShell>
  );
}

function Sparkle() {
  return <span className="text-[10px]">✦</span>;
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  icon: any;
  tone: "primary" | "success" | "accent" | "warning";
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    accent: "bg-accent text-accent-foreground",
    warning: "bg-warning/20 text-warning-foreground",
  };
  return (
    <div className="rounded-2xl bg-surface border border-border p-4 shadow-sm tap-scale h-full">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-display text-2xl font-bold mt-3 text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
      <p className="text-[10px] text-muted-foreground/80 mt-0.5">{sub}</p>
    </div>
  );
}

function EmiRow({ id, name, due, emi, logo }: Emi) {
  return (
    <Link
      to="/emis"
      className="flex items-center gap-3 bg-surface border border-border rounded-2xl p-3.5 tap-scale"
    >
      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center text-lg">{logo}</div>
      <div className="flex-1">
        <p className="font-semibold text-sm text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">Due {due} Jun</p>
      </div>
      <div className="text-right">
        <p className="font-display font-bold text-foreground">₹{emi.toLocaleString("en-IN")}</p>
        <p className="text-[10px] text-success font-semibold">On track</p>
      </div>
    </Link>
  );
}

const quickActions = [
  { label: "Add Loan", icon: Plus },
  { label: "Log Expense", icon: ArrowUpRight },
  { label: "Add Income", icon: ArrowDownRight },
  { label: "Set Goal", icon: TrendingUp },
];
