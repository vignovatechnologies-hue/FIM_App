import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { BottomNav } from "./BottomNav";
import { useAuth } from "@/lib/auth";

/**
 * Responsive phone shell.
 * - Mobile: fills the viewport edge-to-edge (uses 100dvh for correct mobile-browser height).
 * - Tablet/Desktop: renders a phone frame that auto-scales to the available viewport
 *   while preserving the 420:860 aspect ratio.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!ready) return;
    if (!user && pathname !== "/auth") {
      navigate({ to: "/auth", search: { redirect: pathname, mode: "signin" } });
    } else if (user && !user.verified && pathname !== "/verify") {
      navigate({ to: "/verify", search: { email: user.email, redirect: pathname } });
    }
  }, [ready, user, pathname, navigate]);

  if (!ready || !user || !user.verified) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-stretch md:items-center justify-center md:py-6 lg:py-10">
      <div
        className="
          relative bg-background overflow-hidden flex flex-col
          w-full min-h-[100dvh]
          md:min-h-0
          md:h-[min(860px,calc(100dvh-3rem))]
          md:w-[min(420px,calc((100dvh-3rem)*420/860),calc(100vw-3rem))]
          md:rounded-[3rem] md:border-[10px] md:border-foreground/90
          md:shadow-[0_40px_120px_-30px_rgba(0,0,0,0.5)]
        "
      >
        {/* Status bar (desktop frame only) */}
        <div className="hidden md:flex justify-between items-center px-8 pt-2 pb-1 text-[11px] font-semibold text-foreground/80 shrink-0">
          <span>9:41</span>
          <div className="absolute left-1/2 -translate-x-1/2 top-1 w-24 h-5 bg-foreground/90 rounded-b-2xl" />
          <div className="flex gap-1 items-center">
            <span>●●●</span>
            <span>100%</span>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto pb-[88px] hide-scrollbar">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
