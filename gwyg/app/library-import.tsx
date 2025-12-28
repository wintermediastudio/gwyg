import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { addDesign, listFolders } from "../src/db/db";

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

export default function LibraryImport() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  const [folders, setFolders] = useState(listFolders());

  useFocusEffect(
    useCallback(() => {
      setFolders(listFolders());
    }, [])
  );

  const canAdd = useMemo(() => name.trim().length > 0, [name]);

  function onAdd() {
    if (!canAdd) return;

    addDesign({
      name: name.trim(),
      imageUri: imageUri.trim() || undefined,
      folderId: selectedFolderId,
    });

    setName("");
    setImageUri("");
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Import / Add" />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ opacity: 0.7 }}>
          Web: you can paste an image URL. Phone/tablet: we’ll add a file picker later.
        </Text>

        <Text style={{ fontWeight: "900" }}>Design name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Rose, Skull, Dagger…"
          style={{
            borderWidth: 2,
            borderColor: "#000",
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 12,
          }}
        />

        <Text style={{ fontWeight: "900" }}>Image URL (optional)</Text>
        <TextInput
          value={imageUri}
          onChangeText={setImageUri}
          placeholder="https://… or data:image/…"
          autoCapitalize="none"
          style={{
            borderWidth: 2,
            borderColor: "#000",
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 12,
          }}
        />

        <Text style={{ fontWeight: "900" }}>Assign to folder (optional)</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          <Chip
            label="Unsorted"
            selected={selectedFolderId === null}
            onPress={() => setSelectedFolderId(null)}
          />
          {folders
            .filter((f) => f.name.toLowerCase() !== "unsorted")
            .map((f) => (
              <Chip
                key={f.id}
                label={f.name}
                selected={selectedFolderId === f.id}
                onPress={() => setSelectedFolderId(f.id)}
              />
            ))}
        </View>

        <Pressable
          onPress={onAdd}
          disabled={!canAdd}
          style={{
            marginTop: 4,
            padding: 14,
            borderRadius: 14,
            borderWidth: 2,
            backgroundColor: canAdd ? "#000" : "#999",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>
            Add design
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/library-designs")}
          style={{
            padding: 14,
            borderRadius: 14,
            borderWidth: 2,
          }}
        >
          <Text style={{ fontWeight: "900", textAlign: "center" }}>Go to Designs</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
