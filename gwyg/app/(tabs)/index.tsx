import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { initDb, seedPresetsIfEmpty } from "../../src/db/db";

export default function Home() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Never block the UI. If seeding fails, app still loads.
    setReady(true);
    try {
      initDb();
      seedPresetsIfEmpty(); // intentionally NOT awaited
    } catch {}
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "900" }}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "900" }}>Get What You Get</Text>
      <Text style={{ opacity: 0.7 }}>
        Add designs in Library, then let your client roll.
      </Text>

      <Pressable
        onPress={() => router.push("/(tabs)/play")}
        style={{ padding: 14, borderRadius: 14, borderWidth: 2, backgroundColor: "#000" }}
      >
        <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>Go to Play</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/(tabs)/library")}
        style={{ padding: 14, borderRadius: 14, borderWidth: 2 }}
      >
        <Text style={{ fontWeight: "900", textAlign: "center" }}>Go to Library</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/(tabs)/settings")}
        style={{ padding: 14, borderRadius: 14, borderWidth: 2 }}
      >
        <Text style={{ fontWeight: "900", textAlign: "center" }}>Go to Settings</Text>
      </Pressable>
    </View>
  );
}
