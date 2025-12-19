import { formatPercent } from "@/lib/format";

export const veyfiCopy = {
  page: {
    title: "veYFI / LLYFI",
    description:
      "Manage your legacy veYFI boost, stake liquid lockers (LLYFI) for rewards, or redeem for YFI.",
    stats: {
      migrated: { label: "Migrated veYFI" },
      boost: { label: "Max Boost" },
      staked: { label: "LLYFI Staked" },
      state: { label: "State", value: "Migration & Staking Open" },
    },
    connectBanner: {
      title: "Wallet not connected",
      body: "Connect your wallet to manage your LLYFI positions.",
      cta: "Connect wallet",
    },
  },
  migration: {
    legacy: {
      statLabel: "Legacy Position",
      title: "Legacy veYFI detected",
      description:
        "Your legacy locks can be used to boost your yield in the stYFI ecosystem. Opt-in now to participate in the new system.",
      cta: "Opt-in to stYFI",
    },
    boost: {
      title: "veYFI Boost Active",
      description:
        "Your legacy lock is active and boosting your yield. The multiplier decays linearly over time.",
      manageLink: "Manage Legacy Lock",
      stats: {
        unlockDate: "Unlock Date",
        amount: "Lock Amount",
        currentBoost: "Current Boost",
      },
      timeline: {
        start: "Max (2.0x)",
        end: "Min (1.0x)",
      },
    },
  },
  redemptionCard: {
    title: "Redemption Availability",
    globalCapLabel: "Global Cap Used",
    feeLabel: "Current Exit Fee",
    availabilityTitle: "Token Availability",
    availabilityItem: (symbol: string, amount: string) =>
      `${symbol}: ${amount} YFI available`,
    capFull: "Cap Full",
  },
  manage: {
    title: "Legacy Liquid Locker Tokens",
    columns: {
      asset: "Asset",
      backing: "Locker Status",
      ratio: "Staked Ratio",
      apr: "Effective APR",
      deposits: "Your Deposits",
    },
    row: {
      boostLabel: (val: string) => `${val} boost`,
      availableLabel: (val: string) => `Available: ${val}`,
      boostedBaseLabel: (val: string) => `${val} Boosted Base`,
      tooltips: {
        supply: (staked: string, total: string) => `Total Supply: ${total}`,
        ratio:
          "Ratio of total supply that is currently staked. Lower ratio results in higher effective yield.",
        apr: {
          base: "Base stYFI APR",
          boost: "veYFI Boost",
          boostedBase: "Boosted Base",
          ratio: "Staked Ratio",
          effective: "Effective APR",
        },
      },
    },
    cockpit: {
      tabs: {
        stake: "Stake",
        unstake: "Unstake",
        trade: "Trade",
      },
    },
    trade: {
      mint: {
        label: "Mint (YFI → LLYFI)",
        description: "Convert YFI to LLYFI 1:1. No fee.",
        cta: "Mint LLYFI",
        insufficientYfi: "Insufficient YFI",
      },
      redeem: {
        label: "Redeem (LLYFI → YFI)",
        description: "Redeem LLYFI for YFI. Subject to caps and exit fee.",
        cta: "Redeem YFI",
        insufficientLlyfi: "Insufficient LLYFI",
        capExceeded: "Cap Exceeded",
        feeNote: (fee: string) => `Includes ${fee} exit fee`,
      },
    },
  },
  rewards: {
    title: "Rewards",
    headline: "Claim your yvUSDC",
    amountLabel: "Total Claimable",
    linkCta: "Go to stYFI Dashboard",
    claimCta: "Claim here",
    helper:
      "All governance rewards are aggregated and claimable on the stYFI dashboard.",
    empty: "No rewards pending.",
  },
} as const;
