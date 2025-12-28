import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, Image, ScrollView, TextInput } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  listFolders,
  listAllDesigns,
  setDesignAvailability,
  toggleDesignFolder,
  type Design,
  type Folder,
} from "../src/db/db";

function Header({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View
      style={{
        padding: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderColor: "#ddd",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Pressable
        onPress={() => router.back()}
        style={{
          borderWidth: 2,
          borderColor: "#000",
          borderRadius: 12,
          paddingVertical: 8,
          paddingHorizontal: 10,
        }}
      >
        <Text style={{ fontWeight: "900" }}>← Back</Text>
      </Pressable>

      <Text style={{ fontSize: 22, fontWeight: "900" }}>{title}</Text>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: "#000",
        backgroundColor: selected ? "#000" : "transparent",
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontWeight: "900", color: selected ? "#fff" : "#000" }}>{label}</Text>
    </Pressable>
  );
}

export default function LibraryDesigns() {
  const router = useRouter();
  const params = useLocalSearchParams<{ folderId?: string }>();

  const initialFolderId =
    params.folderId === "null" ? null : params.folderId ? Number(params.folderId) : undefined;

  const [filterFolderId, setFilterFolderId] = useState<number | null | undefined>(initialFolderId);
  const [search, setSearch] = useState("");

  const folders = useMemo(() => listFolders(), []);
  const [designs, setDesigns] = useState<any[]>(listAllDesigns(filterFolderId));

  useFocusEffect(
    useCallback(() => {
      setDesigns(listAllDesigns(filterFolderId));
    }, [filterFolderId])
  );

  const filteredDesigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return designs;
    return designs.filter((d) => (d.name || "").toLowerCase().includes(q));
  }, [designs, search]);

  function togglePool(d: any) {
    const next = d.isAvailable === 1 ? 0 : 1;
    setDesignAvailability(d.id, next);
    setDesigns(listAllDesigns(filterFolderId));
  }

  function toggleFolder(d: any, folderId: number) {
    toggleDesignFolder(d.id, folderId);
    setDesigns(listAllDesigns(filterFolderId));
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Designs" />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ opacity: 0.7 }}>
          Tap folder chips to tag a design into multiple folders (Cute + Traditional, etc).
        </Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search designs…"
          style={{
            borderWidth: 2,
            borderColor: "#000",
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 12,
          }}
        />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Chip
            label="All"
            selected={filterFolderId === undefined}
            onPress={() => setFilterFolderId(undefined)}
          />
          <Chip
            label="Unsorted"
            selected={filterFolderId === null}
            onPress={() => setFilterFolderId(null)}
          />
          {folders
            .filter((f) => f.name.toLowerCase() !== "unsorted")
            .map((f) => (
              <Chip
                key={f.id}
                label={f.name}
                selected={filterFolderId === f.id}
                onPress={() => setFilterFolderId(f.id)}
              />
            ))}
        </View>

        {filteredDesigns.length === 0 ? (
          <View style={{ padding: 14, borderWidth: 1, borderRadius: 16 }}>
            <Text style={{ fontWeight: "900" }}>No designs found</Text>
            <Text style={{ opacity: 0.7, marginTop: 6 }}>
              Try changing filters, or import/add more designs.
            </Text>
            <Pressable
              onPress={() => router.push("/library-import")}
              style={{ marginTop: 10, borderWidth: 2, borderRadius: 14, padding: 12 }}
            >
              <Text style={{ fontWeight: "900", textAlign: "center" }}>Go to Import</Text>
            </Pressable>
          </View>
        ) : null}

        {filteredDesigns.map((d) => {
          const inPool = d.isAvailable === 1;
          return (
            <View
              key={d.id}
              style={{
                borderWidth: 2,
                borderRadius: 20,
                padding: 14,
                gap: 10,
              }}
            >
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                {d.imageUri ? (
                  <Image
                    source={{ uri: d.imageUri }}
                    style={{ width: 80, height: 80, borderRadius: 14, borderWidth: 1 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 14,
                      borderWidth: 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontWeight: "900" }}>No image</Text>
                  </View>
                )}

                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900" }}>{d.name}</Text>
                  <Text style={{ opacity: 0.7 }}>
                    Pool: <Text style={{ fontWeight: "900" }}>{inPool ? "IN" : "OUT"}</Text>
                  </Text>
                </View>

                <Pressable
                  onPress={() => togglePool(d)}
                  style={{
                    borderWidth: 2,
                    borderRadius: 14,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    backgroundColor: inPool ? "#000" : "transparent",
                  }}
                >
                  <Text style={{ fontWeight: "900", color: inPool ? "#fff" : "#000" }}>
                    {inPool ? "Remove" : "Add"}
                  </Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {folders.map((f) => {
                  const selected = Array.isArray(d.folderIds) && d.folderIds.includes(f.id);
                  return (
                    <Chip
                      key={f.id}
                      label={f.name}
                      selected={selected}
                      onPress={() => toggleFolder(d, f.id)}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
