import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Your tabs live here */}
      <Stack.Screen name="(tabs)" />

      {/* Extra pages outside tabs */}
      <Stack.Screen name="history" />
    </Stack>
  );
}
