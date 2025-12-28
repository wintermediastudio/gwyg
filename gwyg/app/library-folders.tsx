import { useCallback, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { addFolder, deleteFolder, listFolders, type Folder } from "../src/db/db";

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

export default function LibraryFolders() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [folders, setFolders] = useState<Folder[]>(listFolders());

  useFocusEffect(
    useCallback(() => {
      setFolders(listFolders());
    }, [])
  );

  function onAdd() {
    const n = name.trim();
    if (!n) return;

    addFolder(n);
    setName("");
    setFolders(listFolders());
  }

  function onDelete(f: Folder) {
    if (f.name.toLowerCase() === "unsorted") return;

    Alert.alert("Delete folder?", `Delete "${f.name}"?\n\nDesigns won't be deleted.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteFolder(f.id);
          setFolders(listFolders());
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Folders" />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ opacity: 0.7 }}>
          Folders help you organize designs. Designs can belong to multiple folders.
        </Text>

        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "900" }}>New folder name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g., Florals, Spooky, Cute…"
            style={{
              borderWidth: 2,
              borderColor: "#000",
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 12,
            }}
          />
          <Pressable
            onPress={onAdd}
            style={{
              padding: 14,
              borderRadius: 14,
              borderWidth: 2,
              backgroundColor: "#000",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>
              Add folder
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 10 }}>
          {folders.map((f) => {
            const locked = f.name.toLowerCase() === "unsorted";
            return (
              <View
                key={f.id}
                style={{
                  borderWidth: 2,
                  borderRadius: 18,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "900" }}>{f.name}</Text>
                  {locked ? (
                    <Text style={{ opacity: 0.6 }}>Default folder (can’t delete)</Text>
                  ) : (
                    <Text style={{ opacity: 0.6 }}>Tap delete to remove this folder</Text>
                  )}
                </View>

                <Pressable
                  onPress={() => onDelete(f)}
                  disabled={locked}
                  style={{
                    borderWidth: 2,
                    borderRadius: 14,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    opacity: locked ? 0.4 : 1,
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>Delete</Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <Pressable
          onPress={() => router.push("/library-designs")}
          style={{ padding: 14, borderRadius: 14, borderWidth: 2 }}
        >
          <Text style={{ fontWeight: "900", textAlign: "center" }}>Go to Designs</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push("/library-import")}
          style={{ padding: 14, borderRadius: 14, borderWidth: 2 }}
        >
          <Text style={{ fontWeight: "900", textAlign: "center" }}>Go to Import</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
