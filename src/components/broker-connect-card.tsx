import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plug, PlugZap, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  disconnectBroker,
  getBrokerConnection,
  saveBrokerConnection,
  testBrokerConnection,
} from "@/lib/broker-credentials.functions";

type Env = "demo" | "live";

export function BrokerConnectCard() {
  const qc = useQueryClient();
  const conn = useQuery({ queryKey: ["broker-connection"], queryFn: () => getBrokerConnection() });

  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState<Env>("demo");
  const [liveConfirm, setLiveConfirm] = useState("");
  const [accounts, setAccounts] = useState<{ id: number; name: string; balance: number | null; canTrade: boolean }[]>([]);

  useEffect(() => {
    if (!conn.data?.configured) return;
    setUsername(conn.data.username ?? "");
    setEnvironment(conn.data.environment);
  }, [conn.data]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["broker-connection"] });
    void qc.invalidateQueries({ queryKey: ["broker-status"] });
    void qc.invalidateQueries({ queryKey: ["accounts"] });
    void qc.invalidateQueries({ queryKey: ["bars"] });
  };

  const save = useMutation({
    mutationFn: () => saveBrokerConnection({ data: { username: username.trim(), apiKey: apiKey.trim(), environment } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.reason);
        return;
      }
      setApiKey("");
      setLiveConfirm("");
      toast.success("TopstepX account connected");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () => testBrokerConnection(),
    onSuccess: (res) => {
      setAccounts(res.accounts as typeof accounts);
      if (!res.ok) {
        toast.error(res.reason ?? "Connection test failed");
        return;
      }
      toast.success(`${res.accounts.length} account${res.accounts.length === 1 ? "" : "s"} found`);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: () => disconnectBroker(),
    onSuccess: () => {
      setApiKey("");
      setAccounts([]);
      toast.success("Disconnected");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const liveBlocked = environment === "live" && liveConfirm.trim().toUpperCase() !== "LIVE";
  const canSave = username.trim().length > 0 && apiKey.trim().length >= 8 && !liveBlocked;
  const configured = conn.data?.configured ?? false;

  return (
    <Card className="panel">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-base">
          {configured ? <PlugZap className="size-4 text-primary" /> : <Plug className="size-4" />}
          Broker connection
        </CardTitle>
        <CardDescription>Connect your own TopstepX / ProjectX account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          <Row label="Status" value={configured ? "Connected" : "Not connected"} />
          <Row label="Environment" value={conn.data?.environment === "live" ? "Live" : "Demo / evaluation"} />
          <Row label="Gateway" value={conn.data?.gateway ?? "—"} />
          <Row
            label="Last verified"
            value={conn.data?.lastVerifiedAt ? new Date(conn.data.lastVerifiedAt).toLocaleString() : "—"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tsx-user">TopstepX username</Label>
          <Input
            id="tsx-user"
            autoComplete="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="your TopstepX login"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tsx-key">API key</Label>
          <Input
            id="tsx-key"
            type="password"
            autoComplete="new-password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={configured ? "•••••••• (saved — enter a new key to replace)" : "paste your API key"}
          />
          <p className="text-xs text-muted-foreground">
            Generate a key in TopstepX under Settings, API Keys. It's encrypted on the server and never sent back to
            the browser.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Environment</Label>
          <Select value={environment} onValueChange={(v) => setEnvironment(v as Env)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="demo">Demo / evaluation</SelectItem>
              <SelectItem value="live">Live — real money</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {environment === "live" && (
          <div className="space-y-2 border border-loss/50 bg-loss/10 p-3">
            <p className="flex items-center gap-2 text-xs text-foreground">
              <ShieldAlert className="size-3.5 text-loss" />
              Live orders are final. Type LIVE to confirm.
            </p>
            <Input value={liveConfirm} onChange={(e) => setLiveConfirm(e.target.value)} placeholder="LIVE" />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.mutate()} disabled={!canSave || save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            {configured ? "Update connection" : "Connect"}
          </Button>
          <Button variant="outline" onClick={() => test.mutate()} disabled={!configured || test.isPending}>
            {test.isPending && <Loader2 className="size-4 animate-spin" />}
            Test connection
          </Button>
          <Button variant="outline" onClick={() => disconnect.mutate()} disabled={!configured || disconnect.isPending}>
            Disconnect
          </Button>
        </div>

        {accounts.length > 0 && (
          <div className="space-y-1 border-t border-border/60 pt-3">
            <p className="eyebrow">Accounts</p>
            {accounts.map((a) => (
              <Row
                key={a.id}
                label={a.name}
                value={`${a.balance == null ? "—" : a.balance.toLocaleString(undefined, { style: "currency", currency: "USD" })} · ${a.canTrade ? "tradable" : "locked"}`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className="tabular truncate text-xs">{value}</span>
    </div>
  );
}
