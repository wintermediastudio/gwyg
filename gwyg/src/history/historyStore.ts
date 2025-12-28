import { Platform } from "react-native";

export type HistoryItem = {
  id: string;
  designId: number;
  designName: string;
  imageUri?: string;
  chosenAtISO: string;
  folderName?: string;
};

const KEY = "gwyg_history_v1";
let memory: HistoryItem[] = [];

function isWeb() {
  return Platform.OS === "web";
}

function safeParse(json: string | null): HistoryItem[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? (v as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function listHistory(): HistoryItem[] {
  if (isWeb()) {
    // @ts-ignore
    const raw = globalThis?.localStorage?.getItem(KEY) ?? null;
    return safeParse(raw);
  }
  return memory;
}

export function addHistory(item: Omit<HistoryItem, "id" | "chosenAtISO">) {
  const newItem: HistoryItem = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    chosenAtISO: new Date().toISOString(),
    ...item,
  };

  const items = listHistory();
  const next = [newItem, ...items].slice(0, 500);

  if (isWeb()) {
    // @ts-ignore
    globalThis?.localStorage?.setItem(KEY, JSON.stringify(next));
  } else {
    memory = next;
  }
}

export function clearHistory() {
  if (isWeb()) {
    // @ts-ignore
    globalThis?.localStorage?.removeItem(KEY);
  }
  memory = [];
}
