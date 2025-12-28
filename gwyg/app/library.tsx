import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { listFolders, listAllDesigns, getSettings } from "../src/db/db";

function CardButton(props: { title: string; subtitle: string; onPress: () => void }) {
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
      <Text style={{ opacity: 0.75 }}>{props.subtitle}</Text>
    </Pressable>
  );
}

export default function LibraryHome() {
  const router = useRouter();

  const folders = listFolders();
  const allDesigns = listAllDesigns(undefined);
  const inPool = allDesigns.filter((d) => d.isAvailable === 1).length;
  const removed = allDesigns.length - inPool;

  const s = getSettings();
  const defaultFolderLabel =
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
          opacity: 0.9,
        }}
      >
        <Text style={{ fontWeight: "900" }}>Quick Stats</Text>
        <Text style={{ opacity: 0.8 }}>Folders: {folders.length}</Text>
        <Text style={{ opacity: 0.8 }}>Designs: {allDesigns.length}</Text>
        <Text style={{ opacity: 0.8 }}>In Pool: {inPool}</Text>
        <Text style={{ opacity: 0.8 }}>Removed: {removed}</Text>
        <Text style={{ opacity: 0.8 }}>Default Roll Folder: {defaultFolderLabel}</Text>
      </View>

      <CardButton
        title="Folders"
        subtitle="Create/delete folders and jump into a folder’s designs."
        onPress={() => router.push("/library-folders")}
      />

      <CardButton
        title="Designs"
        subtitle="Browse designs, move folders, toggle in/out of pool."
        onPress={() => router.push("/library-designs")}
      />

      <CardButton
        title="Import"
        subtitle="Add new designs (upload/pick image or paste URL)."
        onPress={() => router.push("/library-import")}
      />
    </View>
  );
}
