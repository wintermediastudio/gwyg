// src/storage/chosenHistory.ts
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ChosenHistoryItem = {
  id: string;
  designId: string;
  title?: string;
  imageUri?: string;
  chosenAt: number | null;
};

const STORAGE_KEY = "GWYG_CHOSEN_HISTORY_V1";
const MAX_ITEMS = 200;

// If your older build stored history under another key, we’ll try to pull it in.
const LEGACY_KEYS = [
  "chosenHistory",
  "CHOSEN_HISTORY",
  "GWYG_CHOSEN_HISTORY",
  "GWYG_HISTORY",
  "history",
];

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

const Storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(key, value);
      } catch {
        // ignore
      }
      return;
    }
    await AsyncStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

export function normalizeChosenHistory(raw: any): ChosenHistoryItem[] {
  const arr = Array.isArray(raw) ? raw : [];

  return arr
    .map((item: any, index: number): ChosenHistoryItem | null => {
      // Legacy: string entries
      if (typeof item === "string") {
        return {
          id: `legacy-${index}-${item}`,
          designId: item,
          chosenAt: null,
        };
      }

      if (item && typeof item === "object") {
        const designId = String(
          item.designId ??
            item.designID ??
            item.design ??
            item.design_id ??
            item.id ?? // sometimes stored as id
            ""
        );
        if (!designId) return null;

        const title = item.title ?? item.name ?? item.designName ?? undefined;
        const imageUri = item.imageUri ?? item.uri ?? item.image ?? item.imageURL ?? item.imageUrl ?? undefined;

        const chosenAtCandidate =
          item.chosenAt ?? item.timestamp ?? item.timeStamp ?? item.createdAt ?? item.created_at ?? null;

        const chosenAt =
          typeof chosenAtCandidate === "number"
            ? chosenAtCandidate
            : typeof chosenAtCandidate === "string"
            ? Number(chosenAtCandidate)
            : null;

        const id = String(item.id ?? `hist-${Date.now()}-${Math.random().toString(16).slice(2)}`);

        return {
          id,
          designId,
          title,
          imageUri,
          chosenAt: Number.isFinite(chosenAt as number) ? (chosenAt as number) : null,
        };
      }

      return null;
    })
    .filter(Boolean) as ChosenHistoryItem[];
}

async function migrateLegacyIfNeeded(): Promise<void> {
  const existing = await Storage.getItem(STORAGE_KEY);
  if (existing && existing !== "[]" && existing !== "{}") return; // already has data

  // Try each legacy key and migrate the first one that has content
  for (const key of LEGACY_KEYS) {
    const legacy = await Storage.getItem(key);
    if (!legacy) continue;

    const parsed = safeJsonParse<any>(legacy);
    const normalized = normalizeChosenHistory(parsed);

    if (normalized.length > 0) {
      await Storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      // optional: remove the legacy key so you don’t get duplicates later
      await Storage.removeItem(key);
      return;
    }
  }
}

export async function loadChosenHistory(): Promise<ChosenHistoryItem[]> {
  await migrateLegacyIfNeeded();
  const stored = await Storage.getItem(STORAGE_KEY);
  const parsed = safeJsonParse<any>(stored);
  return normalizeChosenHistory(parsed);
}

export async function saveChosenHistory(items: ChosenHistoryItem[]): Promise<void> {
  await Storage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function makeHistoryItemFromDesign(design: {
  id: string;
  title?: string;
  name?: string;
  imageUri?: string;
  uri?: string;
}): ChosenHistoryItem {
  return {
    id: `hist-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    designId: String(design.id),
    title: design.title ?? design.name,
    imageUri: design.imageUri ?? design.uri,
    chosenAt: Date.now(),
  };
}

export async function addToChosenHistory(design: {
  id: string;
  title?: string;
  name?: string;
  imageUri?: string;
  uri?: string;
}): Promise<ChosenHistoryItem[]> {
  const current = await loadChosenHistory();
  const nextItem = makeHistoryItemFromDesign(design);
  const next = [nextItem, ...current].slice(0, MAX_ITEMS);
  await saveChosenHistory(next);
  return next;
}

export async function clearChosenHistory(): Promise<void> {
  await Storage.removeItem(STORAGE_KEY);
}

export function formatChosenAt(chosenAt: number | null): string {
  if (!chosenAt) return "";
  try {
    return new Date(chosenAt).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
