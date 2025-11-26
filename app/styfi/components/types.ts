export type StyfiMode = "styfi" | "x";

export function modeLabel(mode: StyfiMode) {
  return mode === "styfi" ? "stYFI" : "stYFIx";
}
