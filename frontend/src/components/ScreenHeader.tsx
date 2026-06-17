import type { ReactNode } from "react";

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="px-5 pt-6 pb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
