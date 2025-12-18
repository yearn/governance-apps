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
      title: "Legacy veYFI detected",
      body: (amount: string) =>
        `You have ${amount} legacy veYFI. Migrate now to participate in the new system.`,
      cta: "Migrate to veYFI",
    },
    boost: {
      title: "veYFI Boost Active",
      body: "Your legacy lock is providing a yield boost. This boost decays linearly over your remaining lock duration.",
      decayLabel: "Boost Decay",
      manageLink: "Manage Legacy Lock",
    },
  },
  redemptionCard: {
    title: "Redemption Intelligence",
    globalCapLabel: "Global Cap Used",
    feeLabel: "Current Exit Fee",
    availabilityTitle: "Token Availability",
    availabilityItem: (symbol: string, amount: string) =>
      `${symbol}: ${amount} YFI available`,
    capFull: "Cap Full",
  },
  manage: {
    title: "LLYFI Tokens",
    columns: {
      asset: "Asset",
      apy: "Net APY",
      wallet: "Wallet",
      staked: "Staked",
    },
    row: {
      apyValue: (base: string, boost: string) => `${base} + ${boost} boost`,
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
    title: "LLYFI Rewards",
    amountLabel: "Total Claimable",
    linkCta: "Go to Dashboard",
    claimCta: "Claim here",
    helper: "View your full Earning Power on the stYFI Dashboard.",
    empty: "No rewards pending.",
  },
} as const;
