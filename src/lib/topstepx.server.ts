/**
 * Minimal TopstepX (ProjectX Gateway) REST client.
 *
 * Credentials are read from the server environment inside each call, never at
 * module scope and never in the browser. Base URL defaults to the demo gateway
 * — switching to the live path is a deliberate change, because live orders are
 * final and Topstep does not offer coding support.
 */

const DEMO_BASE = "https://gateway-api-demo.s2f.projectx.com/api";

export type BrokerConfig = { username: string; apiKey: string; baseUrl: string };

export function readConfig(): BrokerConfig | null {
  const username = process.env["TOPSTEPX_USERNAME"];
  const apiKey = process.env["TOPSTEPX_API_KEY"];
  if (!username || !apiKey) return null;
  return { username, apiKey, baseUrl: process.env["TOPSTEPX_BASE_URL"] ?? DEMO_BASE };
}

export function isDemo(cfg: BrokerConfig): boolean {
  return cfg.baseUrl.includes("demo");
}

type CachedToken = { token: string; expiresAt: number };
const tokenCache = new Map<string, CachedToken>();

async function request<T>(
  cfg: BrokerConfig,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown; token?: string },
  attempt = 0,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    accept: "text/plain",
  };
  if (init.token) headers["Authorization"] = `Bearer ${init.token}`;

  const requestInit: RequestInit = { method: init.method, headers };
  if (init.body !== undefined) requestInit.body = JSON.stringify(init.body);
  const res = await fetch(`${cfg.baseUrl}${path}`, requestInit);

  // Rate limited or transient upstream failure — back off and retry a few times.
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    return request<T>(cfg, path, init, attempt + 1);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TopstepX ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export async function getToken(cfg: BrokerConfig): Promise<string> {
  const cached = tokenCache.get(cfg.username);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const data = await request<{ token?: string; errorMessage?: string; success?: boolean }>(
    cfg,
    "/Auth/loginKey",
    { method: "POST", body: { userName: cfg.username, apiKey: cfg.apiKey } },
  );
  if (!data.token) throw new Error(data.errorMessage ?? "TopstepX authentication failed");
  // Session tokens are valid for 24h; refresh well before that.
  tokenCache.set(cfg.username, { token: data.token, expiresAt: Date.now() + 12 * 3600_000 });
  return data.token;
}

export async function searchAccounts(cfg: BrokerConfig, onlyActive = true) {
  const token = await getToken(cfg);
  return request<{ accounts?: unknown[] }>(cfg, "/Account/search", {
    method: "POST",
    token,
    body: { onlyActiveAccounts: onlyActive },
  });
}

export async function searchPositions(cfg: BrokerConfig, accountId: number) {
  const token = await getToken(cfg);
  return request<{ positions?: unknown[] }>(cfg, "/Position/searchOpen", {
    method: "POST",
    token,
    body: { accountId },
  });
}

export async function searchOrders(cfg: BrokerConfig, accountId: number, startTimestamp: string) {
  const token = await getToken(cfg);
  return request<{ orders?: unknown[] }>(cfg, "/Order/search", {
    method: "POST",
    token,
    body: { accountId, startTimestamp },
  });
}

export type BracketSpec = { ticks: number; type: number };

export async function placeOrder(
  cfg: BrokerConfig,
  params: {
    accountId: number;
    contractId: string;
    type: number;
    side: number;
    size: number;
    limitPrice?: number | null;
    stopPrice?: number | null;
    customTag?: string | null;
    stopLossBracket?: BracketSpec | null;
    takeProfitBracket?: BracketSpec | null;
  },
) {
  const token = await getToken(cfg);
  return request<{ orderId?: number; success?: boolean; errorMessage?: string }>(
    cfg,
    "/Order/place",
    { method: "POST", token, body: params },
  );
}

export async function cancelOrder(cfg: BrokerConfig, accountId: number, orderId: number) {
  const token = await getToken(cfg);
  return request<{ success?: boolean; errorMessage?: string }>(cfg, "/Order/cancel", {
    method: "POST",
    token,
    body: { accountId, orderId },
  });
}

export async function modifyOrder(
  cfg: BrokerConfig,
  params: { accountId: number; orderId: number; size?: number; limitPrice?: number; stopPrice?: number },
) {
  const token = await getToken(cfg);
  return request<{ success?: boolean; errorMessage?: string }>(cfg, "/Order/modify", {
    method: "POST",
    token,
    body: params,
  });
}

/** The kill-switch endpoint: flattens an open position at market. */
export async function closeContract(cfg: BrokerConfig, accountId: number, contractId: string) {
  const token = await getToken(cfg);
  return request<{ success?: boolean; errorMessage?: string }>(cfg, "/Position/closeContract", {
    method: "POST",
    token,
    body: { accountId, contractId },
  });
}

export async function retrieveBars(
  cfg: BrokerConfig,
  params: {
    contractId: string;
    unit: number;
    unitNumber: number;
    startTime: string;
    endTime: string;
    limit: number;
  },
) {
  const token = await getToken(cfg);
  return request<{ bars?: { t: string; o: number; h: number; l: number; c: number; v: number }[] }>(
    cfg,
    "/History/retrieveBars",
    {
      method: "POST",
      token,
      body: { ...params, live: false, includePartialBar: false },
    },
  );
}

/** Maps our timeframe strings onto the ProjectX unit / unitNumber pair. */
export function timeframeToUnit(tf: string): { unit: number; unitNumber: number } {
  switch (tf) {
    case "1m":
      return { unit: 2, unitNumber: 1 };
    case "5m":
      return { unit: 2, unitNumber: 5 };
    case "15m":
      return { unit: 2, unitNumber: 15 };
    case "1h":
      return { unit: 3, unitNumber: 1 };
    case "1d":
      return { unit: 4, unitNumber: 1 };
    default:
      return { unit: 2, unitNumber: 5 };
  }
}