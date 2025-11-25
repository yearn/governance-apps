export type StyfiMode = "styfi" | "plus";

export function modeLabel(mode: StyfiMode) {
  return mode === "styfi" ? "stYFI" : "stYFI+";
}
