import { instrumentBySymbol } from "./market";
import { readConfig, searchContracts, type GatewayContract } from "./topstepx.server";

type Cached = { contractId: string; expiresAt: number };
const cache = new Map<string, Cached>();
const TTL_MS = 6 * 3600_000;

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

function pickFrontMonth(root: string, contracts: GatewayContract[]): string | null {
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
export async function resolveContractId(symbol: string): Promise<string> {
  const inst = instrumentBySymbol(symbol);
  const cached = cache.get(inst.root);
  if (cached && cached.expiresAt > Date.now()) return cached.contractId;

  const cfg = readConfig();
  if (!cfg) return inst.contractId;

  try {
    const res = await searchContracts(cfg, inst.root);
    const id = pickFrontMonth(inst.root, res.contracts ?? []);
    if (!id) return inst.contractId;
    cache.set(inst.root, { contractId: id, expiresAt: Date.now() + TTL_MS });
    return id;
  } catch {
    return inst.contractId;
  }
}

export const __test = { pickFrontMonth, expiryRank };
