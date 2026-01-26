export const appCopy = {
  nav: {
    items: [{ label: "stYFI", href: "/styfi", variant: "primary" as const }],
  },
  header: {
    epoch: {
      label: "Epoch",
      withNumber: (epoch: number | string) => `Epoch ${epoch}`,
      remainingSuffix: "remaining",
      fallbackRemaining: "--",
    },
  },
} as const;
