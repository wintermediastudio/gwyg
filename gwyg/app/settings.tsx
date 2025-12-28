import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Modal, Switch } from "react-native";
import { useRouter } from "expo-router";
import { listFolders, getSettings, updateSettings, type Folder } from "../src/db/db";
import { getArtistPin, setArtistPin, verifyArtistPin } from "../src/lock/pinStore";

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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ borderWidth: 2, borderRadius: 20, padding: 14, gap: 12 }}>
      {children}
    </View>
  );
}

function Row({ title, subtitle, right }: { title: string; subtitle?: string; right: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "900" }}>{title}</Text>
        {subtitle ? <Text style={{ opacity: 0.7, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right}
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
        paddingVertical: 12,
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

function PinGateModal({
  visible,
  title,
  confirmLabel = "Unlock",
  onCancel,
  onSuccess,
}: {
  visible: boolean;
  title: string;
  confirmLabel?: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setPin("");
      setError(null);
    }
  }, [visible]);

  function submit() {
    if (verifyArtistPin(pin)) {
      setPin("");
      setError(null);
      onSuccess();
      return;
    }
    setError("Wrong PIN.");
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", padding: 18, justifyContent: "center" }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 22, borderWidth: 2, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: "900" }}>{title}</Text>
          <Text style={{ opacity: 0.75 }}>Enter the artist PIN to continue.</Text>

          <TextInput
            value={pin}
            onChangeText={(t) => {
              setError(null);
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

          {error ? <Text style={{ color: "crimson", fontWeight: "900" }}>{error}</Text> : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={confirmLabel} onPress={submit} variant="solid" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ChangePinModal({
  visible,
  onClose,
  onChanged,
}: {
  visible: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      setError(null);
    }
  }, [visible]);

  function submit() {
    const cur = currentPin.replace(/\D/g, "");
    const np = newPin.replace(/\D/g, "");
    const cp = confirmPin.replace(/\D/g, "");

    if (!verifyArtistPin(cur)) {
      setError("Current PIN is incorrect.");
      return;
    }
    if (np.length < 4) {
      setError("New PIN must be at least 4 digits.");
      return;
    }
    if (np !== cp) {
      setError("New PIN and confirmation do not match.");
      return;
    }

    setArtistPin(np);
    onChanged();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", padding: 18, justifyContent: "center" }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 22, borderWidth: 2, padding: 16, gap: 12 }}>
          <Text style={{ fontSize: 22, fontWeight: "900" }}>Change artist PIN</Text>
          <Text style={{ opacity: 0.75 }}>Use 4–8 digits.</Text>

          <TextInput
            value={currentPin}
            onChangeText={(t) => {
              setError(null);
              setCurrentPin(t.replace(/\D/g, "").slice(0, 8));
            }}
            placeholder="Current PIN"
            keyboardType="number-pad"
            secureTextEntry
            style={{ borderWidth: 2, borderColor: "#000", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, fontWeight: "900" }}
          />

          <TextInput
            value={newPin}
            onChangeText={(t) => {
              setError(null);
              setNewPin(t.replace(/\D/g, "").slice(0, 8));
            }}
            placeholder="New PIN"
            keyboardType="number-pad"
            secureTextEntry
            style={{ borderWidth: 2, borderColor: "#000", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, fontWeight: "900" }}
          />

          <TextInput
            value={confirmPin}
            onChangeText={(t) => {
              setError(null);
              setConfirmPin(t.replace(/\D/g, "").slice(0, 8));
            }}
            placeholder="Confirm new PIN"
            keyboardType="number-pad"
            secureTextEntry
            style={{ borderWidth: 2, borderColor: "#000", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12, fontWeight: "900" }}
          />

          {error ? <Text style={{ color: "crimson", fontWeight: "900" }}>{error}</Text> : null}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button label="Cancel" onPress={onClose} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Save PIN" onPress={submit} variant="solid" />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SettingsScreen() {
  const router = useRouter();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [rerollsText, setRerollsText] = useState("1");
  const [defaultFolderId, setDefaultFolderId] = useState<number | null | undefined>(undefined);
  const [allowRepeats, setAllowRepeats] = useState<boolean>(false);

  // artist-only access control
  const [pinGateVisible, setPinGateVisible] = useState(false);
  const [changePinVisible, setChangePinVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "history" | "reset">(null);

  const currentPinMasked = useMemo(() => {
    const p = getArtistPin();
    return "•".repeat(Math.max(4, p.length));
  }, [changePinVisible]);

  function refresh() {
    const s = getSettings();
    setFolders(listFolders());

    setRerollsText(String(s.rerolls ?? 1));
    setDefaultFolderId(s.defaultRollFolderId ?? undefined);
    setAllowRepeats(Boolean(s.allowRepeats));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveRerollsFromText(t: string) {
    const clean = (t || "").replace(/[^\d]/g, "");
    setRerollsText(clean);

    const n = Math.max(0, parseInt(clean || "0", 10));
    updateSettings({ rerolls: Number.isFinite(n) ? n : 0 });
  }

  function setFolderAndSave(id: number | null | undefined) {
    setDefaultFolderId(id);
    updateSettings({ defaultRollFolderId: id });
  }

  function setAllowRepeatsAndSave(v: boolean) {
    setAllowRepeats(v);
    updateSettings({ allowRepeats: v });
  }

  function requestArtistAction(action: "history" | "reset") {
    setPendingAction(action);
    setPinGateVisible(true);
  }

  function performArtistAction(action: "history" | "reset") {
    if (action === "history") {
      router.push("/history" as any);
      return;
    }
    if (action === "reset") {
      // This triggers the Play screen to reset via query param
      router.push("/play?reset=1" as any);
      return;
    }
  }

  const folderOptions = useMemo(() => {
    const base: Array<{ label: string; value: number | null | undefined }> = [
      { label: "All folders", value: undefined },
      { label: "Unsorted", value: null },
    ];
    const rest = folders.map((f) => ({ label: f.name, value: f.id }));
    return [...base, ...rest];
  }, [folders]);

  const selectedFolderLabel = useMemo(() => {
    const match = folderOptions.find((o) => o.value === defaultFolderId);
    return match?.label ?? "All folders";
  }, [defaultFolderId, folderOptions]);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Settings" />

      <PinGateModal
        visible={pinGateVisible}
        title="Artist unlock"
        onCancel={() => {
          setPinGateVisible(false);
          setPendingAction(null);
        }}
        onSuccess={() => {
          setPinGateVisible(false);
          if (pendingAction) performArtistAction(pendingAction);
          setPendingAction(null);
        }}
      />

      <ChangePinModal
        visible={changePinVisible}
        onClose={() => setChangePinVisible(false)}
        onChanged={() => {
          // re-render masked display
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        {/* Client-facing settings */}
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "900" }}>Client settings</Text>

          <Row
            title="Max re-rolls"
            subtitle="How many re-rolls a client can use."
            right={
              <TextInput
                value={rerollsText}
                onChangeText={saveRerollsFromText}
                keyboardType="number-pad"
                style={{
                  width: 90,
                  textAlign: "center",
                  borderWidth: 2,
                  borderColor: "#000",
                  borderRadius: 14,
                  paddingVertical: 10,
                  fontWeight: "900",
                }}
              />
            }
          />

          <Row
            title="Allow repeats"
            subtitle="If OFF, chosen designs are removed from the pool permanently."
            right={<Switch value={allowRepeats} onValueChange={setAllowRepeatsAndSave} />}
          />

          <View style={{ gap: 8 }}>
            <Text style={{ fontWeight: "900" }}>Default roll folder</Text>
            <Text style={{ opacity: 0.7 }}>
              Currently: <Text style={{ fontWeight: "900" }}>{selectedFolderLabel}</Text>
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {folderOptions.map((opt) => {
                const selected = opt.value === defaultFolderId;
                return (
                  <Pressable
                    key={`${String(opt.value)}-${opt.label}`}
                    onPress={() => setFolderAndSave(opt.value)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 2,
                      borderColor: "#000",
                      backgroundColor: selected ? "#000" : "transparent",
                      maxWidth: "100%",
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "900",
                        color: selected ? "#fff" : "#000",
                      }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={refresh}
              style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, borderWidth: 2, borderColor: "#000" }}
            >
              <Text style={{ fontWeight: "900", textAlign: "center" }}>Refresh folders list</Text>
            </Pressable>
          </View>
        </Card>

        {/* Artist-only settings */}
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "900" }}>Artist tools (PIN required)</Text>

          <Row
            title="Artist PIN"
            subtitle={`Current PIN: ${currentPinMasked}`}
            right={<Button label="Change PIN" onPress={() => setChangePinVisible(true)} />}
          />

          <View style={{ gap: 10 }}>
            <Button
              label="View chosen history"
              onPress={() => requestArtistAction("history")}
            />
            <Button
              label="Reset for next client"
              onPress={() => requestArtistAction("reset")}
              variant="solid"
            />
          </View>

          <Text style={{ opacity: 0.65, marginTop: 6 }}>
            Tip: “Reset for next client” resets the Play screen (clears current selection and restores re-roll count).
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
