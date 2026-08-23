import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth/auth-layout";
import { isAdminEmail, isAdminUser } from "@/lib/admin-auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AETHRON futures terminal" },
      {
        name: "description",
        content:
          "Sign in to AETHRON to view live futures signals, your trade journal and supervised execution controls.",
      },
      { property: "og:title", content: "Sign in — AETHRON futures terminal" },
      {
        property: "og:description",
        content: "Access your futures signal gauge, trade journal and risk controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
  validateSearch: (search: Record<string, unknown>) => ({ denied: search.denied === "1" }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { denied } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (isAdminUser(data.session?.user)) navigate({ to: "/terminal", replace: true });
      else if (data.session) void supabase.auth.signOut();
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!isAdminUser(data.user)) {
      await supabase.auth.signOut();
      toast.error("Administrator access is required.");
      return;
    }
    navigate({ to: "/terminal", replace: true });
  }

  async function forgotPassword() {
    if (!email) {
      toast.error("Enter your email first.");
      return;
    }
    if (!isAdminEmail(email)) {
      toast.success("If the administrator account exists, a reset email has been sent.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset email sent.");
  }

  return (
    <AuthLayout>
      <Card className="panel">
        <CardHeader>
          <CardTitle className="font-display text-xl">Trader access</CardTitle>
          <CardDescription>Private administrator access for AETHRON operations.</CardDescription>
        </CardHeader>
        <CardContent>
          {denied && (
            <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              Administrator access is required.
            </p>
          )}
          <form onSubmit={signIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={forgotPassword}
                className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Forgot password?
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 text-primary" />
        Execution is supervised by design — this terminal never trades unattended.
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        <Link to="/" className="underline underline-offset-4 hover:text-foreground">
          Back to overview
        </Link>
      </p>
    </AuthLayout>
  );
}
