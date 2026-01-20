export type StyfiAsset = "stYFI" | "stYFIx";

export function modeLabel(asset: StyfiAsset) {
  return asset;
}

export function isStyfiAsset(asset: StyfiAsset) {
  return asset === "stYFI";
}
