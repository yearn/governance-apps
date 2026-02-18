const LLYFI_DISPLAY_SYMBOL_OVERRIDES: Record<string, string> = {
  upYFI: "supYFI",
};

const LLYFI_CANONICAL_SYMBOL_OVERRIDES: Record<string, string> = {
  supYFI: "upYFI",
};

export function normalizeLlyfiSymbol(symbol: string): string {
  return LLYFI_CANONICAL_SYMBOL_OVERRIDES[symbol] ?? symbol;
}

export function getLlyfiDisplaySymbol(symbol: string): string {
  const canonical = normalizeLlyfiSymbol(symbol);
  return LLYFI_DISPLAY_SYMBOL_OVERRIDES[canonical] ?? canonical;
}
