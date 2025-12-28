// =====================================================
// GWYG DB — localStorage (STATELESS, ALWAYS FRESH) + MULTI-FOLDER + HISTORY
// =====================================================

const STORAGE_KEY = "GWYG_DB_V5";

export type Folder = { id: number; name: string };

export type Design = {
  id: number;
  name: string;
  imageUri?: string;

  // legacy support
  folderId?: number | null;

  // multi-folder membership
  folderIds: number[];

  usedInSession: boolean;
  usedGlobally: boolean;
};

export type Settings = {
  rerolls: number;
  defaultRollFolderId?: number | null; // undefined=All, null=Unsorted, number=folder
  allowRepeats: boolean;
};

export type HistoryItem = {
  id: number; // unique event id
  designId: number;
  name: string;
  imageUri?: string;
  chosenAt: number; // unix ms
};

type DBState = {
  folders: Folder[];
  designs: Design[];
  settings: Settings;
  history: HistoryItem[];
};

function canUseWebStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function svgDataUri(svg: string) {
  const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

const PRESET_ICONS = {
  anchor: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="white"/><path d="M256 60c-22 0-40 18-40 40s18 40 40 40 40-18 40-40-18-40-40-40zm-16 96v132h-58c8 66 56 118 116 118s108-52 116-118h-58V156h-16v132h-84V156h-16zM144 316h52c10 44 50 76 60 76s50-32 60-76h52c-10 86-82 152-172 152s-162-66-172-152z" fill="black"/></svg>`),
  skull: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="white"/><path d="M256 64c-88 0-160 66-160 148 0 52 28 99 72 126v54c0 18 14 32 32 32h16v-48h32v48h32v-48h32v48h16c18 0 32-14 32-32v-54c44-27 72-74 72-126 0-82-72-148-160-148zm-72 156c-18 0-32-14-32-32s14-32 32-32 32 14 32 32-14 32-32 32zm144 0c-18 0-32-14-32-32s14-32 32-32 32 14 32 32-14 32-32 32z" fill="black"/></svg>`),
  star: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="white"/><path d="M256 72l54 110 122 18-88 86 21 122-109-58-109 58 21-122-88-86 122-18z" fill="black"/></svg>`),
  dagger: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="white"/><path d="M308 64l-52 52-52-52-36 36 52 52-156 156 96 96 156-156 52 52 36-36-52-52 52-52zM128 336l48 48-48 48-48-48z" fill="black"/></svg>`),
  heart: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="white"/><path d="M256 448S64 336 64 208c0-58 46-104 104-104 40 0 74 22 88 54 14-32 48-54 88-54 58 0 104 46 104 104 0 128-192 240-192 240z" fill="black"/></svg>`),
  rose: svgDataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="100%" height="100%" fill="white"/><path d="M256 72c-52 0-92 40-92 88 0 14 4 28 10 40-42 10-74 48-74 94 0 54 44 98 98 98 24 0 46-8 64-22 18 14 40 22 64 22 54 0 98-44 98-98 0-46-32-84-74-94 6-12 10-26 10-40 0-48-40-88-92-88zm-16 64c22 0 40 18 40 40s-18 40-40 40-40-18-40-40 18-40 40-40z" fill="black"/></svg>`),
};

const DEFAULT_STATE: DBState = {
  folders: [
    { id: 1, name: "Unsorted" },
    { id: 2, name: "Florals" },
    { id: 3, name: "Spooky" },
    { id: 4, name: "Cute" },
    { id: 5, name: "Traditional" },
  ],
  designs: [
    { id: 101, name: "Anchor", imageUri: PRESET_ICONS.anchor, folderIds: [5], folderId: 5, usedInSession: false, usedGlobally: false },
    { id: 102, name: "Skull", imageUri: PRESET_ICONS.skull, folderIds: [3], folderId: 3, usedInSession: false, usedGlobally: false },
    { id: 103, name: "Star", imageUri: PRESET_ICONS.star, folderIds: [], folderId: null, usedInSession: false, usedGlobally: false },
    { id: 104, name: "Dagger", imageUri: PRESET_ICONS.dagger, folderIds: [3], folderId: 3, usedInSession: false, usedGlobally: false },
    { id: 105, name: "Heart", imageUri: PRESET_ICONS.heart, folderIds: [4, 5], folderId: 4, usedInSession: false, usedGlobally: false },
    { id: 106, name: "Rose", imageUri: PRESET_ICONS.rose, folderIds: [2], folderId: 2, usedInSession: false, usedGlobally: false },
  ],
  settings: { rerolls: 1, defaultRollFolderId: undefined, allowRepeats: false },
  history: [],
};

function normalizeState(s: DBState): DBState {
  if (!Array.isArray(s.history)) s.history = [];

  s.settings = { ...clone(DEFAULT_STATE.settings), ...(s.settings ?? {}) };

  if (!s.folders.some((f) => f.name.toLowerCase() === "unsorted")) {
    s.folders.unshift({ id: 1, name: "Unsorted" });
  }

  s.designs = s.designs.map((d) => {
    const folderIds = Array.isArray((d as any).folderIds) ? ((d as any).folderIds as number[]) : [];
    let nextIds = folderIds.slice();

    const legacy = (d as any).folderId;
    if (typeof legacy === "number" && !nextIds.includes(legacy)) nextIds.push(legacy);

    const primary = nextIds.length > 0 ? nextIds[0] : null;

    return { ...d, folderIds: nextIds, folderId: primary };
  });

  return s;
}

function readState(): DBState {
  if (!canUseWebStorage()) return clone(DEFAULT_STATE);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(DEFAULT_STATE);

    const parsed = JSON.parse(raw);
    const merged: DBState = {
      folders: Array.isArray(parsed.folders) ? parsed.folders : clone(DEFAULT_STATE.folders),
      designs: Array.isArray(parsed.designs) ? parsed.designs : clone(DEFAULT_STATE.designs),
      settings: { ...clone(DEFAULT_STATE.settings), ...(parsed.settings ?? {}) },
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };

    if (!merged.designs || merged.designs.length === 0) return clone(DEFAULT_STATE);

    return normalizeState(merged);
  } catch {
    return clone(DEFAULT_STATE);
  }
}

function writeState(state: DBState) {
  if (!canUseWebStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// Compatibility
export function initDb() {
  const s = normalizeState(readState());
  writeState(s);
}
export async function seedPresetsIfEmpty() {
  const s = normalizeState(readState());
  writeState(s);
}

// ---------- SETTINGS ----------
export function getSettings(): Settings {
  return readState().settings;
}
export function updateSettings(patch: Partial<Settings>) {
  const s = readState();
  s.settings = { ...s.settings, ...patch };
  writeState(normalizeState(s));
}

// ---------- HISTORY ----------
export function listHistory(limit = 50): HistoryItem[] {
  const s = readState();
  const items = (s.history || []).slice().sort((a, b) => b.chosenAt - a.chosenAt);
  return items.slice(0, Math.max(0, limit));
}
export function clearHistory() {
  const s = readState();
  s.history = [];
  writeState(normalizeState(s));
}

// ---------- FOLDERS ----------
export function listFolders(): Folder[] {
  return readState().folders;
}
export function addFolder(name: string): Folder {
  const s = readState();
  const folder: Folder = { id: Date.now(), name: name.trim() || "New Folder" };
  s.folders.push(folder);
  writeState(normalizeState(s));
  return folder;
}
export function deleteFolder(id: number) {
  const s = readState();
  s.folders = s.folders.filter((f) => f.id !== id);
  s.designs = s.designs.map((d) => ({ ...d, folderIds: d.folderIds.filter((x) => x !== id) }));
  writeState(normalizeState(s));
}

// ---------- DESIGNS ----------
export function listDesigns(): Design[] {
  return readState().designs;
}

export function listAllDesigns(folderId?: number | null) {
  const s = readState();
  const filtered = s.designs.filter((d) => {
    if (typeof folderId === "number") return d.folderIds.includes(folderId);
    if (folderId === null) return d.folderIds.length === 0;
    return true;
  });

  return filtered.map((d) => ({
    ...d,
    isAvailable: !d.usedInSession && (s.settings.allowRepeats || !d.usedGlobally) ? 1 : 0,
  }));
}

export function addDesign(input: { name: string; imageUri?: string; folderId?: number | null }) {
  const s = readState();
  const ids: number[] = [];
  if (typeof input.folderId === "number") ids.push(input.folderId);

  s.designs.push({
    id: Date.now(),
    name: input.name?.trim() || "Untitled",
    imageUri: input.imageUri,
    folderIds: ids,
    folderId: ids.length ? ids[0] : null,
    usedInSession: false,
    usedGlobally: false,
  });

  writeState(normalizeState(s));
}

export function deleteDesign(designId: number) {
  const s = readState();
  s.designs = s.designs.filter((d) => d.id !== designId);
  writeState(normalizeState(s));
}

export function setDesignAvailability(designId: number, availability01: 0 | 1) {
  const s = readState();
  s.designs = s.designs.map((d) => {
    if (d.id !== designId) return d;
    if (availability01 === 1) return { ...d, usedInSession: false, usedGlobally: false };
    return { ...d, usedInSession: true, usedGlobally: true };
  });
  writeState(normalizeState(s));
}

export function setDesignFolder(designId: number, folderId: number | null) {
  const s = readState();
  s.designs = s.designs.map((d) => {
    if (d.id !== designId) return d;

    if (folderId === null) return { ...d, folderIds: [], folderId: null };

    const nextIds = d.folderIds.includes(folderId) ? d.folderIds : [folderId, ...d.folderIds];
    return { ...d, folderIds: nextIds, folderId };
  });
  writeState(normalizeState(s));
}

export function toggleDesignFolder(designId: number, folderId: number) {
  const s = readState();
  s.designs = s.designs.map((d) => {
    if (d.id !== designId) return d;

    let nextIds = d.folderIds.slice();
    if (nextIds.includes(folderId)) nextIds = nextIds.filter((x) => x !== folderId);
    else nextIds.push(folderId);

    const primary = nextIds.length ? nextIds[0] : null;
    return { ...d, folderIds: nextIds, folderId: primary };
  });
  writeState(normalizeState(s));
}

// ---------- PLAY ----------
export function listAvailableDesigns(): Design[] {
  const s = readState();
  const { allowRepeats, defaultRollFolderId } = s.settings;

  return s.designs.filter((d) => {
    if (defaultRollFolderId === null) {
      if (d.folderIds.length !== 0) return false;
    } else if (typeof defaultRollFolderId === "number") {
      if (!d.folderIds.includes(defaultRollFolderId)) return false;
    }

    if (d.usedInSession) return false;
    if (!allowRepeats && d.usedGlobally) return false;

    return true;
  });
}

// ✅ FIXED: history is written in the SAME write as design state, so it can't be overwritten.
export function markDesignUnavailable(designId: number) {
  const s = readState();
  const allowRepeats = !!s.settings.allowRepeats;

  const picked = s.designs.find((d) => d.id === designId);
  if (picked) {
    const item: HistoryItem = {
      id: Date.now(),
      designId: picked.id,
      name: picked.name,
      imageUri: picked.imageUri,
      chosenAt: Date.now(),
    };
    s.history = [item, ...(s.history || [])].slice(0, 300);
  }

  s.designs = s.designs.map((d) => {
    if (d.id !== designId) return d;
    return {
      ...d,
      usedInSession: true,
      usedGlobally: allowRepeats ? d.usedGlobally : true,
    };
  });

  writeState(normalizeState(s));
}

export function resetPool() {
  const s = readState();
  s.designs = s.designs.map((d) => ({ ...d, usedInSession: false }));
  writeState(normalizeState(s));
}

export function resetAllGloballyUsed() {
  const s = readState();
  s.designs = s.designs.map((d) => ({ ...d, usedGlobally: false, usedInSession: false }));
  writeState(normalizeState(s));
}
