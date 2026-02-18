const LLYFI_DISPLAY_SYMBOL_OVERRIDES: Record<string, string> = {
  upYFI: "supYFI",
};

const LLYFI_CANONICAL_SYMBOLS: Record<string, string> = {
  sdyfi: "sdYFI",
  upyfi: "upYFI",
  supyfi: "upYFI",
  coveyfi: "coveYFI",
};

export function normalizeLlyfiSymbol(symbol: string): string {
  const trimmed = symbol.trim();
  return LLYFI_CANONICAL_SYMBOLS[trimmed.toLowerCase()] ?? trimmed;
}

export function getLlyfiDisplaySymbol(symbol: string): string {
  const canonical = normalizeLlyfiSymbol(symbol);
  return LLYFI_DISPLAY_SYMBOL_OVERRIDES[canonical] ?? canonical;
}
