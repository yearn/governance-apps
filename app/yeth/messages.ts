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
    snapshotLoss: "Original loss (snapshot)",
    claimableNow: "ETH claimable now",
    recoveredSoFar: "Recovered so far",
    claimWindowEnds: "Claim window ends",
    claimWindowClosed: "Claim window closed",
  },
  actions: {
    exit: {
      title: "Get ETH now",
      subtitle: "Recommended",
      body: [
        "Receive ETH or WETH immediately",
        "Your recovery is complete",
      ],
      cta: "Claim & exit",
    },
    stay: {
      title: "Keep earning yield (higher risk)",
      body: [
        "Receive Recovery Vault shares",
        "Your value remains exposed to ongoing smart-contract and strategy risk",
      ],
      cta: "Claim & keep earning",
    },
    redeem: "Redeem to ETH now",
  },
  riskModal: {
    title: "Keep earning yield — risk acknowledgement",
    body: "This option keeps your value inside smart contracts and yield strategies. Losses due to exploits, depegs, or failures may be unrecoverable. There is no recovery of the recovery.",
    checkbox: "I understand and accept these risks",
    cancel: "Cancel",
    continue: "Continue",
  },
  postClaim: {
    exitedTitle: "Status: Completed",
    exitedNote: "You no longer participate in future recovery yield.",
    stayingTitle: "Status: Holding Recovery Vault shares",
    received: "You received",
    recoveredTotal: "Recovered total",
    transaction: "Transaction",
    shares: "Shares",
    pps: "Current PPS",
    value: "Current value",
  },
  claimEnded: {
    title: "Claim window ended",
    body: "If you did not claim during the window, late claims are handled manually.",
    cta: "Start late claim process",
  },
} as const;
