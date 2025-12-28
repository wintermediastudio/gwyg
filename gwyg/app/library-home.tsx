import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { listFolders, listAllDesigns, getSettings } from "../src/db/db";

function Card(props: { title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        borderWidth: 1,
        borderRadius: 18,
        padding: 16,
        gap: 6,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "900" }}>{props.title}</Text>
      <Text style={{ opacity: 0.7 }}>{props.subtitle}</Text>
    </Pressable>
  );
}

export default function LibraryHome() {
  const router = useRouter();
  const folders = listFolders();
  const designs = listAllDesigns(undefined);
  const inPool = designs.filter((d) => d.isAvailable === 1).length;
  const removed = designs.length - inPool;

  const s = getSettings();
  const folderLabel =
    s.defaultRollFolderId == null ? "All" : `Folder #${s.defaultRollFolderId}`;

  return (
    <View style={{ flex: 1, padding: 16, gap: 14 }}>
      <Text style={{ fontSize: 24, fontWeight: "900" }}>Library</Text>

      <View
        style={{
          borderWidth: 1,
          borderRadius: 18,
          padding: 14,
          gap: 6,
        }}
      >
        <Text style={{ fontWeight: "900" }}>Quick Stats</Text>
        <Text>Folders: {folders.length}</Text>
        <Text>Designs: {designs.length}</Text>
        <Text>In Pool: {inPool}</Text>
        <Text>Removed: {removed}</Text>
        <Text>Default Roll Folder: {folderLabel}</Text>
      </View>

      <Card
        title="Folders"
        subtitle="Create and manage folders"
        onPress={() => router.push("/library-folders")}
      />

      <Card
        title="Designs"
        subtitle="Browse and organize designs"
        onPress={() => router.push("/library-designs")}
      />

      <Card
        title="Import"
        subtitle="Add new designs"
        onPress={() => router.push("/library-import")}
      />
    </View>
  );
}
