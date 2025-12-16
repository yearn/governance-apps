const formatYfi = (value: number) =>
  `${value.toLocaleString("en-US", { maximumFractionDigits: 0 })} YFI`;

const totalSupplyAmount = 36_666;
const stakedAmount = 2_583;

export const styfiCopy = {
  shared: {
    blacklistedTitle: "Blacklisted",
    blacklistedBody:
      "This address is restricted from making token transfers or making governance proposals. Voting or unstaking is still allowed.",
  },
  page: {
    stats: {
      totalSupply: {
        label: "Total Supply",
        value: formatYfi(totalSupplyAmount),
        amount: totalSupplyAmount,
      },
      staked: {
        label: "Staked",
        value: formatYfi(stakedAmount),
        amount: stakedAmount,
      },
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
    compareAria: {
      expand: "Expand mode drawer",
      collapse: "Collapse mode drawer",
    },
    switchAria: (modeLabel: string) => `Switch to ${modeLabel}`,
    balanceSuffix: (modeLabel: string) => `in ${modeLabel}`,
    balanceWithExiting: (exiting: string) => `Active (+ ${exiting} exiting)`,
    balanceWithExited: (exited: string) => `Active (+ ${exited} exited)`,
    balanceExitingOnly: (exiting: string) => `(${exiting} exiting)`,
    balanceExitedOnly: (exited: string) => `(${exited} exited)`,
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
    body: "stYFI earns standard rewards with a fixed cooldown. stYFIx gives you boosted exposure with shares-based accounting. Pick a mode to enter the cockpit.",
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
    loading: "Loading exit data…",
    disconnected: "Connect your wallet to manage cooldowns.",
    empty: "Nothing in cooldown right now. Start a cooldown first.",
    progressTitle: "Unstaking Progress",
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
    warningTitle: "Timer reset warning",
    warningBody:
      "Adding to cooldown will reset the 14-day timer for the remaining stream.",
    helper: "Starts a 14-day cooldown. You can withdraw after the timer ends.",
    startCta: "Start Cooldown",
  },
  rewards: {
    kicker: "Rewards",
    title: "Stablecoin yield",
    accruingLabel: "Accruing (next epoch)",
    claimableLabel: "Claimable",
    claimableHelper: "Includes generic + boosted rewards.",
    disconnected: "Connect your wallet to see rewards.",
    claimCta: "Claim rewards",
  },
} as const;
