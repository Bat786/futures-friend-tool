import type { ReactNode } from "react";
import { Activity } from "lucide-react";

/** Shared chrome for every unauthenticated screen. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
        style={{ backgroundImage: "var(--gradient-mint)" }}
        aria-hidden
      />

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="mb-7 flex items-center justify-center gap-2.5">
          <span
            className="grid size-9 place-items-center rounded-md text-primary-foreground"
            style={{ backgroundImage: "var(--gradient-mint)" }}
          >
            <Activity className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Signal Desk</span>
        </div>
        {children}
      </div>
    </div>
  );
}