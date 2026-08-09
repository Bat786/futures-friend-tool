export type BrokerAccountDTO = {
  id: number;
  name: string;
  balance: number | null;
  canTrade: boolean;
  simulated: boolean;
};

export type BrokerPositionDTO = {
  id: number | null;
  contractId: string;
  type: number | null;
  size: number;
  averagePrice: number | null;
  creationTimestamp: string | null;
};

export type BrokerOrderDTO = {
  id: number;
  contractId: string | null;
  status: number | null;
  type: number | null;
  side: number | null;
  size: number | null;
  limitPrice: number | null;
  stopPrice: number | null;
  creationTimestamp: string | null;
};

type Raw = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === "number" ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

export function toAccountDTO(raw: unknown): BrokerAccountDTO {
  const r = (raw ?? {}) as Raw;
  return {
    id: num(r["id"]) ?? 0,
    name: str(r["name"]) ?? "Account",
    balance: num(r["balance"]),
    canTrade: r["canTrade"] === true,
    simulated: r["simulated"] === true,
  };
}

export function toPositionDTO(raw: unknown): BrokerPositionDTO {
  const r = (raw ?? {}) as Raw;
  return {
    id: num(r["id"]),
    contractId: str(r["contractId"]) ?? "",
    type: num(r["type"]),
    size: num(r["size"]) ?? 0,
    averagePrice: num(r["averagePrice"]),
    creationTimestamp: str(r["creationTimestamp"]),
  };
}

export function toOrderDTO(raw: unknown): BrokerOrderDTO {
  const r = (raw ?? {}) as Raw;
  return {
    id: num(r["id"]) ?? 0,
    contractId: str(r["contractId"]),
    status: num(r["status"]),
    type: num(r["type"]),
    side: num(r["side"]),
    size: num(r["size"]),
    limitPrice: num(r["limitPrice"]),
    stopPrice: num(r["stopPrice"]),
    creationTimestamp: str(r["creationTimestamp"]),
  };
}