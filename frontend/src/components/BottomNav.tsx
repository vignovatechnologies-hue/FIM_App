import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Wallet, TrendingUp, Sparkles, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/emis", label: "EMIs", icon: Wallet },
  { to: "/expenses", label: "Money", icon: TrendingUp },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 px-2 sm:px-3 pt-2 bg-background/85 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <ul className="flex items-center justify-around">
        {items.map(({ to, label, icon: Icon }) => {
          const active = path === to || (to !== "/" && path.startsWith(to));
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className="flex flex-col items-center gap-1 px-1 py-1 tap-scale"
              >
                <div
                  className={`p-2 rounded-2xl transition-all ${
                    active ? "bg-gradient-primary shadow-glow" : ""
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold tracking-wide ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
