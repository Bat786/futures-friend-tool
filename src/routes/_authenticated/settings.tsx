import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getRiskState, updateRiskSettings } from "@/lib/journal.functions";
import { getBrokerStatus } from "@/lib/broker.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — risk limits and kill switch" },
      {
        name: "description",
        content:
          "Set your daily loss limit, max trades per day, loss-streak cap, position size ceiling and default bracket ticks.",
      },
      { property: "og:title", content: "Settings — risk limits and kill switch" },
      {
        property: "og:description",
        content: "Tune the guardrails that every order must pass before it reaches the broker.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const risk = useQuery({ queryKey: ["risk-state"], queryFn: () => getRiskState() });
  const broker = useQuery({ queryKey: ["broker-status"], queryFn: () => getBrokerStatus() });

  const [form, setForm] = useState({
    daily_loss_limit: 500,
    max_trades_per_day: 10,
    max_consecutive_losses: 3,
    max_position_size: 2,
    default_stop_ticks: 20,
    default_target_ticks: 40,
    kill_switch_armed: false,
    weight_rsi: 1,
    weight_vwap: 1,
    weight_macd: 1,
    weight_momentum: 1,
  });

  useEffect(() => {
    if (!risk.data) return;
    setForm({
      daily_loss_limit: risk.data.limits.dailyLossLimit,
      max_trades_per_day: risk.data.limits.maxTradesPerDay,
      max_consecutive_losses: risk.data.limits.maxConsecutiveLosses,
      max_position_size: risk.data.limits.maxPositionSize,
      default_stop_ticks: risk.data.defaults.defaultStopTicks,
      default_target_ticks: risk.data.defaults.defaultTargetTicks,
      kill_switch_armed: risk.data.limits.killSwitchArmed,
      weight_rsi: risk.data.weights.rsi,
      weight_vwap: risk.data.weights.vwap,
      weight_macd: risk.data.weights.macd,
      weight_momentum: risk.data.weights.momentum,
    });
  }, [risk.data]);

  const save = useMutation({
    mutationFn: () => updateRiskSettings({ data: form }),
    onSuccess: () => {
      toast.success("Risk settings saved");
      void qc.invalidateQueries({ queryKey: ["risk-state"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const num = (key: keyof typeof form) => ({
    value: String(form[key]),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: Number(e.target.value) }),
  });

  return (
    <AppShell>
      <div className="mb-5">
        <p className="eyebrow">Settings</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Your limits are enforced on the server, not just in the browser.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="panel">
          <CardHeader>
            <CardTitle className="font-display text-base">Risk limits</CardTitle>
            <CardDescription>Keep these at or inside your Topstep account rules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dll">Daily loss limit ($)</Label>
                <Input id="dll" type="number" {...num("daily_loss_limit")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt">Max trades per day</Label>
                <Input id="mt" type="number" {...num("max_trades_per_day")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mcl">Max consecutive losses</Label>
                <Input id="mcl" type="number" {...num("max_consecutive_losses")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mps">Max position size</Label>
                <Input id="mps" type="number" {...num("max_position_size")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dst">Default stop (ticks)</Label>
                <Input id="dst" type="number" {...num("default_stop_ticks")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dtt">Default target (ticks)</Label>
                <Input id="dtt" type="number" {...num("default_target_ticks")} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3">
              <div>
                <div className="text-sm font-medium">Kill switch armed</div>
                <div className="text-xs text-muted-foreground">Blocks every new order until you disarm it.</div>
              </div>
              <Switch
                checked={form.kill_switch_armed}
                onCheckedChange={(v) => setForm({ ...form, kill_switch_armed: v })}
              />
            </div>

            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
              Save risk settings
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="panel">
            <CardHeader>
              <CardTitle className="font-display text-base">Signal weights</CardTitle>
              <CardDescription>
                How much each indicator's vote counts toward the composite gauge. Set a weight to 0 to mute it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {(
                [
                  ["weight_rsi", "RSI"],
                  ["weight_vwap", "VWAP"],
                  ["weight_macd", "MACD"],
                  ["weight_momentum", "Momentum"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="etch-label">{label}</Label>
                    <span className="tabular text-xs text-primary">{form[key].toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[form[key]]}
                    min={0}
                    max={3}
                    step={0.1}
                    onValueChange={([v]) => setForm({ ...form, [key]: v ?? 0 })}
                  />
                </div>
              ))}
              <Button onClick={() => save.mutate()} disabled={save.isPending} variant="outline" className="w-full">
                Save weights
              </Button>
            </CardContent>
          </Card>

          <Card className="panel">
            <CardHeader>
              <CardTitle className="font-display text-base">Broker connection</CardTitle>
              <CardDescription>TopstepX / ProjectX gateway.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Status" value={broker.data?.configured ? "Connected" : "Not configured"} />
              <Row label="Environment" value={broker.data?.demo ? "Demo / evaluation" : "Live"} />
              <Row label="Gateway" value={broker.data?.baseUrl ?? "—"} />
              <p className="pt-2 text-xs text-muted-foreground">
                Credentials are stored as server-side secrets and are never sent to the browser. Ask me to add them and
                I'll open a secure form.
              </p>
            </CardContent>
          </Card>

          <Card className="panel">
            <CardHeader>
              <CardTitle className="font-display text-base">Account</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={signOut} className="w-full">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-1.5 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className="tabular text-xs">{value}</span>
    </div>
  );
}