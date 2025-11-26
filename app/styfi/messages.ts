export const styfiCopy = {
  shared: {
    blacklistedTitle: "Blacklisted",
    blacklistedBody: "This address is restricted from using this interface.",
  },
  modes: {
    styfi: {
      label: "stYFI",
      kicker: "Standard staking",
      description:
        "stYFI keeps your vote and earns standard rewards with a fixed cooldown.",
    },
    x: {
      label: "stYFIx",
      kicker: "Boosted exposure",
      description:
        "stYFIx delegates voting to YBC and auto-compounds rewards in a shares vault.",
    },
  },
  page: {
    stats: {
      totalSupply: { label: "Total Supply", value: "36,666 YFI" },
      staked: { label: "Staked", value: "2,583 YFI" },
      apr: { label: "APR paid as USDS", value: "84.58%" },
    },
    connectBanner: {
      title: "Wallet not connected",
      body: "Connect your wallet to view and manage positions.",
      cta: "Connect wallet",
    },
  },
  modeSelector: {
    kicker: "Your position",
    compareLabel: "Compare modes",
    compareAria: {
      expand: "Expand mode drawer",
      collapse: "Collapse mode drawer",
    },
    switchAria: (modeLabel: string) => `Switch to ${modeLabel}`,
    balanceSuffix: (modeLabel: string) => `in ${modeLabel}`,
    disconnected: "Connect your wallet to view balances.",
    drawer: {
      title: "Choose how you want to stake",
      body:
        "Pick between standard stYFI and boosted stYFIx. You can switch any time without leaving the cockpit.",
    },
    activeBadge: "Selected",
    cards: {
      styfi: {
        title: "stYFI",
        kicker: "Standard staking",
        description:
          "Fixed share price, straightforward staking and cooldown.",
      },
      x: {
        title: "stYFIx",
        kicker: "Boosted exposure",
        description:
          "Shares-based vault with boosted rewards and flexible deposits.",
      },
    },
  },
  hero: {
    kicker: "Choose your path",
    title: "Stake with stYFI or stYFIx",
    body:
      "stYFI earns standard rewards with a fixed cooldown. stYFIx gives you boosted exposure with shares-based accounting. Pick a mode to enter the cockpit.",
    footer: {
      text: "Need veYFI?",
      linkLabel: "Go to veYFI",
    },
    cards: {
      styfi: {
        description: "Fixed share price, straightforward staking and cooldown.",
        cta: (modeLabel: string) => `Enter ${modeLabel}`,
      },
      x: {
        description:
          "Shares-based vault with boosted rewards and flexible deposits.",
        cta: (modeLabel: string) => `Enter ${modeLabel}`,
      },
    },
  },
  toolbar: {
    title: "Your position",
    summarySuffix: (modeLabel: string) => `as ${modeLabel}`,
    earningWeight: "Earning weight: 1.00x",
    descriptions: {
      styfi:
        "stYFI keeps your vote and earns standard rewards with a fixed cooldown.",
      x: "stYFIx delegates voting to YBC and auto-compounds rewards in a shares vault.",
    },
    mode: {
      styfiLabel: "stYFI",
      xLabel: "stYFIx",
    },
  },
  cockpit: {
    mockBanner: {
      title: "Mock mode",
      body: "This dashboard is running against mock clients while contracts finalize.",
    },
  },
  stakeManage: {
    kicker: (modeLabel: string) => `Manage ${modeLabel.toUpperCase()}`,
    tabs: {
      stake: "Stake",
      cooldown: "Cooldown",
      withdraw: "Withdraw",
    },
  },
  stakeTab: {
    amountLabel: "Amount to stake",
    balanceLabel: (balance: string) => `Balance: ${balance} YFI`,
    insufficientBalance: "Insufficient balance",
    approve: "Approve YFI",
    stake: (modeLabel: string) => `Stake ${modeLabel}`,
  },
  cooldownTab: {
    bannerTitle: "Cooldown active",
    bannerBody: "You already have a cooldown running for this mode.",
    amountLabel: "Amount to move into cooldown",
    availableLabel: (amount: string, modeLabel: string) =>
      `Available: ${amount} ${modeLabel}`,
    errorExceeds: "Exceeds available",
    helper:
      "Starts a 14-day cooldown. You can withdraw after the timer ends.",
    startCta: (modeLabel: string) => `Start cooldown for ${modeLabel}`,
  },
  withdrawTab: {
    loading: "Loading cooldown data…",
    disconnected: "Connect your wallet to see withdrawable amounts.",
    empty: "Nothing in cooldown right now. Start a cooldown first.",
    availableLabel: "Available to withdraw",
    readyIn: (time: string) => `Ready in ${time}`,
    cta: (modeLabel: string) => `Withdraw ${modeLabel}`,
  },
  rewards: {
    kicker: "Rewards",
    title: "stYFI rewards",
    accruingLabel: "Accruing (next epoch)",
    claimableLabel: "Claimable",
    claimableHelper: "Includes generic + boosted rewards.",
    disconnected: "Connect your wallet to see rewards.",
    claimCta: "Claim rewards",
  },
} as const;
