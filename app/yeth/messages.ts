export const yethCopy = {
  page: {
    title: "yETH Recovery",
    retiredBanner: "yETH has been retired. This interface is for recovery.",
    openStatus: "Claim open",
    closedStatus: "Claim ended",
    connectPrompt:
      "Connect your wallet to check eligibility and recover ETH.",
    connectCta: "Connect wallet",
    sections: {
      recovery: "Your Recovery",
      actions: "Choose how you want to recover",
      trust: "Trust & verify",
    },
  },
  fields: {
    wallet: "Wallet",
    eligibility: "Eligibility",
    claimStatus: "Claim status",
    snapshotValue: "Original Snapshot Value",
    claimableNow: "ETH Claimable Now",
    recoveredSoFar: "Recovered so far",
    claimWindowEnds: "Claim Window",
    claimWindowClosed: "Claim Window Closed",
  },
  actions: {
    exit: {
      title: "Claim & Exit",
      subtitle: "Recommended",
      body: [
        "Receive ETH immediately",
        "Recovery complete",
      ],
      cta: (amount: string) => `Claim ${amount} ETH & Exit`,
    },
    stay: {
      title: "Active Recovery (Advanced)",
      body: [
        "Receive Recovery Vault shares",
        "Ongoing smart-contract and strategy risk",
      ],
      cta: "Recover into Vault A",
    },
    redeem: (amount: string) => `Cash out ${amount} ETH`,
  },
  riskModal: {
    title: "Recover into Vault A - risk acknowledgement",
    body: "This option keeps your value inside smart contracts and yield strategies. Losses due to exploits, depegs, or failures may be unrecoverable. There is no recovery of the recovery.",
    checkbox: "I understand and accept these risks",
    cancel: "Cancel",
    continue: "Continue",
  },
  postClaim: {
    exitedTitle: "Recovery Complete",
    exitedNote: "You no longer participate in future recovery yield.",
    stayingTitle: "Recovery Position",
    valueLabel: "Liquidation Value",
    received: "You received",
    recoveredTotal: "Recovered total",
    transaction: "Transaction",
    shares: "Shares",
    pps: "Current PPS",
    value: "Current value",
  },
  claimEnded: {
    title: "Claim Window Closed",
    body: "The claim window has ended. Late claims are handled through the manual governance process.",
    cta: "Manual Late Claim Process",
  },
} as const;
