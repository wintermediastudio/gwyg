import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { loadLockState, saveLockState, type LockState } from "./lockStore";

export default function LockGate(props: {
  children: React.ReactNode;
  title?: string;
}) {
  const [lock, setLock] = useState<LockState | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    loadLockState().then(setLock);
  }, []);

  const locked = useMemo(() => !!lock?.enabled, [lock]);

  async function disableLock() {
    if (!lock) return;
    const next = { ...lock, enabled: false };
    await saveLockState(next);
    setLock(next);
    setPinInput("");
    setMsg(null);
  }

  async function tryUnlock() {
    if (!lock) return;

    if (lock.mode === "toggle") {
      await disableLock();
      return;
    }

    if (pinInput.trim() === lock.pin.trim()) {
      await disableLock();
    } else {
      setMsg("Wrong PIN");
      setTimeout(() => setMsg(null), 1200);
    }
  }

  if (!lock) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 16 }}>
        <Text style={{ fontWeight: "900" }}>Loading…</Text>
      </View>
    );
  }

  if (!locked) return <>{props.children}</>;

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 16, gap: 14 }}>
      <Text style={{ fontSize: 22, fontWeight: "900" }}>
        {props.title ?? "Locked"}
      </Text>

      <Text style={{ opacity: 0.8 }}>
        Client Mode is enabled. This section is locked.
      </Text>

      {lock.mode === "pin" && (
        <>
          <TextInput
            value={pinInput}
            onChangeText={setPinInput}
            placeholder="Enter PIN"
            secureTextEntry
            style={{
              borderWidth: 1,
              borderRadius: 14,
              padding: 12,
              fontSize: 16,
            }}
          />
          {msg && <Text style={{ fontWeight: "800" }}>{msg}</Text>}
        </>
      )}

      <Pressable
        onPress={tryUnlock}
        style={{
          borderWidth: 1,
          borderRadius: 16,
          padding: 14,
          alignItems: "center",
        }}
      >
        <Text style={{ fontWeight: "900" }}>
          {lock.mode === "pin" ? "Unlock" : "Unlock (No PIN)"}
        </Text>
      </Pressable>
    </View>
  );
}
