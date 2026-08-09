import {
  closeContract as closeContractRaw,
  placeOrder as placeOrderRaw,
  searchAccounts as searchAccountsRaw,
  searchContracts,
  searchOrders as searchOrdersRaw,
  searchPositions as searchPositionsRaw,
  retrieveBars,
  timeframeToUnit,
  type BrokerConfig,
} from "./topstepx-browser";
import {
  toAccountDTO,
  toOrderDTO,
  toPositionDTO,
  type BrokerAccountDTO,
  type BrokerOrderDTO,
  type BrokerPositionDTO,
} from "./broker-types";
import { instrumentBySymbol, simulateBars, timeframeSeconds, type Bar, type Timeframe } from "./market";

export type BarsResult = {
  bars: Bar[];
  source: "live" | "simulated";
  error: string | null;
};

const TTL_MS = 6 * 3600_000;
const contractCache = new Map<string, { contractId: string; expiresAt: number }>();

/** Month codes in calendar order — used to pick the nearest listed expiry. */
const MONTH_CODES = "FGHJKMNQUVXZ";

function expiryRank(id: string): number {
  // Contract ids look like CON.F.US.MES.Z25 — trailing month code + 2-digit year.
  const tail = id.slice(-3);
  const month = MONTH_CODES.indexOf(tail[0] ?? "");
  const year = Number(tail.slice(1));
  if (month < 0 || Number.isNaN(year)) return Number.MAX_SAFE_INTEGER;
  return year * 12 + month;
}

function pickFrontMonth(root: string, contracts: { id?: string; activeContract?: boolean }[]): string | null {
  const now = new Date();
  const currentRank = (now.getFullYear() % 100) * 12 + now.getMonth();
  const candidates = contracts
    .filter((c) => typeof c.id === "string" && c.id.includes(`.${root}.`))
    .filter((c) => c.activeContract !== false)
    .map((c) => ({ id: c.id!, rank: expiryRank(c.id!) }))
    .filter((c) => c.rank >= currentRank)
    .sort((a, b) => a.rank - b.rank);
  return candidates[0]?.id ?? null;
}

/**
 * Resolves a symbol (MES, NQ, ...) to the live front-month contract id.
 * Falls back to the hardcoded id when credentials are absent or lookup fails,
 * so charting and simulation keep working offline.
 */
export async function resolveContractId(symbol: string, config: BrokerConfig | null): Promise<string> {
  const inst = instrumentBySymbol(symbol);
  if (!config) return inst.contractId;

  // Cache per gateway, so demo and live ids never bleed into each other.
  const cacheKey = `${config.baseUrl}|${inst.root}`;
  const cached = contractCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.contractId;

  try {
    const res = await searchContracts(config, inst.root);
    const id = pickFrontMonth(inst.root, res.contracts ?? []);
    if (!id) return inst.contractId;
    contractCache.set(cacheKey, { contractId: id, expiresAt: Date.now() + TTL_MS });
    return id;
  } catch {
    return inst.contractId;
  }
}

/**
 * Single place where ProjectX's t/o/h/l/c/v bar shape is mapped onto ours.
 * Falls back to deterministic simulated bars when credentials are absent or
 * the gateway is unreachable, so the signal path is always testable.
 */
export async function fetchBars(
  symbol: string,
  timeframe: Timeframe,
  count: number,
  config: BrokerConfig | null,
): Promise<BarsResult> {
  if (!config) return { bars: simulateBars(symbol, timeframe, count), source: "simulated", error: null };

  try {
    const contractId = await resolveContractId(symbol, config);
    const { unit, unitNumber } = timeframeToUnit(timeframe);
    const end = new Date();
    const start = new Date(end.getTime() - timeframeSeconds(timeframe) * 1000 * count * 3);
    const res = await retrieveBars(config, {
      contractId,
      unit,
      unitNumber,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      limit: count,
    });
    const bars: Bar[] = (res.bars ?? [])
      .map((b) => ({
        time: Math.floor(new Date(b.t).getTime() / 1000),
        open: b.o,
        high: b.h,
        low: b.l,
        close: b.c,
        volume: b.v,
      }))
      .sort((a, b) => a.time - b.time);
    if (bars.length) return { bars, source: "live", error: null };
    return { bars: simulateBars(symbol, timeframe, count), source: "simulated", error: "Gateway returned no bars" };
  } catch (error) {
    return {
      bars: simulateBars(symbol, timeframe, count),
      source: "simulated",
      error: error instanceof Error ? error.message : "Broker data unavailable",
    };
  }
}

export async function searchAccounts(config: BrokerConfig, onlyActive = true): Promise<{ accounts: BrokerAccountDTO[] }> {
  const res = await searchAccountsRaw(config, onlyActive);
  return { accounts: (res.accounts ?? []).map(toAccountDTO) };
}

export async function searchPositions(
  config: BrokerConfig,
  accountId: number,
): Promise<{ positions: BrokerPositionDTO[] }> {
  const res = await searchPositionsRaw(config, accountId);
  return { positions: (res.positions ?? []).map(toPositionDTO) };
}

export async function searchRecentOrders(
  config: BrokerConfig,
  accountId: number,
): Promise<{ orders: BrokerOrderDTO[] }> {
  const since = new Date(Date.now() - 7 * 86400_000).toISOString();
  const res = await searchOrdersRaw(config, accountId, since);
  return { orders: (res.orders ?? []).map(toOrderDTO) };
}

export async function placeOrder(
  config: BrokerConfig,
  params: {
    accountId: number;
    contractId: string;
    type: number;
    side: number;
    size: number;
    limitPrice?: number | null;
    stopPrice?: number | null;
    customTag?: string | null;
    stopLossBracket?: { ticks: number; type: number } | null;
    takeProfitBracket?: { ticks: number; type: number } | null;
  },
): Promise<{ orderId?: number; success: boolean; errorMessage?: string }> {
  return placeOrderRaw(config, params);
}

/** Kill switch: flatten every open position and cancel every working order. */
export async function flattenAll(
  config: BrokerConfig,
  accountId: number,
): Promise<{ ok: boolean; reason: string | null; flattened: number; cancelled: number }> {
  let flattened = 0;
  let cancelled = 0;
  const errors: string[] = [];

  try {
    const positions = (await searchPositionsRaw(config, accountId)).positions ?? [];
    for (const raw of positions) {
      const contractId = (raw as { contractId?: string }).contractId;
      if (!contractId) continue;
      const res = await closeContractRaw(config, accountId, contractId);
      if (res.success === false) errors.push(res.errorMessage ?? `Could not flatten ${contractId}`);
      else flattened++;
    }

    const since = new Date(Date.now() - 2 * 86400_000).toISOString();
    const orders = (await searchOrdersRaw(config, accountId, since)).orders ?? [];
    for (const raw of orders) {
      const order = raw as { id?: number; status?: number };
      // Status 1 = working / open on the ProjectX gateway.
      if (order.id && order.status === 1) {
        const res = await cancelOrderRaw(config, accountId, order.id);
        if (res.success === false) errors.push(res.errorMessage ?? `Could not cancel order ${order.id}`);
        else cancelled++;
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Kill switch failed");
  }

  return {
    ok: errors.length === 0,
    reason: errors.join(" · ") || null,
    flattened,
    cancelled,
  };
}

export const __test = { pickFrontMonth, expiryRank };
