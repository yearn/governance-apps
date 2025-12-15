export const appCopy = {
  nav: {
    items: [
      { label: "stYFI", href: "/styfi", variant: "primary" as const },
      {
        label: "Docs",
        href: "https://docs.yearn.fi/contributing/governance/stYFI-intro",
        variant: "secondary" as const,
      },
      {
        label: "Support",
        href: "https://discord.gg/yearn",
        variant: "secondary" as const,
      },
      {
        label: "Blog",
        href: "https://blog.yearn.fi/",
        variant: "secondary" as const,
      },
      {
        label: "Discourse",
        href: "https://gov.yearn.fi/",
        variant: "secondary" as const,
      },
    ],
  },
  header: {
    epoch: {
      label: "Epoch",
      withNumber: (epoch: number | string) => `Epoch ${epoch}`,
      remainingSuffix: "remaining",
      fallbackRemaining: "--",
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
