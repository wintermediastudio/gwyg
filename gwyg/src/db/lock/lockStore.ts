export type LockMode = "toggle" | "pin";

export type LockState = {
  enabled: boolean;
  mode: LockMode;
  pin: string;
};

const DEFAULT_STATE: LockState = {
  enabled: false,
  mode: "pin",
  pin: "1234",
};

const STORAGE_KEY = "gwyg-client-lock";

export async function loadLockState(): Promise<LockState> {
  if (typeof window === "undefined") return DEFAULT_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export async function saveLockState(state: LockState): Promise<void> {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
