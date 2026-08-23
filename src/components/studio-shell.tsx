import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  FolderOpen,
  GalleryVerticalEnd,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Palette,
  PenTool,
  Clapperboard,
  ScrollText,
  Smartphone,
  Settings,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
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
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/create", "Create", Sparkles],
  ["/campaigns", "Campaigns", Megaphone],
  ["/brands", "Brands", Building2],
  ["/tiktok-lab", "TikTok Lab", Smartphone],
  ["/script-studio", "Script Studio", ScrollText],
  ["/storyboard", "Storyboard", Clapperboard],
  ["/creative-studio", "Creative Studio", Palette],
  ["/website-lab", "Website Lab", GalleryVerticalEnd],
  ["/content", "Content", PenTool],
  ["/agency", "Agency", BriefcaseBusiness],
  ["/analytics", "Analytics", BarChart3],
  ["/library", "Library", FolderOpen],
  ["/ai-director", "AI Director", Bot],
  ["/settings", "Settings", Settings],
] as const;
function StudioSidebar() {
  const { state } = useSidebar();
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-ai font-display font-black text-white">
            A
          </div>
          {state !== "collapsed" && (
            <div>
              <div className="font-display text-sm font-bold tracking-[.18em]">AETHRON</div>
              <div className="font-mono text-[9px] uppercase tracking-[.25em] text-primary">
                Ad Studio OS
              </div>
            </div>
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(([to, label, Icon]) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    asChild
                    isActive={path === to}
                    tooltip={label}
                    className="h-10"
                  >
                    <Link to={to}>
                      <Icon className="size-4" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="rounded-lg border border-ai/25 bg-ai/10 p-3 text-[10px] text-muted-foreground">
          <span className="font-mono uppercase tracking-widest text-ai">Private studio</span>
          {state !== "collapsed" && <p className="mt-1">Admin-only · local-first</p>}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
export function StudioShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const name = NAV.find(([to]) => to === path)?.[1] ?? "Creative Intelligence";
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <StudioSidebar />
        <SidebarInset className="min-w-0 bg-transparent pb-20 md:pb-0">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-xl">
            <SidebarTrigger />
            <div>
              <div className="font-display text-sm font-semibold">{name}</div>
              <div className="hidden font-mono text-[9px] uppercase tracking-[.22em] text-muted-foreground sm:block">
                Creative intelligence terminal
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-xs text-muted-foreground lg:block">{user?.email}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await signOut();
                  router.navigate({ to: "/auth", search: {} });
                }}
              >
                <LogOut className="size-4" />
              </Button>
            </div>
          </header>
          <main className="p-4 sm:p-6">{children}</main>
          <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 p-1 backdrop-blur md:hidden">
            {NAV.slice(0, 5).map(([to, label, Icon]) => (
              <Link
                key={to}
                to={to}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[9px] ${path === to ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            ))}
          </nav>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
