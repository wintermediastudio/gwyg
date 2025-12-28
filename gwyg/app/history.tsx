// app/history.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Image,
  Share,
  StyleSheet,
  Platform,
  Linking,
} from "react-native";
import { useFocusEffect, router } from "expo-router";

// Use require so TS doesn't explode if exports differ.
const HistoryStore: any = require("../src/history/historyStore");

type AnyItem = Record<string, any>;

function pickFirst<T = any>(...vals: any[]): T | undefined {
  for (const v of vals) {
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return undefined;
}

function parseTimestamp(value: any): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;

  if (typeof value === "number") {
    if (value > 0 && value < 1e12) return value * 1000; // seconds -> ms
    return value;
  }

  if (typeof value === "string") {
    const s = value.trim();
    if (!s) return undefined;

    const asNum = Number(s);
    if (Number.isFinite(asNum)) {
      if (asNum > 0 && asNum < 1e12) return asNum * 1000;
      return asNum;
    }

    const parsed = Date.parse(s);
    if (Number.isFinite(parsed)) return parsed;

    return undefined;
  }

  return undefined;
}

function findTimestampDeep(raw: AnyItem): number | undefined {
  if (!raw || typeof raw !== "object") return undefined;

  const directCandidates = [
    raw.chosenAt,
    raw.chosen_at,
    raw.timestamp,
    raw.timeStamp,
    raw.time_stamp,
    raw.createdAt,
    raw.created_at,
    raw.updatedAt,
    raw.updated_at,
    raw.date,
    raw.datetime,
    raw.time,
    raw.ts,
    raw.lockedAt,
    raw.locked_at,
    raw.pickedAt,
    raw.picked_at,
    raw.selectedAt,
    raw.selected_at,
  ];

  for (const c of directCandidates) {
    const t = parseTimestamp(c);
    if (t) return t;
  }

  const nestedObjs = [raw.meta, raw.data, raw.payload, raw.item, raw.entry, raw.history, raw.design].filter(
    (x) => x && typeof x === "object"
  );

  for (const obj of nestedObjs) {
    const candidates = [
      obj.chosenAt,
      obj.chosen_at,
      obj.timestamp,
      obj.timeStamp,
      obj.time_stamp,
      obj.createdAt,
      obj.created_at,
      obj.date,
      obj.time,
      obj.ts,
      obj.lockedAt,
      obj.pickedAt,
      obj.selectedAt,
    ];
    for (const c of candidates) {
      const t = parseTimestamp(c);
      if (t) return t;
    }
  }

  for (const [k, v] of Object.entries(raw)) {
    const key = k.toLowerCase();
    if (key.includes("time") || key.includes("date") || key.includes("chosen") || key.includes("pick")) {
      const t = parseTimestamp(v);
      if (t) return t;
    }
  }

  const idLike = String(pickFirst(raw.id, raw._id, raw.historyId, raw.rowId) ?? "");
  if (idLike) {
    const msMatch = idLike.match(/(\d{13})/);
    if (msMatch?.[1]) return parseTimestamp(msMatch[1]);

    const secMatch = idLike.match(/(\d{10})/);
    if (secMatch?.[1]) return parseTimestamp(secMatch[1]);

    const isoMatch = idLike.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    if (isoMatch?.[0]) return parseTimestamp(isoMatch[0]);
  }

  return undefined;
}

function normalizeItem(raw: AnyItem, index: number) {
  const designId = String(
    pickFirst(raw.designId, raw.designID, raw.design_id, raw.design, raw.id) ?? `unknown-${index}`
  );

  const title =
    pickFirst<string>(raw.title, raw.name, raw.designName, raw.designTitle) ?? `Design ${designId}`;

  const imageUri =
    pickFirst<string>(
      raw.imageUri,
      raw.uri,
      raw.image,
      raw.imageURL,
      raw.imageUrl,
      raw.preview,
      raw.thumbnail,
      raw.thumb
    ) ?? undefined;

  const chosenAt = findTimestampDeep(raw);

  const rowId = String(
    pickFirst(raw.rowId, raw._id, raw.historyId, raw.id) ??
      `row-${index}-${designId}-${chosenAt ?? "x"}`
  );

  return { rowId, designId, title, imageUri, chosenAt, _raw: raw };
}

function formatChosenAt(ts?: number) {
  if (!ts) return "Time unknown";
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Time unknown";
  }
}

/**
 * WEB: Convert whatever imageUri is into a Blob/File we can download/share.
 * Works for: http(s), data:, blob:, and many Expo web asset URLs.
 * If the URI is truly local-only (file:// or expo-file:// on native), fetch will fail on web.
 */
async function webMakeFileFromUri(imageUri: string, filenameBase: string) {
  const w: any = typeof window !== "undefined" ? window : undefined;

  // Try fetch -> blob
  const res = await fetch(imageUri);
  if (!res.ok) throw new Error(`Could not fetch image (${res.status})`);

  const blob = await res.blob();

  // Guess extension/type
  const type = blob.type || "image/png";
  const ext =
    type.includes("png") ? "png" :
    type.includes("jpeg") || type.includes("jpg") ? "jpg" :
    type.includes("webp") ? "webp" :
    "png";

  const safeBase = (filenameBase || "gwyg-design").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
  const filename = `${safeBase}.${ext}`;

  // Blob URL for downloading
  const blobUrl = w?.URL?.createObjectURL ? w.URL.createObjectURL(blob) : "";

  // File for Web Share API
  let file: File | null = null;
  try {
    file = new File([blob], filename, { type });
  } catch {
    file = null;
  }

  return { blob, blobUrl, file, filename, type };
}

/**
 * WEB: Attempt to share file (if supported). Otherwise download it.
 * Also tries to copy image to clipboard if supported (nice bonus).
 */
async function webShareOrDownloadImage(opts: { title: string; imageUri: string; chosenAt?: number }) {
  const w: any = typeof window !== "undefined" ? window : undefined;
  const nav: any = w?.navigator;

  const { blobUrl, file, filename } = await webMakeFileFromUri(opts.imageUri, opts.title);

  // 1) Try Web Share API with FILES (best case; often mobile only)
  try {
    if (nav?.share && nav?.canShare && file && nav.canShare({ files: [file] })) {
      await nav.share({
        title: "GWYG Design",
        text: `GWYG Pick: ${opts.title}`,
        files: [file],
      });
      return;
    }
  } catch {
    // continue
  }

  // 2) Try copy image to clipboard (Chrome supports in some cases)
  try {
    if (nav?.clipboard?.write && (w as any).ClipboardItem) {
      const item = new (w as any).ClipboardItem({ [file?.type || "image/png"]: file ? file : await (await fetch(blobUrl)).blob() });
      await nav.clipboard.write([item]);
      // Still also download, because clipboard isn't “text/email/bluetooth”
    }
  } catch {
    // ignore
  }

  // 3) Always fall back to DOWNLOAD (reliable on desktop)
  if (!blobUrl) {
    // As a last resort, show the URI so you can open/copy it
    w?.alert("Could not create a downloadable file. I’ll show the image URI to copy.");
    w?.prompt("Copy this image URI:", opts.imageUri);
    return;
  }

  // Force download via hidden anchor click
  const a = w.document.createElement("a");
  a.href = blobUrl;
  a.download = filename || "gwyg-design.png";
  a.style.display = "none";
  w.document.body.appendChild(a);
  a.click();
  a.remove();

  // Give a clear instruction for what you actually want (text/email/bluetooth)
  w?.alert(
    "Downloaded the design image file.\n\nNext: attach that downloaded file in your text/email, or send it via Bluetooth/AirDrop from your computer."
  );

  // Cleanup later
  try {
    w.URL.revokeObjectURL(blobUrl);
  } catch {
    // ignore
  }
}

/**
 * SHARE DESIGN (image file on web if possible; otherwise download)
 */
async function shareDesign(opts: { title: string; imageUri?: string; chosenAt?: number }) {
  const imageUri = opts.imageUri;

  if (!imageUri) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert("No image found for this history item.");
    }
    return;
  }

  // WEB
  if (Platform.OS === "web") {
    try {
      await webShareOrDownloadImage({ title: opts.title, imageUri, chosenAt: opts.chosenAt });
    } catch (e: any) {
      // Make sure it NEVER "does nothing"
      const msg = e?.message ?? String(e);
      window.alert("Could not export/share this image.\n\n" + msg + "\n\nTip: This usually means the stored image URI is local-only.");
      // Show URI for debugging / copy
      try {
        window.prompt("Copy this image URI:", imageUri);
      } catch {}
    }
    return;
  }

  // NATIVE (kept simple; you said play-page share already works)
  try {
    await Share.share({
      message: `GWYG Pick: ${opts.title}`,
      url: imageUri,
    });
  } catch {
    try {
      const can = await Linking.canOpenURL(imageUri);
      if (can) await Linking.openURL(imageUri);
    } catch {
      // ignore
    }
  }
}

export default function HistoryScreen() {
  const [items, setItems] = useState<ReturnType<typeof normalizeItem>[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorLine, setErrorLine] = useState<string>("");

  const loadFn = useMemo(() => {
    return (
      HistoryStore.getHistory ||
      HistoryStore.listHistory ||
      HistoryStore.loadHistory ||
      HistoryStore.readHistory ||
      HistoryStore.history
    );
  }, []);

  const clearFn = useMemo(() => {
    return (
      HistoryStore.clearHistory ||
      HistoryStore.resetHistory ||
      HistoryStore.wipeHistory ||
      HistoryStore.clear
    );
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorLine("");

    try {
      if (!loadFn) {
        setItems([]);
        setErrorLine("Could not find a history read function in src/history/historyStore.");
        setLoading(false);
        return;
      }

      const raw = await loadFn();
      const arr = Array.isArray(raw) ? raw : [];
      const normalized = arr.map((x: AnyItem, i: number) => normalizeItem(x, i));
      setItems(normalized);
    } catch (e: any) {
      setItems([]);
      setErrorLine(e?.message ?? "Unknown error loading history.");
    } finally {
      setLoading(false);
    }
  }, [loadFn]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onClear = useCallback(() => {
    if (!clearFn) {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert("Clear unavailable: no clear/reset function found in historyStore.");
      }
      return;
    }

    const confirmed =
      Platform.OS === "web" && typeof window !== "undefined"
        ? window.confirm("Clear history? This will remove all chosen designs.")
        : true;

    if (!confirmed && Platform.OS === "web") return;

    (async () => {
      try {
        await clearFn();
        await refresh();
      } catch (e: any) {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.alert("Clear failed: " + (e?.message ?? "Unknown error"));
        }
      }
    })();
  }, [clearFn, refresh]);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Chosen History</Text>

        <Pressable onPress={onClear} style={styles.clearBtn} hitSlop={10}>
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>

      {loading ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : errorLine ? (
        <Text style={styles.error}>{errorLine}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.muted}>No designs chosen yet.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.rowId}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={styles.thumbPlaceholderText}>No image</Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.meta}>{formatChosenAt(item.chosenAt)}</Text>
                </View>

                <Pressable
                  onPress={() =>
                    shareDesign({
                      title: item.title,
                      imageUri: item.imageUri,
                      chosenAt: item.chosenAt,
                    })
                  }
                  style={styles.shareBtn}
                  hitSlop={12}
                >
                  <Text style={styles.shareText}>Share</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  backBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  backText: { fontWeight: "800" },

  title: { fontSize: 20, fontWeight: "900", flex: 1 },

  clearBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  clearText: { fontWeight: "800" },

  muted: { marginTop: 8, opacity: 0.7 },
  error: { marginTop: 8, color: "crimson" as any, fontWeight: "800" },

  card: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center", opacity: 0.5 },
  thumbPlaceholderText: { fontSize: 11 },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  meta: { marginTop: 4, opacity: 0.75 },

  shareBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: { fontWeight: "900" },
});
