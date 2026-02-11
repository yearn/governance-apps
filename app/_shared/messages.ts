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

export const crossAppNudgeCopy = {
  shared: {
    cta: {
      toVeyfi: "Visit veYFI website",
      toStyfi: "Visit stYFI website",
    },
  },
  styfiPage: {
    migration: {
      title: "Legacy veYFI lock detected",
      body: (legacyAmount: string) =>
        `${legacyAmount} veYFI is eligible for migration. Migrate and earn boosted rewards.`,
    },
    unstakedLlyfi: {
      title: "Unstaked liquid locker tokens detected",
      body: (tokenList: string) => `In wallet: ${tokenList}. Stake to earn rewards.`,
      fallback: "Stake your liquid locker positions to earn rewards.",
    },
  },
  veyfiPage: {
    unstakedYfi: {
      title: "Unstaked YFI detected",
      body: (yfiAmount: string) =>
        `${yfiAmount} YFI is available to stake into stYFI or stYFIx.`,
    },
  },
} as const;
