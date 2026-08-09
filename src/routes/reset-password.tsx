import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth/auth-layout";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Signal Desk" },
      {
        name: "description",
        content: "Choose a new password for your Signal Desk futures terminal account.",
      },
      { property: "og:title", content: "Set a new password — Signal Desk" },
      {
        property: "og:description",
        content: "Choose a new password for your Signal Desk account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true);
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated.");
    navigate({ to: "/terminal", replace: true });
  }

  return (
    <AuthLayout>
      <Card className="panel">
          <CardHeader>
            <CardTitle className="font-display">Set a new password</CardTitle>
            <CardDescription>
              {ready && !hasSession
                ? "This reset link is invalid or has expired. Request a new one from the sign-in page."
                : "Choose a password you'll use to sign in to the terminal."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ready && !hasSession ? (
              <Button asChild className="w-full">
                <Link to="/auth">Back to sign in</Link>
              </Button>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy || !ready}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Update password
                </Button>
              </form>
            )}
          </CardContent>
      </Card>
    </AuthLayout>
  );
}
