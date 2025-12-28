import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getSettings,
  listAllDesigns,
  listFolders,
  markDesignUnavailable,
  type Design,
  type Folder,
} from "../src/db/db";
import { addHistory } from "../src/history/historyStore";
import { verifyArtistPin } from "../src/lock/pinStore";

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

function Button({
  label,
  onPress,
  variant = "outline",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "outline" | "solid";
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "#000",
        backgroundColor: variant === "solid" ? "#000" : "transparent",
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Text
        style={{
          fontWeight: "900",
          textAlign: "center",
          color: variant === "solid" ? "#fff" : "#000",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function findFolderName(folderId: number | null | undefined, folders: Folder[]) {
  if (folderId === undefined) return "All";
  if (folderId === null) return "Unsorted";
  const f = folders.find((x) => x.id === folderId);
  return f?.name ?? "Unknown folder";
}

function filterByFolder(designs: Design[], folderId: number | null | undefined) {
  if (folderId === undefined) return designs;
  if (folderId === null) return designs.filter((d) => d.folderId === null);
  return designs.filter((d) => d.folderId === folderId);
}

type LockedStep = "client" | "pin" | "artist";

async function shareDesignPayload(opts: {
  title: string;
  message: string;
  url?: string;
}) {
  // Native (iOS/Android) works great with Share.share.
  // Web is inconsistent; we try Share.share first, then fall back.
  try {
    await Share.share(
      Platform.OS === "web"
        ? { title: opts.title, message: opts.message }
        : { title: opts.title, message: opts.message, url: opts.url }
    );
    return;
  } catch (e) {
    // fall through to web fallback
  }

  if (Platform.OS === "web") {
    const text = [opts.title, opts.message, opts.url].filter(Boolean).join("\n");
    const nav: any = typeof navigator !== "undefined" ? navigator : null;

    // Try Web Share API if available
    try {
      if (nav?.share) {
        await nav.share({ title: opts.title, text, url: opts.url });
        return;
      }
    } catch {}

    // Clipboard fallback
    try {
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        alert("Copied to clipboard!");
        return;
      }
    } catch {}

    // Last resort: just alert the text
    alert(text);
  }
}

export default function Play() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [settings, setSettings] = useState(() => getSettings());

  const [current, setCurrent] = useState<Design | null>(null);
  const [rerollsLeft, setRerollsLeft] = useState<number>(getSettings().rerolls ?? 1);

  // TURN LOCK: once chosen, client cannot roll again until staff resets.
  const [turnLocked, setTurnLocked] = useState(false);

  // “Design locked in” modal (stays up while turnLocked === true)
  const [lockedVisible, setLockedVisible] = useState(false);
  const [lockedStep, setLockedStep] = useState<LockedStep>("client");

  // PIN state
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // Play-page artist reset gate
  const [artistGateVisible, setArtistGateVisible] = useState(false);

  function refreshFromDb() {
    const s = getSettings();
    setSettings(s);
    setFolders(listFolders());
    return s;
  }

  function getPoolForSettings(s: ReturnType<typeof getSettings>) {
    const all = listAllDesigns(undefined);
    const inPool = all.filter((d) => d.isAvailable === 1);
    return filterByFolder(inPool, s.defaultRollFolderId);
  }

  function resetForNextClient() {
    const s = refreshFromDb();

    setTurnLocked(false);
    setCurrent(null);
    setRerollsLeft(s.rerolls ?? 1);

    setLockedVisible(false);
    setLockedStep("client");

    setArtistGateVisible(false);

    setPin("");
    setPinError(null);
  }

  useEffect(() => {
    refreshFromDb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Support Settings button: /play?reset=1
  useEffect(() => {
    if (params?.reset === "1") {
      resetForNextClient();
      router.replace("/play" as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.reset]);

  const folderLabel = useMemo(
    () => findFolderName(settings.defaultRollFolderId, folders),
    [settings.defaultRollFolderId, folders]
  );

  const poolNow = useMemo(() => getPoolForSettings(settings), [settings, folders]);

  function pickRandom() {
    const s = refreshFromDb();
    const pool = getPoolForSettings(s);

    if (!pool.length) {
      setCurrent(null);
      return;
    }
    const next = pool[Math.floor(Math.random() * pool.length)];
    setCurrent(next);
  }

  function onRollInitial() {
    if (turnLocked) return;
    setLockedVisible(false);
    setLockedStep("client");
    pickRandom();
  }

  function onReroll() {
    if (turnLocked) return;
    if (rerollsLeft <= 0) return;
    setRerollsLeft((x) => Math.max(0, x - 1));
    pickRandom();
  }

  function onChooseThis() {
    if (turnLocked) return;
    if (!current) return;

    const s = refreshFromDb();
    const folderName = findFolderName(s.defaultRollFolderId, listFolders());

    addHistory({
      designId: current.id,
      designName: current.name,
      imageUri: current.imageUri ?? undefined,
      folderName,
    });

    if (s.allowRepeats === false) {
      markDesignUnavailable(current.id);
    }

    setTurnLocked(true);
    setLockedStep("client");
    setLockedVisible(true);

    setPin("");
    setPinError(null);
  }

  const hasAny = poolNow.length > 0;

  function openArtistResetFromPlay() {
    setArtistGateVisible(true);
    setPin("");
    setPinError(null);
  }

  function submitArtistGate() {
    if (!verifyArtistPin(pin)) {
      setPinError("Wrong PIN.");
      return;
    }
    setPinError(null);
    resetForNextClient();
  }

  function submitLockedPin() {
    if (!verifyArtistPin(pin)) {
      setPinError("Wrong PIN.");
      return;
    }
    setPinError(null);
    setPin("");
    setLockedStep("artist");
  }

  async function shareCurrentDesign() {
    if (!current) return;
    const s = refreshFromDb();
    const folderName = findFolderName(s.defaultRollFolderId, listFolders());

    const title = "GWYG — Design Chosen";
    const url = current.imageUri ?? undefined;
    const message = [
      `Design: ${current.name}`,
      `Folder: ${folderName}`,
      url ? `Image: ${url}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await shareDesignPayload({ title, message, url });
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title="Play" />

      {/* Artist PIN Gate (from PLAY page button) */}
      <Modal visible={artistGateVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", padding: 18, justifyContent: "center" }}>
          <View style={{ backgroundColor: "#fff", borderRadius: 22, borderWidth: 2, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 22, fontWeight: "900" }}>Artist reset</Text>
            <Text style={{ opacity: 0.75 }}>Enter the artist PIN to reset for the next client.</Text>

            <TextInput
              value={pin}
              onChangeText={(t) => {
                setPinError(null);
                setPin(t.replace(/\D/g, "").slice(0, 8));
              }}
              placeholder="PIN"
              keyboardType="number-pad"
              secureTextEntry
              style={{
                borderWidth: 2,
                borderColor: "#000",
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 12,
                fontWeight: "900",
              }}
            />

            {pinError ? <Text style={{ color: "crimson", fontWeight: "900" }}>{pinError}</Text> : null}

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Cancel"
                  onPress={() => {
                    setArtistGateVisible(false);
                    setPin("");
                    setPinError(null);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Reset now" onPress={submitArtistGate} variant="solid" />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* LOCKED TURN MODAL */}
      <Modal visible={lockedVisible} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.55)",
            padding: 18,
            justifyContent: "center",
          }}
        >
          <View style={{ backgroundColor: "#fff", borderRadius: 22, borderWidth: 2, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 24, fontWeight: "900" }}>🎉 Design locked in!</Text>

            <Text style={{ opacity: 0.75 }}>
              Please show your artist. Your turn is finished until staff resets the app.
            </Text>

            <View style={{ borderWidth: 2, borderRadius: 18, padding: 12, gap: 10 }}>
              <Text style={{ fontSize: 18, fontWeight: "900" }}>
                {current?.name ?? "Chosen design"}
              </Text>

              {current?.imageUri ? (
                <Image
                  source={{ uri: current.imageUri }}
                  style={{ width: "100%", height: 280, borderRadius: 14, borderWidth: 1 }}
                  resizeMode="contain"
                />
              ) : (
                <View
                  style={{
                    width: "100%",
                    height: 200,
                    borderRadius: 14,
                    borderWidth: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontWeight: "900" }}>No image</Text>
                </View>
              )}
            </View>

            {lockedStep === "client" ? (
              <Button
                label="Artist options"
                onPress={() => {
                  setLockedStep("pin");
                  setPin("");
                  setPinError(null);
                }}
                variant="solid"
              />
            ) : null}

            {lockedStep === "pin" ? (
              <View style={{ gap: 10 }}>
                <View style={{ borderWidth: 2, borderRadius: 16, padding: 12, backgroundColor: "#f7f7f7", gap: 8 }}>
                  <Text style={{ fontWeight: "900" }}>Artist unlock</Text>
                  <Text style={{ opacity: 0.75 }}>Enter PIN to access share + reset + history.</Text>

                  <TextInput
                    value={pin}
                    onChangeText={(t) => {
                      setPinError(null);
                      setPin(t.replace(/\D/g, "").slice(0, 8));
                    }}
                    placeholder="PIN"
                    keyboardType="number-pad"
                    secureTextEntry
                    style={{
                      borderWidth: 2,
                      borderColor: "#000",
                      borderRadius: 14,
                      paddingVertical: 12,
                      paddingHorizontal: 12,
                      fontWeight: "900",
                      backgroundColor: "#fff",
                    }}
                  />

                  {pinError ? <Text style={{ color: "crimson", fontWeight: "900" }}>{pinError}</Text> : null}
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      label="Back"
                      onPress={() => {
                        setLockedStep("client");
                        setPin("");
                        setPinError(null);
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label="Unlock" onPress={submitLockedPin} variant="solid" />
                  </View>
                </View>
              </View>
            ) : null}

            {lockedStep === "artist" ? (
              <View style={{ gap: 10 }}>
                <View style={{ borderWidth: 2, borderRadius: 16, padding: 12, backgroundColor: "#f7f7f7" }}>
                  <Text style={{ fontWeight: "900" }}>Artist options</Text>
                  <Text style={{ opacity: 0.75 }}>
                    Share sends the chosen design info. Reset ends this client turn and starts the next.
                  </Text>
                </View>

                <Button label="Share chosen design" onPress={shareCurrentDesign} />
                <Button label="View chosen history" onPress={() => router.push("/history" as any)} />
                <Button label="Reset for next client" onPress={resetForNextClient} variant="solid" />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <View style={{ gap: 6 }}>
          <Text style={{ fontWeight: "900" }}>Rolling from:</Text>
          <Text style={{ opacity: 0.75 }}>{folderLabel}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <View style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2 }}>
            <Text style={{ fontWeight: "900" }}>Re-rolls left: {rerollsLeft}</Text>
          </View>

          <Pressable
            onPress={openArtistResetFromPlay}
            style={{ paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 2 }}
          >
            <Text style={{ fontWeight: "900" }}>Reset (artist)</Text>
          </Pressable>

          {turnLocked ? (
            <View
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 2,
                backgroundColor: "#000",
              }}
            >
              <Text style={{ fontWeight: "900", color: "#fff" }}>TURN LOCKED</Text>
            </View>
          ) : null}
        </View>

        {!hasAny ? (
          <View style={{ borderWidth: 2, borderRadius: 20, padding: 14, gap: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: "900" }}>No designs available</Text>
            <Text style={{ opacity: 0.75 }}>
              Add designs in Library → Import, or change the default roll folder in Settings.
            </Text>
            <Button label="Go to Library Import" onPress={() => (router.push("/library-import" as any))} />
          </View>
        ) : null}

        <View style={{ borderWidth: 2, borderRadius: 20, padding: 14, gap: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "900" }}>
            {current ? current.name : "Ready to roll?"}
          </Text>

          {current?.imageUri ? (
            <Image
              source={{ uri: current.imageUri }}
              style={{ width: "100%", height: 320, borderRadius: 16, borderWidth: 1 }}
              resizeMode="contain"
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: 220,
                borderRadius: 16,
                borderWidth: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontWeight: "900", opacity: 0.7 }}>
                {current ? "No image for this design" : "Tap Roll to begin"}
              </Text>
            </View>
          )}

          {!current ? (
            <Button label="Roll" onPress={onRollInitial} variant="solid" disabled={turnLocked} />
          ) : (
            <View style={{ gap: 10 }}>
              <Button label="Choose this design" onPress={onChooseThis} variant="solid" disabled={turnLocked} />
              <Button
                label={`Re-roll (${rerollsLeft} left)`}
                onPress={onReroll}
                disabled={turnLocked || rerollsLeft <= 0}
              />
            </View>
          )}

          {turnLocked ? (
            <View style={{ marginTop: 8, padding: 12, borderWidth: 2, borderRadius: 16, backgroundColor: "#f7f7f7" }}>
              <Text style={{ fontWeight: "900" }}>This client’s turn is finished.</Text>
              <Text style={{ opacity: 0.75 }}>
                Staff must reset (PIN) to start the next client.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
