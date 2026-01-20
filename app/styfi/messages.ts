export const styfiCopy = {
  shared: {
    blacklistedTitle: "Blacklisted",
    blacklistedBody:
      "This address is restricted from making token transfers or making governance proposals. Voting or unstaking is still allowed.",
  },
  page: {
    stats: {
      totalSupply: { label: "Total Supply" },
      staked: { label: "Staked" },
      phase: {
        label: "State",
        value: "Staking live, voting coming soon",
      },
      apr: { label: "APR" },
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
    earningPower: {
      label: "Earning Power",
      tooltip:
        "Your share of the reward pool. Determined by your total amount of YFI in the system.",
    },
    compareAria: {
      expand: "Expand mode drawer",
      collapse: "Collapse mode drawer",
    },
    switchAria: (modeLabel: string) => `Switch to ${modeLabel}`,
    balanceSuffix: (modeLabel: string) => `in ${modeLabel}`,
    balanceWithExiting: (unstaking: string) =>
      `Active (+ ${unstaking} unstaking)`,
    balanceWithExited: (withdrawable: string) =>
      `Active (+ ${withdrawable} withdrawable)`,
    balanceExitingOnly: (unstaking: string) => `(${unstaking} unstaking)`,
    balanceExitedOnly: (withdrawable: string) => `(${withdrawable} withdrawable)`,
    disconnected: "Connect your wallet to view balances.",
    drawer: {
      title: "Choose how you want to stake",
      body: "Pick between vote-enabled stYFI and APR maximized stYFIx.",
    },
    activeBadge: "Selected",
    cards: {
      styfi: {
        title: "stYFI",
        kicker: "For active governance participants",
        description:
          "Participate in Yearn Governance. Vote on proposals to increase your yield. If you do not participate, your yield may reduce.",
      },
      x: {
        title: "stYFIx",
        kicker: "For max yield with no effort",
        description:
          "Voting is delegated to a group of individual Yearn contributors. Enjoy max yield without managing votes. Set, forget, and let builders steer.",
      },
    },
    voteBanner: {
      title: "Vote boost coming soon",
      body: "Once voting launches, voting on governance proposals will lead to increased rewards. Until then, both modes deliver the same APR.",
    },
  },
  hero: {
    kicker: "Choose your path",
    title: "Stake with stYFI or stYFIx",
    body: "stYFI earns standard rewards with a fixed cooldown. stYFIx delegates voting power for a simpler experience. Pick a mode to enter the cockpit.",
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
          "Delegated vault with boosted rewards and flexible deposits.",
        cta: (modeLabel: string) => `Enter ${modeLabel}`,
      },
    },
  },
  toolbar: {
    title: "Your position",
    summarySuffix: (modeLabel: string) => `as ${modeLabel}`,
    earningWeight: "Earning weight: 1.00x",
    descriptions: {
      styfi: "stYFI keeps your vote and earns standard rewards.",
      x: "stYFIx delegates voting to YBC and maximizes rewards.",
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
      resetCta: "Reset mock state",
    },
  },
  stakeManage: {
    kicker: (modeLabel: string) => `Manage ${modeLabel.toUpperCase()}`,
    tabs: {
      stake: "Stake",
      unstake: "Unstake",
    },
  },
  stakeTab: {
    amountLabel: "Amount to stake",
    balanceLabel: (balance: string) => `Balance: ${balance} YFI`,
    insufficientBalance: "Insufficient balance",
    approve: "Approve YFI",
    stake: "Stake YFI",
  },
  unstakeTab: {
    loading: "Loading unstake data…",
    disconnected: "Connect your wallet to manage unstaking.",
    empty: "Nothing in cooldown right now. Start a cooldown first.",
    availableLabel: (amount: string) => `${amount} YFI Available`,
    streamingLabel: (amount: string, time?: string) =>
      time
        ? `${amount} YFI Streaming (${time} left)`
        : `${amount} YFI Streaming`,
    withdrawHelper: "Funds available to withdraw",
    withdrawCta: "Withdraw YFI",
    amountLabel: "Start new cooldown",
    availableBalance: (amount: string, modeLabel: string) =>
      `Available: ${amount} ${modeLabel}`,
    insufficientBalance: "Exceeds available",
    warningTitle: "Action Rule",
    warningBody:
      "Adding to your cooldown will immediately claim any liquid assets and reset the 14-day timer for the stream.",
    helper: "Starts a 14-day cooldown. You can withdraw after the timer ends.",
    startCta: "Start new cooldown",
  },
  rewards: {
    title: "Claimable Rewards",
    epochLagNote:
      "Rewards represent yield from the previous epoch, streaming linearly over 14 days.",
    disconnected: "Connect your wallet to see rewards.",
    claimCta: "Claim Rewards",
  },
} as const;
