import { Platform } from "react-native";

const KEY = "gwyg_artist_pin";
let memoryPin = "1234";

export function getArtistPin(): string {
  try {
    if (Platform.OS === "web") {
      const v = localStorage.getItem(KEY);
      return v && v.trim() ? v : "1234";
    }
  } catch {}
  return memoryPin || "1234";
}

export function setArtistPin(pin: string) {
  const clean = (pin || "").replace(/\D/g, "").slice(0, 8); // allow 4-8 digits
  if (!clean) return;
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(KEY, clean);
      return;
    }
  } catch {}
  memoryPin = clean;
}

export function verifyArtistPin(pin: string): boolean {
  const clean = (pin || "").replace(/\D/g, "");
  return clean === getArtistPin();
}
