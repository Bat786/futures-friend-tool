import { useEffect, useState } from "react";
import { Loader2, Plug, PlugZap, ShieldAlert, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBrokerVault, type Environment } from "@/lib/broker-vault";
import { searchAccounts } from "@/lib/broker-client";
import { toAccountDTO } from "@/lib/broker-types";

type Account = { id: number; name: string; balance: number | null; canTrade: boolean };

export function BrokerConnectCard() {
  const { config, status, save, clear, unlock } = useBrokerVault();
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [environment, setEnvironment] = useState<Environment>("demo");
  const [passphrase, setPassphrase] = useState("");
  const [liveConfirm, setLiveConfirm] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (config) {
      setUsername(config.username);
      setEnvironment(config.environment);
    }
  }, [config]);

  const configured = status?.configured ?? false;

  const handleSave = async () => {
    setBusy(true);
    try {
      const saved = await save(
        { username: username.trim(), apiKey: apiKey.trim(), environment },
        passphrase,
      );
      if (!saved) {
        toast.error("Could not save credentials");
        return;
      }
      setApiKey("");
      setPassphrase("");
      setLiveConfirm("");
      toast.success("TopstepX credentials saved locally");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      let cfg = config;
      if (!cfg && configured) {
        cfg = await unlock(passphrase);
        if (!cfg) {
          toast.error("Could not unlock vault — check passphrase");
          return;
        }
      }
      if (!cfg) {
        toast.error("Save credentials first");
        return;
      }
      const res = await searchAccounts(cfg);
      const mapped = res.accounts.map(toAccountDTO);
      setAccounts(mapped);
      toast.success(`${mapped.length} account${mapped.length === 1 ? "" : "s"} found`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Connection test failed");
      setAccounts([]);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = () => {
    clear();
    setUsername("");
    setApiKey("");
    setPassphrase("");
    setAccounts([]);
    toast.success("Local credentials removed");
  };

  const liveBlocked = environment === "live" && liveConfirm.trim().toUpperCase() !== "LIVE";
  const canSave =
    username.trim().length > 0 && apiKey.trim().length >= 8 && passphrase.length >= 8 && !liveBlocked;

  return (
    <Card className="panel">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 text-base">
          {configured ? <PlugZap className="size-4 text-primary" /> : <Plug className="size-4" />}
          Broker connection
        </CardTitle>
        <CardDescription>
          Your TopstepX API key stays encrypted in this browser. It never reaches the server.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          <Row label="Status" value={configured ? "Connected" : "Not connected"} />
          <Row
            label="Environment"
            value={
              config
                ? config.environment === "live"
                  ? "Live"
                  : "Demo"
                : status?.environment === "live"
                  ? "Live"
                  : "Demo"
            }
          />
          <Row label="Gateway" value={status?.gateway ?? "—"} />
          <Row
            label="Last verified"
            value={status?.lastVerifiedAt ? new Date(status.lastVerifiedAt).toLocaleString() : "—"}
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
            placeholder={
              configured ? "•••••••• (saved — enter a new key to replace)" : "paste your API key"
            }
          />
          <p className="text-xs text-muted-foreground">
            Generate a key in TopstepX under Settings, API Keys. It is encrypted locally and never
            sent to the server.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Environment</Label>
          <Select value={environment} onValueChange={(v) => setEnvironment(v as Environment)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="demo">Demo / evaluation</SelectItem>
              <SelectItem value="live">Live — real money</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="vault-pass">Unlock passphrase</Label>
          <Input
            id="vault-pass"
            type="password"
            autoComplete="new-password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="encrypts the key on this device"
          />
          <p className="text-xs text-muted-foreground">
            This passphrase encrypts your API key in browser storage. If you forget it, disconnect
            and reconnect.
          </p>
        </div>

        {environment === "live" && (
          <div className="space-y-2 border border-loss/50 bg-loss/10 p-3">
            <p className="flex items-center gap-2 text-xs text-foreground">
              <ShieldAlert className="size-3.5 text-loss" />
              Live orders are final. Type LIVE to confirm.
            </p>
            <Input
              value={liveConfirm}
              onChange={(e) => setLiveConfirm(e.target.value)}
              placeholder="LIVE"
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={!canSave || busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {configured ? "Update connection" : "Connect"}
          </Button>
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={(!configured && !config) || busy}
          >
            {busy && <Loader2 className="size-4 animate-spin" />}
            <Unlock className="mr-1.5 size-4" />
            Test connection
          </Button>
          <Button variant="outline" onClick={handleDisconnect} disabled={!configured || busy}>
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
                value={`${a.balance == null ? "—" : `$${a.balance.toLocaleString()}`} · ${a.canTrade ? "tradable" : "locked"}`}
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
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span className="tabular truncate text-xs">{value}</span>
    </div>
  );
}
