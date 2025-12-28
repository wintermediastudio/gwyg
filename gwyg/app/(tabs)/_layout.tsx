import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="library" options={{ title: "Library" }} />
      <Tabs.Screen name="play" options={{ title: "Play" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />

      {/* Hide the template Explore tab if it still exists */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
