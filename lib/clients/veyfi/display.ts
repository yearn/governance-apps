const LLYFI_DISPLAY_SYMBOL_OVERRIDES: Record<string, string> = {
  upYFI: "supYFI",
};

export function getLlyfiDisplaySymbol(symbol: string): string {
  return LLYFI_DISPLAY_SYMBOL_OVERRIDES[symbol] ?? symbol;
}
