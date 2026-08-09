import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteTrade, listTrades, saveTrade } from "@/lib/journal.functions";
import { INSTRUMENTS } from "@/lib/market";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({
    meta: [
      { title: "Trade journal — log entries, exits and setups" },
      {
        name: "description",
        content:
          "Record every futures trade with entry, exit, stop, setup tag and notes. P&L and R multiple are calculated for you.",
      },
      { property: "og:title", content: "Trade journal — log entries, exits and setups" },
      {
        property: "og:description",
        content: "A private, per-account journal of every futures trade you take.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JournalPage,
});

const emptyForm = {
  symbol: "ES",
  side: "buy" as "buy" | "sell",
  size: "1",
  entry_price: "",
  exit_price: "",
  entry_time: new Date().toISOString().slice(0, 16),
  exit_time: "",
  fees: "0",
  stop_price: "",
  target_price: "",
  setup_tag: "",
  notes: "",
};

function JournalPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const trades = useQuery({ queryKey: ["trades"], queryFn: () => listTrades() });

  const save = useMutation({
    mutationFn: () => {
      const num = (v: string) => (v.trim() === "" ? null : Number(v));
      return saveTrade({
        data: {
          symbol: form.symbol,
          side: form.side,
          size: Number(form.size) || 1,
          entry_price: num(form.entry_price),
          exit_price: num(form.exit_price),
          entry_time: new Date(form.entry_time).toISOString(),
          exit_time: form.exit_time ? new Date(form.exit_time).toISOString() : null,
          fees: Number(form.fees) || 0,
          stop_price: num(form.stop_price),
          target_price: num(form.target_price),
          setup_tag: form.setup_tag || null,
          notes: form.notes || null,
          is_backtest: false,
        },
      });
    },
    onSuccess: () => {
      toast.success("Trade saved");
      setOpen(false);
      setForm(emptyForm);
      void qc.invalidateQueries({ queryKey: ["trades"] });
      void qc.invalidateQueries({ queryKey: ["risk-state"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteTrade({ data: { id } }),
    onSuccess: () => {
      toast.success("Trade deleted");
      void qc.invalidateQueries({ queryKey: ["trades"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = trades.data?.trades ?? [];

  return (
    <AppShell>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Trade journal</p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <span className="tabular text-foreground">{rows.length}</span> trades logged
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Log trade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Log a trade</DialogTitle>
              <DialogDescription>
                Leave the exit blank to track an open trade — P&L is computed once you fill it in.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Instrument</Label>
                <Select value={form.symbol} onValueChange={(v) => setForm({ ...form, symbol: v })}>
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
                <Label>Side</Label>
                <Select value={form.side} onValueChange={(v) => setForm({ ...form, side: v as "buy" | "sell" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Field label="Size" value={form.size} onChange={(v) => setForm({ ...form, size: v })} type="number" />
              <Field label="Fees" value={form.fees} onChange={(v) => setForm({ ...form, fees: v })} type="number" />
              <Field
                label="Entry price"
                value={form.entry_price}
                onChange={(v) => setForm({ ...form, entry_price: v })}
                type="number"
              />
              <Field
                label="Exit price"
                value={form.exit_price}
                onChange={(v) => setForm({ ...form, exit_price: v })}
                type="number"
              />
              <Field
                label="Entry time"
                value={form.entry_time}
                onChange={(v) => setForm({ ...form, entry_time: v })}
                type="datetime-local"
              />
              <Field
                label="Exit time"
                value={form.exit_time}
                onChange={(v) => setForm({ ...form, exit_time: v })}
                type="datetime-local"
              />
              <Field
                label="Stop price"
                value={form.stop_price}
                onChange={(v) => setForm({ ...form, stop_price: v })}
                type="number"
              />
              <Field
                label="Target price"
                value={form.target_price}
                onChange={(v) => setForm({ ...form, target_price: v })}
                type="number"
              />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="setup">Setup tag</Label>
                <Input
                  id="setup"
                  placeholder="vwap-reclaim, orb-break…"
                  value={form.setup_tag}
                  onChange={(e) => setForm({ ...form, setup_tag: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>

            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save trade
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="panel">
        <CardHeader>
          <CardTitle className="font-display text-base">All trades</CardTitle>
          <CardDescription>Newest first. P&L and R multiple are derived from your entry, exit and stop.</CardDescription>
        </CardHeader>
        <CardContent>
          {trades.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No trades yet — log your first one to start building analytics.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="[&_th]:font-mono [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-[0.16em]">
                    <TableHead>Symbol</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead className="text-right">Size</TableHead>
                    <TableHead className="text-right">Entry</TableHead>
                    <TableHead className="text-right">Exit</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead className="text-right">R</TableHead>
                    <TableHead>Setup</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id} className="transition-colors hover:bg-muted/40">
                      <TableCell className="tabular font-medium">{t.symbol}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono text-[10px] uppercase tracking-[0.12em]",
                            t.side === "buy"
                              ? "border-profit/40 bg-profit/10 text-profit"
                              : "border-loss/40 bg-loss/10 text-loss",
                          )}
                        >
                          {t.side}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular text-right">{t.size}</TableCell>
                      <TableCell className="tabular text-right">{t.entry_price ?? "—"}</TableCell>
                      <TableCell className="tabular text-right">{t.exit_price ?? "—"}</TableCell>
                      <TableCell
                        className={cn(
                          "tabular text-right font-medium",
                          t.pnl !== null && (Number(t.pnl) >= 0 ? "text-profit" : "text-loss"),
                        )}
                      >
                        {t.pnl === null ? "—" : `$${Number(t.pnl).toFixed(2)}`}
                      </TableCell>
                      <TableCell className="tabular text-right">
                        {t.pnl_r_multiple === null ? "—" : Number(t.pnl_r_multiple).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{t.setup_tag ?? "untagged"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${t.symbol} trade`}
                          onClick={() => remove.mutate(t.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}