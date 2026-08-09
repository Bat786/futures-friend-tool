import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Environment = "demo" | "live";

export type BrokerVault = {
  username: string;
  apiKey: string;
  environment: Environment;
};

export type VaultStatus = {
  configured: boolean;
  environment: Environment;
  gateway: string;
  lastVerifiedAt: string | null;
};

const VAULT_KEY = "sdx-broker-vault-v1";

const DEMO_GATEWAY = "https://gateway-api-demo.s2f.projectx.com/api";
const LIVE_GATEWAY = "https://api.topstepx.com/api";

export function gatewayFor(environment: Environment): string {
  return environment === "live" ? LIVE_GATEWAY : DEMO_GATEWAY;
}

/** Exported for tests; never touch in UI code. */
function getRandomBytes(length: number): Uint8Array {
  if (typeof crypto === "undefined" || !("getRandomValues" in crypto)) {
    throw new Error("Browser Web Crypto API is not available");
  }
  return crypto.getRandomValues(new Uint8Array(length));
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptVault(plaintext: string, passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = getRandomBytes(16);
  const iv = getRandomBytes(12);
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext));
  const buf = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  buf.set(salt, 0);
  buf.set(iv, salt.length);
  buf.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return btoa(String.fromCharCode(...buf));
}

export async function decryptVault(ciphertext: string, passphrase: string): Promise<string> {
  const decoder = new TextDecoder();
  const bytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const salt = bytes.slice(0, 16);
  const iv = bytes.slice(16, 28);
  const ct = bytes.slice(28);
  const key = await deriveKey(passphrase, salt);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return decoder.decode(plaintext);
}

export type PersistedVault = {
  username: string;
  environment: Environment;
  ciphertext: string;
  lastVerifiedAt: string | null;
};

export function hasVault(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(VAULT_KEY);
}

export function getVaultStatus(): VaultStatus | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) return null;
  try {
    const parsed: PersistedVault = JSON.parse(raw);
    return {
      configured: true,
      environment: parsed.environment,
      gateway: gatewayFor(parsed.environment),
      lastVerifiedAt: parsed.lastVerifiedAt,
    };
  } catch {
    return null;
  }
}

export async function saveVault(credentials: BrokerVault, passphrase: string): Promise<void> {
  if (typeof window === "undefined") throw new Error("Vault can only be saved in the browser");
  const ciphertext = await encryptVault(credentials.apiKey, passphrase);
  const persisted: PersistedVault = {
    username: credentials.username,
    environment: credentials.environment,
    ciphertext,
    lastVerifiedAt: new Date().toISOString(),
  };
  localStorage.setItem(VAULT_KEY, JSON.stringify(persisted));
}

export async function loadVault(passphrase: string): Promise<BrokerVault | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(VAULT_KEY);
  if (!raw) return null;
  const parsed: PersistedVault = JSON.parse(raw);
  const apiKey = await decryptVault(parsed.ciphertext, passphrase);
  return {
    username: parsed.username,
    apiKey,
    environment: parsed.environment,
  };
}

export function clearVault(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VAULT_KEY);
}

// React context — keeps the decrypted config in memory only.

type VaultContextValue = {
  config: BrokerVault | null;
  status: VaultStatus | null;
  loading: boolean;
  unlock: (passphrase: string) => Promise<BrokerVault | null>;
  lock: () => void;
  save: (credentials: BrokerVault, passphrase: string) => Promise<BrokerVault | null>;
  clear: () => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function BrokerVaultProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<BrokerVault | null>(null);
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStatus(getVaultStatus());
    setLoading(false);
  }, []);

  const unlock = useCallback(async (passphrase: string): Promise<BrokerVault | null> => {
    const cfg = await loadVault(passphrase);
    setConfig(cfg);
    if (cfg) setStatus(getVaultStatus());
    return cfg;
  }, []);

  const lock = useCallback(() => {
    setConfig(null);
  }, []);

  const save = useCallback(
    async (credentials: BrokerVault, passphrase: string): Promise<BrokerVault | null> => {
      try {
        await saveVault(credentials, passphrase);
        setConfig(credentials);
        setStatus(getVaultStatus());
        return credentials;
      } catch (e) {
        console.error("Failed to save vault", e);
        return null;
      }
    },
    [],
  );

  const clear = useCallback(() => {
    clearVault();
    setConfig(null);
    setStatus(null);
  }, []);

  return (
    <VaultContext.Provider value={{ config, status, loading, unlock, lock, save, clear }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useBrokerVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useBrokerVault must be used within BrokerVaultProvider");
  return ctx;
}
