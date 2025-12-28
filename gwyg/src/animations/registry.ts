export type AnimationStyleId =
  | "gumball"
  | "plinko"
  | "duck"
  | "balloon"
  | "fishing"
  | "ornaments";

export type AnimationStyle = {
  id: AnimationStyleId;
  label: string;
  description?: string;
};

export const ANIMATION_STYLES: AnimationStyle[] = [
  { id: "gumball", label: "Gumball Machine", description: "Classic random draw" },
  { id: "plinko", label: "Plinko", description: "Drop + bounce to reveal" },
  { id: "duck", label: "Duck Carnival", description: "Pick-a-duck reveal" },
  { id: "balloon", label: "Balloon Pop", description: "Pop to reveal the design" },
  { id: "fishing", label: "Fishing", description: "Hook a prize to reveal" },
  { id: "ornaments", label: "Christmas Ornaments", description: "Holiday reveal" },
];
