import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { Activity, BarChart3, BookOpen, LayoutGrid, LogOut, Settings, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { AethraMark, AethraWordmark } from "@/components/brand/aethra-logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

const NAV = [
  { to: "/workspace", label: "Workspace", icon: LayoutGrid, hint: "Command center" },
  { to: "/terminal", label: "Terminal", icon: Activity, hint: "Chart + signal" },
  { to: "/execution", label: "Execution", icon: Zap, hint: "Order ticket" },
  { to: "/journal", label: "Journal", icon: BookOpen, hint: "Trade log" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, hint: "Edge stats" },
  { to: "/settings", label: "Risk", icon: Settings, hint: "Limits" },
] as const;

const TITLES: Record<string, string> = {
  "/workspace": "Workspace",
  "/terminal": "Terminal",
  "/execution": "Execution",
  "/journal": "Journal",
  "/analytics": "Analytics",
  "/settings": "Risk settings",
};

function DeskSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/workspace" className="flex items-center gap-2.5 px-1 py-1.5">
          <AethraMark className="size-8" />
          {!collapsed && <AethraWordmark tagline="Supervised" />}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.2em]">
            Desk
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ to, label, icon: Icon, hint }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={pathname === to} tooltip={label} className="h-10">
                    <Link to={to} className="flex items-center gap-2.5">
                      <Icon className="size-4 shrink-0" />
                      {!collapsed && (
                        <span className="flex min-w-0 flex-col leading-tight">
                          <span className="truncate text-sm">{label}</span>
                          <span className="truncate text-[10px] text-muted-foreground">{hint}</span>
                        </span>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <p className="px-1 py-1 text-[10px] leading-relaxed text-muted-foreground">
            Nothing trades unattended. Orders require you at the desk.
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <DeskSidebar />
        <SidebarInset className="min-w-0 bg-transparent">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-5" />
            <h1 className="font-display text-sm font-semibold tracking-tight">
              {TITLES[pathname] ?? "AETHRA"}
            </h1>
            <span className="ml-3 hidden items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-primary sm:inline-flex">
              <span className="size-1.5 rounded-full bg-primary" />
              Device
            </span>

            <div className="ml-auto flex items-center gap-3">
              <span className="hidden max-w-[18ch] truncate text-xs text-muted-foreground md:inline">
                {user?.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  router.navigate({ to: "/auth" });
                }}
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 px-4 py-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}