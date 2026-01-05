import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { EncryptedPayload, encryptData, decryptData } from '../utils/secureVault';

type VaultTokens = Record<string, string>;

interface VaultContextValue {
  hasVault: boolean;
  isUnlocked: boolean;
  initializeVault: (password: string, initialTokens: VaultTokens) => Promise<void>;
  setMasterPassword: (password: string) => Promise<void>;
  setServiceToken: (serviceId: string, token: string) => Promise<void>;
  clearServiceToken: (serviceId: string) => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  getToken: (serviceId: string) => string | null;
  clearVault: () => void;
}

const VAULT_STORAGE_KEY = 'dashboard.vault';

const VaultContext = createContext<VaultContextValue | null>(null);

function loadStoredVault(): EncryptedPayload | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  const raw = window.localStorage.getItem(VAULT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EncryptedPayload;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [encrypted, setEncrypted] = useState<EncryptedPayload | null>(() => loadStoredVault());
  const [tokens, setTokens] = useState<VaultTokens | null>(null);
  const [password, setPassword] = useState<string | null>(null);

  const hasVault = useMemo(() => !!encrypted, [encrypted]);
  const isUnlocked = useMemo(() => !!tokens, [tokens]);

  const persistEncrypted = useCallback((payload: EncryptedPayload) => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(payload));
    setEncrypted(payload);
  }, []);

  const initializeVault = useCallback(
    async (pwd: string, initialTokens: VaultTokens) => {
      const payload = await encryptData(pwd, initialTokens);
      persistEncrypted(payload);
      setTokens(initialTokens);
      setPassword(pwd);
    },
    [persistEncrypted],
  );

  const setMasterPassword = useCallback(
    async (pwd: string) => {
      const initialTokens: VaultTokens = tokens || {};
      const payload = await encryptData(pwd, initialTokens);
      persistEncrypted(payload);
      setTokens(initialTokens);
      setPassword(pwd);
    },
    [tokens, persistEncrypted],
  );

  const unlock = useCallback(
    async (pwd: string) => {
      if (!encrypted) return false;
      try {
        const decrypted = (await decryptData(pwd, encrypted)) as VaultTokens;
        setTokens(decrypted);
        setPassword(pwd);
        return true;
      } catch {
        return false;
      }
    },
    [encrypted],
  );

  const lock = useCallback(() => {
    setTokens(null);
    setPassword(null);
  }, []);

  const clearVault = useCallback(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(VAULT_STORAGE_KEY);
    }
    setEncrypted(null);
    setTokens(null);
    setPassword(null);
  }, []);

  const getToken = useCallback(
    (serviceId: string) => {
      if (!tokens) return null;
      return tokens[serviceId] ?? null;
    },
    [tokens],
  );

  const setServiceToken = useCallback(
    async (serviceId: string, token: string) => {
      if (!password) {
        throw new Error('Vault is locked');
      }
      const current: VaultTokens = tokens || {};
      const next: VaultTokens = { ...current, [serviceId]: token };
      setTokens(next);
      const payload = await encryptData(password, next);
      persistEncrypted(payload);
    },
    [password, tokens, persistEncrypted],
  );

  const clearServiceToken = useCallback(
    async (serviceId: string) => {
      if (!password) {
        throw new Error('Vault is locked');
      }
      const current: VaultTokens = tokens || {};
      if (!(serviceId in current)) {
        return;
      }
      const { [serviceId]: _removed, ...rest } = current;
      const next: VaultTokens = rest;
      setTokens(next);
      const payload = await encryptData(password, next);
      persistEncrypted(payload);
    },
    [password, tokens, persistEncrypted],
  );

  const value: VaultContextValue = {
    hasVault,
    isUnlocked,
    initializeVault,
    setMasterPassword,
    setServiceToken,
    clearServiceToken,
    unlock,
    lock,
    getToken,
    clearVault,
  };

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return ctx;
}
