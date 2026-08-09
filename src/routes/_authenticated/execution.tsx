import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getAccounts, getPositions, submitOrder, flattenAll, getBrokerStatus } from "@/lib/broker.functions";
import { getRiskState } from "@/lib/journal.functions";
import { INSTRUMENTS } from "@/lib/market";
import { ORDER_TYPE_LABELS, OrderSide, OrderType } from "@/lib/broker-enums";
import { checkPreTrade, DEFAULT_LIMITS, type DailyState } from "@/lib/risk";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/execution")({
  head: () => ({
    meta: [
      { title: "Execution — supervised order ticket and risk gate" },
      {
        name: "description",
        content:
          "Place supervised futures orders with pre-trade risk checks, bracket stops and a one-click flatten-all kill switch.",
      },
      { property: "og:title", content: "Execution — supervised order ticket and risk gate" },
      {
        property: "og:description",
        content: "Every order passes your daily loss, trade count and position size limits first.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExecutionPage,
});

function ExecutionPage() {
  const qc = useQueryClient();
  const [symbol, setSymbol] = useState("ES");
  const [orderType, setOrderType] = useState<number>(OrderType.MARKET);
  const [side, setSide] = useState<number>(OrderSide.BUY);
  const [size, setSize] = useState(1);
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  // "Supervised" means the trader is actually watching this tab — Topstep
  // prohibits unattended automation, so we drop the arm state when hidden.
  const [supervised, setSupervised] = useState(true);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) setSupervised(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const status = useQuery({ queryKey: ["broker-status"], queryFn: () => getBrokerStatus() });
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => getAccounts() });
  const risk = useQuery({ queryKey: ["risk-state"], queryFn: () => getRiskState(), refetchInterval: 60_000 });

  const numericAccountId = Number(accountId);
  const positions = useQuery({
    queryKey: ["positions", numericAccountId],
    queryFn: () => getPositions({ data: { accountId: numericAccountId } }),
    enabled: Number.isFinite(numericAccountId) && numericAccountId > 0,
    refetchInterval: 15_000,
  });

  const limits = risk.data?.limits ?? DEFAULT_LIMITS;
  const state: DailyState = risk.data?.state ?? {
    tradingDate: new Date().toISOString().slice(0, 10),
    realizedPnl: 0,
    tradesCount: 0,
    consecutiveLosses: 0,
  };
  const gate = checkPreTrade(limits, state, size, supervised);

  const place = useMutation({
    mutationFn: () =>
      submitOrder({
        data: {
          accountId: numericAccountId,
          symbol,
          type: orderType,
          side,
          size,
          limitPrice: limitPrice ? Number(limitPrice) : null,
          stopPrice: stopPrice ? Number(stopPrice) : null,
          stopLossTicks: risk.data?.defaults.defaultStopTicks ?? 20,
          takeProfitTicks: risk.data?.defaults.defaultTargetTicks ?? 40,
          supervised,
          customTag: null,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.reason ?? "Order rejected");
        return;
      }
      toast.success(`Order sent${res.orderId ? ` · #${res.orderId}` : ""}`);
      void qc.invalidateQueries({ queryKey: ["positions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const flatten = useMutation({
    mutationFn: () => flattenAll({ data: { accountId: numericAccountId } }),
    onSuccess: (res) => {
      if (!res.ok) toast.error(res.reason ?? "Kill switch hit an error");
      else toast.success(`Flattened ${res.flattened} position(s), cancelled ${res.cancelled} order(s)`);
      void qc.invalidateQueries({ queryKey: ["positions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Supervised order entry</p>
          <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
            Nothing is sent without a click that passes your risk gate.
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[10px] tracking-[0.16em]",
            supervised
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-warning/40 bg-warning/10 text-warning",
          )}
        >
          {supervised ? "SUPERVISED" : "UNATTENDED"}
        </Badge>
      </div>

      {status.data && !status.data.configured && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>Broker credentials are not configured — orders will be rejected until you add them.</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="panel">
          <CardHeader>
            <CardTitle className="font-display text-base">Order ticket</CardTitle>
            <CardDescription>Brackets use your default stop/target ticks from settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder={accounts.data?.accounts.length ? "Select account" : "No accounts found"} />
                </SelectTrigger>
                <SelectContent>
                  {(accounts.data?.accounts ?? []).map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                      {a.balance === null ? "" : ` · $${a.balance.toLocaleString()}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Instrument</Label>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENTS.map((i) => (
                      <SelectItem key={i.symbol} value={i.symbol}>
                        {i.symbol} — {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Order type</Label>
                <Select value={String(orderType)} onValueChange={(v) => setOrderType(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_TYPE_LABELS.map((t) => (
                      <SelectItem key={t.value} value={String(t.value)}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="size">Size (contracts)</Label>
                <Input
                  id="size"
                  type="number"
                  min={1}
                  max={limits.maxPositionSize}
                  value={size}
                  onChange={(e) => setSize(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={side === OrderSide.BUY ? "default" : "outline"}
                    className={cn("flex-1", side === OrderSide.BUY && "bg-profit text-background hover:bg-profit/90")}
                    onClick={() => setSide(OrderSide.BUY)}
                  >
                    Buy
                  </Button>
                  <Button
                    type="button"
                    variant={side === OrderSide.SELL ? "default" : "outline"}
                    className={cn("flex-1", side === OrderSide.SELL && "bg-loss text-background hover:bg-loss/90")}
                    onClick={() => setSide(OrderSide.SELL)}
                  >
                    Sell
                  </Button>
                </div>
              </div>
            </div>

            {orderType === OrderType.LIMIT && (
              <div className="space-y-2">
                <Label htmlFor="limit">Limit price</Label>
                <Input id="limit" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} />
              </div>
            )}
            {(orderType === OrderType.STOP || orderType === OrderType.TRAILING_STOP) && (
              <div className="space-y-2">
                <Label htmlFor="stop">Stop price</Label>
                <Input id="stop" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} />
              </div>
            )}

            <Separator />

            <div
              className={cn(
                "flex items-start gap-2 rounded-md border px-3 py-2 text-sm",
                gate.allowed ? "border-profit/40 bg-profit/10 text-profit" : "border-loss/40 bg-loss/10 text-loss",
              )}
            >
              {gate.allowed ? (
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              ) : (
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
              )}
              <span>{gate.allowed ? "Risk gate clear — order may be sent." : gate.reason}</span>
            </div>

            {!supervised && (
              <Button variant="outline" className="w-full" onClick={() => setSupervised(true)}>
                Re-arm supervised session
              </Button>
            )}

            <Button
              className="w-full"
              disabled={!gate.allowed || !accountId || place.isPending}
              onClick={() => place.mutate()}
            >
              <Zap className="size-4" />
              Send {side === OrderSide.BUY ? "buy" : "sell"} {size} {symbol}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="panel">
            <CardHeader>
              <CardTitle className="font-display text-base">Today's risk state</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <Stat
                label="Realized P&L"
                value={`$${state.realizedPnl.toFixed(2)}`}
                tone={state.realizedPnl >= 0 ? "profit" : "loss"}
              />
              <Stat label="Loss limit" value={`$${limits.dailyLossLimit.toFixed(0)}`} />
              <Stat label="Trades" value={`${state.tradesCount} / ${limits.maxTradesPerDay}`} />
              <Stat label="Loss streak" value={`${state.consecutiveLosses} / ${limits.maxConsecutiveLosses}`} />
            </CardContent>
          </Card>

          <Card className="panel border-destructive/25">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="font-display text-base">Open positions</CardTitle>
              <Badge variant="outline" className="tabular text-xs">
                {positions.data?.positions.length ?? 0}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {(positions.data?.positions ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No open positions on this account.</p>
              ) : (
                (positions.data?.positions ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                  >
                    <span className="tabular">{p.contractId}</span>
                    <span className="tabular text-muted-foreground">
                      {p.size} @ {p.averagePrice}
                    </span>
                  </div>
                ))
              )}
              <Separator />
              <p className="text-xs text-muted-foreground">
                Kill switch — closes every open position and cancels every working order on this account.
              </p>
              <Button
                variant="destructive"
                className="w-full"
                disabled={!accountId || flatten.isPending}
                onClick={() => flatten.mutate()}
              >
                Flatten everything now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "profit" | "loss" }) {
  return (
    <div className="rounded-md border border-border bg-muted/25 px-3 py-2.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "tabular mt-1 text-lg",
          tone === "profit" && "text-profit",
          tone === "loss" && "text-loss",
        )}
      >
        {value}
      </div>
    </div>
  );
}