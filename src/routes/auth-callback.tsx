import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth/auth-layout";
import { isAdminUser } from "@/lib/admin-auth";

export const Route = createFileRoute("/auth-callback")({
  head: () => ({
    meta: [
      { title: "Confirming your account — AETHRON" },
      {
        name: "description",
        content: "Finishing email confirmation for your AETHRON futures terminal account.",
      },
      { property: "og:title", content: "Confirming your account — AETHRON" },
      {
        property: "og:description",
        content: "Finishing email confirmation for your AETHRON account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallbackPage,
});

const supportedConfirmationTypes = new Set<EmailOtpType>([
  "invite",
  "magiclink",
  "email",
  "email_change",
]);

function readAuthParams() {
  if (typeof window === "undefined") {
    return {
      error: null as string | null,
      tokenHash: null as string | null,
      type: null as EmailOtpType | null,
    };
  }
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const get = (key: string) => query.get(key) ?? hash.get(key);
  const error = get("error") ?? get("error_code");
  const description = get("error_description");
  const tokenHash = get("token_hash");
  const rawType = get("type");
  const type =
    rawType && supportedConfirmationTypes.has(rawType as EmailOtpType)
      ? (rawType as EmailOtpType)
      : null;

  return {
    error: error ? (description ? description.replace(/\+/g, " ") : error) : null,
    tokenHash,
    type,
  };
}

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"working" | "ok" | "failed">("working");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const { error, tokenHash, type } = readAuthParams();
    if (error) {
      setStatus("failed");
      setMessage(error);
      return;
    }

    let done = false;
    const finish = async () => {
      if (done) return;
      const { data } = await supabase.auth.getUser();
      if (!isAdminUser(data.user)) {
        done = true;
        await supabase.auth.signOut();
        setStatus("failed");
        setMessage("Administrator access is required.");
        return;
      }
      done = true;
      setStatus("ok");
      setTimeout(() => navigate({ to: "/terminal", replace: true }), 900);
    };

    const completeConfirmation = async () => {
      if (tokenHash) {
        if (!type) {
          setStatus("failed");
          setMessage("This confirmation link has an unsupported or missing verification type.");
          return;
        }

        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (verifyError) {
          setStatus("failed");
          setMessage(verifyError.message);
          return;
        }
        await finish();
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) await finish();
    };

    void completeConfirmation();

    const timer = setTimeout(() => {
      if (!done) {
        setStatus("failed");
        setMessage("This confirmation link is invalid, already used, or has expired.");
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <AuthLayout>
      <Card className={status === "ok" ? "panel-glow" : "panel"}>
        {status === "working" && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Loader2 className="size-4 animate-spin text-primary" />
              Confirming your account
            </CardTitle>
            <CardDescription>One moment while we verify your email link.</CardDescription>
          </CardHeader>
        )}

        {status === "ok" && (
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-profit">
              <CheckCircle2 className="size-4" />
              Email confirmed
            </CardTitle>
            <CardDescription>Taking you to the terminal…</CardDescription>
          </CardHeader>
        )}

        {status === "failed" && (
          <>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <TriangleAlert className="size-4 text-destructive" />
                Confirmation link didn't work
              </CardTitle>
              <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-xs text-muted-foreground">
                <Link to="/auth" className="underline underline-offset-4 hover:text-foreground">
                  Back to sign in
                </Link>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </AuthLayout>
  );
}
