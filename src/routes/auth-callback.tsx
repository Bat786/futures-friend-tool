import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/auth-callback")({
  head: () => ({
    meta: [
      { title: "Confirming your account — Signal Desk" },
      {
        name: "description",
        content: "Finishing email confirmation for your Signal Desk futures terminal account.",
      },
      { property: "og:title", content: "Confirming your account — Signal Desk" },
      {
        property: "og:description",
        content: "Finishing email confirmation for your Signal Desk account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

function readAuthParams() {
  if (typeof window === "undefined") return { error: null as string | null };
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const get = (key: string) => query.get(key) ?? hash.get(key);
  const error = get("error") ?? get("error_code");
  const description = get("error_description");
  if (!error) return { error: null };
  return { error: description ? description.replace(/\+/g, " ") : error };
}

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "ok" | "failed">("working");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { error } = readAuthParams();
    if (error) {
      setStatus("failed");
      setMessage(error);
      return;
    }

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      setStatus("ok");
      setTimeout(() => navigate({ to: "/terminal", replace: true }), 900);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish();
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish();
    });

    const timer = setTimeout(() => {
      if (!done) {
        setStatus("failed");
        setMessage("This confirmation link is invalid, already used, or has expired.");
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function resend(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth-callback` },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("A fresh confirmation link is on its way.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="grid size-8 place-items-center rounded bg-primary/15 text-primary">
            <Activity className="size-4" />
          </span>
          <span className="font-mono text-base font-semibold tracking-tight">SIGNAL DESK</span>
        </div>

        <Card>
          {status === "working" && (
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Confirming your account
              </CardTitle>
              <CardDescription>One moment while we verify your email link.</CardDescription>
            </CardHeader>
          )}

          {status === "ok" && (
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-profit">
                <CheckCircle2 className="size-4" />
                Email confirmed
              </CardTitle>
              <CardDescription>Taking you to the terminal…</CardDescription>
            </CardHeader>
          )}

          {status === "failed" && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TriangleAlert className="size-4 text-destructive" />
                  Confirmation link didn't work
                </CardTitle>
                <CardDescription>{message}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={resend} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resend-email">Email</Label>
                    <Input
                      id="resend-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" />}
                    Resend confirmation email
                  </Button>
                </form>
                <div className="mt-4 text-center text-xs text-muted-foreground">
                  <Link to="/auth" className="underline underline-offset-4">
                    Back to sign in
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
