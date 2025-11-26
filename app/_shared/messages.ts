export const appCopy = {
  nav: {
    items: [
      { label: "stYFI", href: "/styfi" },
      { label: "veYFI", href: "/veyfi" },
    ],
  },
  header: {
    epoch: {
      label: "Epoch",
      withNumber: (epoch: number | string) => `Epoch ${epoch}`,
      remainingSuffix: "remaining",
      fallbackRemaining: "--",
    },
    yfi: {
      symbol: "YFI",
      notConnected: "Not connected",
    },
  },
  launcher: {
    apps: [
      { name: "v3 Vaults", href: "https://yearn.fi/v3" },
      { name: "v2 Vaults", href: "https://yearn.fi/vaults" },
      { name: "yCRV", href: "https://ycrv.yearn.fi" },
      { name: "yETH", href: "https://yeth.yearn.fi" },
      { name: "Juiced", href: "https://juiced.yearn.fi" },
    ],
  },
} as const;

