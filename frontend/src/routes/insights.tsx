import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { ScreenHeader } from "@/components/ScreenHeader";
import { Sparkles, TrendingDown, AlertTriangle, Lightbulb, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api/client";

export const Route = createFileRoute("/insights")({
  head: () => ({ meta: [{ title: "Insights — FIM" }, { name: "description", content: "AI-powered financial insights and health score." }] }),
  component: InsightsPage,
});

type Msg = { from: "you" | "fim"; text: string };

type InsightItem = {
  tone: "primary" | "warning" | "success";
  title: string;
  body: string;
  cta: string;
  type: string;
  icon?: any;
};

const toneIcons = {
  primary: Lightbulb,
  warning: AlertTriangle,
  success: TrendingDown,
};

function InsightsPage() {
  const [score, setScore] = useState(78);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [submittingChat, setSubmittingChat] = useState(false);

  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score / 100) * circumference;

  const fetchInsightsData = async () => {
    try {
      const summary = await apiFetch("/api/dashboard/summary");
      setScore(summary.health_score);

      const items = await apiFetch<InsightItem[]>("/api/insights");
      const mapped = items.map((it) => ({
        ...it,
        icon: toneIcons[it.tone] || Lightbulb,
      }));
      setInsights(mapped);
    } catch (err) {
      console.error("Error loading insights data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsightsData();
  }, []);

  const ask = async () => {
    const q = input.trim();
    if (!q || submittingChat) return;

    setMsgs((m) => [...m, { from: "you", text: q }]);
    setInput("");
    setSubmittingChat(true);

    try {
      const res = await apiFetch<{ text: string }>("/api/insights/ask", {
        method: "POST",
        body: JSON.stringify({ text: q }),
      });
      setMsgs((m) => [...m, { from: "fim", text: res.text }]);
    } catch (err) {
      setMsgs((m) => [...m, { from: "fim", text: "Sorry, I am having trouble connecting right now." }]);
    } finally {
      setSubmittingChat(false);
    }
  };

  const handleInsightClick = (type: string, cta: string) => {
    if (type === "shopping_warning") {
      toast("Recent Transactions", { description: "You have spent over budget on shopping this month." });
    } else if (type === "refinance") {
      toast.success("Pre-qualified!", { description: "Refinancing pre-qualification rate is 11.2% APR." });
    } else if (type === "savings_boost") {
      toast.success("Auto-save updated", { description: "Auto-save budget increased by ₹ 2,000" });
    } else {
      toast(cta);
    }
  };

  return (
    <MobileShell>
      <ScreenHeader title="Insights" subtitle="AI-powered for you" />

      {loading ? (
        <div className="min-h-[40dvh] w-full flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      ) : (
        <>
          <section className="px-5">
            <div className="rounded-3xl bg-surface border border-border p-6 flex flex-col items-center shadow-sm">
              <div className="relative w-44 h-44">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="70" stroke="var(--muted)" strokeWidth="14" fill="none" />
                  <circle
                    cx="80" cy="80" r="70"
                    stroke="url(#g)" strokeWidth="14" fill="none" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={offset}
                  />
                  <defs>
                    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.42 0.11 170)" />
                      <stop offset="100%" stopColor="oklch(0.62 0.14 165)" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Health Score</p>
                  <p className="font-display text-5xl font-bold text-foreground">{score}</p>
                  <p className="text-xs text-success font-semibold mt-1">
                    {score >= 80 ? "Excellent" : score >= 70 ? "Good" : "Fair"} · on track
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 w-full text-center">
                <Pill label="Debt" value="Good" tone="success" onClick={() => toast("Debt Health", { description: "Your debt-to-income ratio is under control." })} />
                <Pill label="Savings" value="On Track" tone="success" onClick={() => toast("Savings Progress", { description: "You are consistent with emergency savings." })} />
                <Pill label="Spending" value="Stable" tone="success" onClick={() => toast("Budget Status", { description: "Most category spends are within monthly limits." })} />
              </div>
            </div>
          </section>

          <section className="px-5 mt-5 space-y-3">
            {insights.map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <Insight
                  key={idx}
                  tone={insight.tone}
                  icon={Icon}
                  title={insight.title}
                  body={insight.body}
                  cta={insight.cta}
                  onClick={() => handleInsightClick(insight.type, insight.cta)}
                />
              );
            })}
          </section>
        </>
      )}

      <section className="px-5 mt-6 mb-4">
        <div className="rounded-3xl bg-foreground text-background p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-mesh opacity-20" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-accent flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-accent-foreground" />
              </div>
              <p className="font-display font-bold">Ask FIM</p>
            </div>

            {msgs.length === 0 ? (
              <p className="text-sm mt-3 opacity-80">Try: "Can I afford a ₹ 8L car loan?" or "Should I refinance?"</p>
            ) : (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto hide-scrollbar">
                {msgs.map((m, i) => (
                  <div key={i} className={`text-sm rounded-2xl px-3 py-2 max-w-[85%] ${
                    m.from === "you" ? "bg-background/15 ml-auto" : "bg-background text-foreground"
                  }`}>
                    {m.text}
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); ask(); }}
              className="mt-4 flex items-center gap-2 bg-background/10 backdrop-blur rounded-2xl pl-4 pr-1.5 py-1.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={submittingChat}
                className="flex-1 bg-transparent text-sm placeholder:text-background/50 focus:outline-none"
                placeholder="Ask anything about your money…"
              />
              <button type="submit" disabled={submittingChat} className="w-9 h-9 rounded-xl bg-background text-foreground flex items-center justify-center tap-scale">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </section>
    </MobileShell>
  );
}

function Pill({ label, value, tone, onClick }: { label: string; value: string; tone: "success" | "warning"; onClick?: () => void }) {
  const tones = {
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
  } as const;
  return (
    <button onClick={onClick} className={`rounded-xl py-2 tap-scale ${tones[tone]}`}>
      <p className="font-display font-bold text-lg">{value}</p>
      <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80">{label}</p>
    </button>
  );
}

function Insight({
  icon: Icon, title, body, cta, tone, onClick,
}: { icon: any; title: string; body: string; cta: string; tone: "primary" | "warning" | "success"; onClick?: () => void }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/20 text-warning-foreground",
    success: "bg-success/15 text-success",
  } as const;
  return (
    <div className="bg-surface border border-border rounded-3xl p-4">
      <div className="flex gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{body}</p>
          <button onClick={onClick} className="mt-3 text-xs font-bold text-primary tap-scale">{cta} →</button>
        </div>
      </div>
    </div>
  );
}
