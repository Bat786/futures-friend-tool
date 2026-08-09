import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { decryptSecret } from "./credential-crypto.server";
import { readConfig, type BrokerConfig } from "./topstepx.server";

export const DEMO_GATEWAY = "https://gateway-api-demo.s2f.projectx.com/api";
export const LIVE_GATEWAY = "https://api.topstepx.com/api";

export type Environment = "demo" | "live";

export function gatewayFor(environment: Environment): string {
  return environment === "live" ? LIVE_GATEWAY : DEMO_GATEWAY;
}

export type StoredConnection = {
  username: string;
  environment: Environment;
  lastVerifiedAt: string | null;
};

type Client = SupabaseClient<Database>;

async function readRow(supabase: Client, userId: string) {
  const { data } = await supabase
    .from("broker_accounts")
    .select("username, api_key_ciphertext, environment, last_verified_at")
    .eq("user_id", userId)
    .eq("broker", "topstepx")
    .maybeSingle();
  return data as
    | {
        username: string | null;
        api_key_ciphertext: string | null;
        environment: string | null;
        last_verified_at: string | null;
      }
    | null;
}

/** Non-sensitive view of the user's saved connection, for the settings UI. */
export async function readConnection(supabase: Client, userId: string): Promise<StoredConnection | null> {
  const row = await readRow(supabase, userId);
  if (!row?.username || !row.api_key_ciphertext) return null;
  return {
    username: row.username,
    environment: row.environment === "live" ? "live" : "demo",
    lastVerifiedAt: row.last_verified_at,
  };
}

/**
 * The per-user broker config used by every gateway call. Falls back to
 * project-level environment credentials when the user hasn't connected their
 * own account, so an existing env-based setup keeps working.
 */
export async function resolveConfig(supabase: Client, userId: string): Promise<BrokerConfig | null> {
  const row = await readRow(supabase, userId);
  if (row?.username && row.api_key_ciphertext) {
    try {
      return {
        username: row.username,
        apiKey: decryptSecret(row.api_key_ciphertext),
        baseUrl: gatewayFor(row.environment === "live" ? "live" : "demo"),
      };
    } catch {
      // Ciphertext unreadable (rotated secret) — treat as not configured.
      return readConfig();
    }
  }
  return readConfig();
}
