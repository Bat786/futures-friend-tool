import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, MailCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const COOLDOWN_SECONDS = 60;

/** Single source of truth for where confirmation links must land. */
export function authCallbackUrl() {
  if (typeof window === "undefined") return "/auth-callback";
  return `${window.location.origin}/auth-callback`;
}

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "already_confirmed" }
  | { kind: "error"; message: string };

function mapError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate") || m.includes("too many") || m.includes("security purposes")) {
    return "Too many confirmation emails have been sent recently. Wait a minute, then try again.";
  }
  if (m.includes("already") && m.includes("confirm")) {
    return "already_confirmed";
  }
  if (m.includes("not found") || m.includes("no user")) {
    return "We couldn't find an account with that email. Create one first.";
  }
  return message;
}

export function ResendConfirmation({
  defaultEmail = "",
  editable = true,
  className,
}: {
  defaultEmail?: string;
  /** When false the address is fixed (already known from the sign-up form). */
  editable?: boolean;
  className?: string;
}) {
  const [email, setEmail] = useState(defaultEmail);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (defaultEmail) setEmail(defaultEmail);
  }, [defaultEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    timer.current = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [cooldown]);

  const send = useCallback(async () => {
    const target = email.trim();
    if (!target) {
      setState({ kind: "error", message: "Enter the email address you signed up with." });
      return;
    }
    setState({ kind: "sending" });
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: target,
      options: { emailRedirectTo: authCallbackUrl() },
    });
    if (error) {
      const mapped = mapError(error.message);
      setState(
        mapped === "already_confirmed"
          ? { kind: "already_confirmed" }
          : { kind: "error", message: mapped },
      );
      return;
    }
    setState({ kind: "sent", email: target });
    setCooldown(COOLDOWN_SECONDS);
  }, [email]);

  if (state.kind === "already_confirmed") {
    return (
      <div className={className}>
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-foreground">This email is already confirmed.</p>
            <Link to="/auth" className="mt-1 inline-block text-primary underline underline-offset-4">
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const busy = state.kind === "sending";

  return (
    <div className={className}>
      {state.kind === "sent" ? (
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="text-foreground">
              Confirmation link sent to <span className="font-medium">{state.email}</span>.
            </p>
            <p className="text-xs text-muted-foreground">
              It expires shortly, and sending a new one invalidates any older link. Check spam if it
              doesn't arrive within a couple of minutes.
            </p>
          </div>
        </div>
      ) : null}

      {state.kind === "error" ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          {state.message}
        </p>
      ) : null}

      <div className="mt-3 space-y-2">
        {editable ? (
          <div className="space-y-1.5">
            <Label htmlFor="resend-email" className="text-xs text-muted-foreground">
              Email address
            </Label>
            <Input
              id="resend-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={send}
          disabled={busy || cooldown > 0}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {cooldown > 0
            ? `Resend available in ${cooldown}s`
            : state.kind === "sent"
              ? "Send another link"
              : "Resend confirmation email"}
        </Button>
      </div>
    </div>
  );
}