import type { ReactNode } from "react";
import { StudioShell } from "@/components/studio-shell";

/**
 * Keep legacy authenticated pages isolated behind the Ad Studio navigation.
 * The routes remain available while their trading-specific menu stays hidden.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return <StudioShell>{children}</StudioShell>;
}
