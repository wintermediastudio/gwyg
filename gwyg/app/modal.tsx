// app/modal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  Pressable,
  Share,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { addToChosenHistory } from "../src/storage/chosenHistory";

type AnyObj = Record<string, any>;

function tryParseJson(value: any): AnyObj | null {
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as AnyObj) : null;
  } catch {
    return null;
  }
}

export default function ModalScreen() {
  const params = useLocalSearchParams();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const didSaveRef = useRef(false);

  const design = useMemo(() => {
    const p = params as AnyObj;

    // Try common JSON payload params first
    const jsonCandidates = [p.design, p.selectedDesign, p.chosenDesign, p.pickedDesign, p.item, p.payload];
    for (const c of jsonCandidates) {
      const parsed = tryParseJson(c);
      if (parsed) return parsed;
    }

    // Fallback to individual params with lots of aliases
    return {
      id: p.id ?? p.designId ?? p.designID ?? p.selectedId ?? p.chosenId ?? p.pickedId,
      title: p.title ?? p.designTitle ?? p.name ?? p.designName,
      imageUri: p.imageUri ?? p.uri ?? p.image ?? p.imageURL ?? p.imageUrl ?? p.preview,
    } as AnyObj;
  }, [params]);

  const title =
    String(design?.title ?? design?.name ?? design?.designName ?? design?.designTitle ?? "Chosen Design");

  const imageUri =
    (design?.imageUri ?? design?.uri ?? design?.image ?? design?.imageURL ?? design?.imageUrl) as
      | string
      | undefined;

  // Ensure we always have an id to save with
  const designId = String(
    design?.id ??
      design?.designId ??
      design?.designID ??
      (imageUri ? `img-${hashString(imageUri)}` : `generated-${Date.now()}`)
  );

  useEffect(() => {
    // Auto-save once per modal open
    if (didSaveRef.current) return;

    (async () => {
      try {
        didSaveRef.current = true;
        setSaving(true);

        await addToChosenHistory({
          id: designId,
          title,
          imageUri,
        });

        setSaving(false);
        setSaved(true);
      } catch (e: any) {
        setSaving(false);
        setSaved(false);
        Alert.alert("Could not save to history", e?.message ?? "Unknown error.");
      }
    })();
  }, [designId, title, imageUri]);

  const handleClose = () => router.back();

  const handleShare = async () => {
    try {
      await Share.share({
        message: `GWYG Pick: ${title}`,
        url: imageUri,
      });
    } catch (e: any) {
      Alert.alert("Share failed", e?.message ?? "Could not share.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Chosen Design</Text>

      <View style={styles.card}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={styles.placeholderText}>No image provided</Text>
          </View>
        )}

        <View style={styles.statusRow}>
          {saving ? (
            <Text style={styles.status}>Saving to history…</Text>
          ) : saved ? (
            <Text style={[styles.status, styles.statusGood]}>Saved to history ✅</Text>
          ) : (
            <Text style={[styles.status, styles.statusBad]}>Not saved</Text>
          )}
        </View>

        <View style={styles.btnRow}>
          <Pressable style={styles.btn} onPress={handleShare}>
            <Text style={styles.btnText}>Share</Text>
          </Pressable>

          <Pressable style={styles.btnGhost} onPress={handleClose}>
            <Text style={styles.btnGhostText}>Done</Text>
          </Pressable>
        </View>

        <Text style={styles.small}>Saved ID: {designId}</Text>
      </View>
    </ScrollView>
  );
}

// tiny deterministic hash so imageUri can become an id if needed
function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16);
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 28 },
  header: { fontSize: 22, fontWeight: "900", marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 12 },
  title: { fontSize: 16, fontWeight: "900" },
  image: { width: "100%", height: 320, borderRadius: 14, borderWidth: 1 },
  imagePlaceholder: { alignItems: "center", justifyContent: "center", opacity: 0.7, padding: 16 },
  placeholderText: { fontWeight: "800" },
  statusRow: { marginTop: 2 },
  status: { opacity: 0.85, fontWeight: "700" },
  statusGood: { opacity: 0.9 },
  statusBad: { opacity: 0.9 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnText: { fontWeight: "900" },
  btnGhost: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center" },
  btnGhostText: { fontWeight: "900" },
  small: { fontSize: 12, opacity: 0.7 },
});
