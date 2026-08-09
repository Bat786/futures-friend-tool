import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Status of the signed-in user's own TopstepX connection. Never returns the key. */
export const getBrokerConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { readConnection, gatewayFor } = await import("./broker-credentials.server");
    const { readConfig, isDemo } = await import("./topstepx.server");
    const conn = await readConnection(context.supabase, context.userId);
    if (conn) {
      return {
        configured: true,
        source: "account" as const,
        username: conn.username,
        environment: conn.environment,
        gateway: gatewayFor(conn.environment),
        lastVerifiedAt: conn.lastVerifiedAt,
      };
    }
    const env = readConfig();
    return {
      configured: env !== null,
      source: "environment" as const,
      username: env?.username ?? null,
      environment: env ? (isDemo(env) ? ("demo" as const) : ("live" as const)) : ("demo" as const),
      gateway: env?.baseUrl ?? null,
      lastVerifiedAt: null,
    };
  });

export const saveBrokerConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        username: z.string().trim().min(1).max(200),
        apiKey: z.string().trim().min(8).max(500),
        environment: z.enum(["demo", "live"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { gatewayFor } = await import("./broker-credentials.server");
    const { encryptSecret } = await import("./credential-crypto.server");
    const { getToken, searchAccounts } = await import("./topstepx.server");

    const cfg = {
      username: data.username,
      apiKey: data.apiKey,
      baseUrl: gatewayFor(data.environment),
    };

    // Verify before persisting — a saved credential that can't authenticate is
    // worse than no credential at all.
    try {
      await getToken(cfg);
      await searchAccounts(cfg);
    } catch (error) {
      return {
        ok: false as const,
        reason: error instanceof Error ? error.message : "TopstepX rejected those credentials.",
      };
    }

    const { error } = await context.supabase.from("broker_accounts").upsert(
      {
        user_id: context.userId,
        broker: "topstepx",
        label: "TopstepX",
        external_account_id: "",
        username: data.username,
        api_key_ciphertext: encryptSecret(data.apiKey),
        environment: data.environment,
        is_demo: data.environment === "demo",
        last_verified_at: new Date().toISOString(),
      },
      { onConflict: "user_id,broker" },
    );
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const };
  });

/** Re-authenticates with the stored credentials and lists the trader's accounts. */
export const testBrokerConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { resolveConfig } = await import("./broker-credentials.server");
    const { searchAccounts } = await import("./topstepx.server");
    const { toAccountDTO } = await import("./broker-types");

    const cfg = await resolveConfig(context.supabase, context.userId);
    if (!cfg) return { ok: false as const, reason: "No TopstepX credentials saved yet.", accounts: [] };
    try {
      const res = await searchAccounts(cfg);
      await context.supabase
        .from("broker_accounts")
        .update({ last_verified_at: new Date().toISOString() })
        .eq("user_id", context.userId)
        .eq("broker", "topstepx");
      return { ok: true as const, reason: null, accounts: (res.accounts ?? []).map(toAccountDTO) };
    } catch (error) {
      return {
        ok: false as const,
        reason: error instanceof Error ? error.message : "Connection test failed.",
        accounts: [],
      };
    }
  });

export const disconnectBroker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("broker_accounts")
      .delete()
      .eq("user_id", context.userId)
      .eq("broker", "topstepx");
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const, reason: null };
  });
