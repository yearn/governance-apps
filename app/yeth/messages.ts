export const yethCopy = {
  page: {
    title: "yETH Recovery",
    retiredBanner: "yETH has been retired. This interface is for recovery.",
    openStatus: "Claim open",
    closedStatus: "Claim ended",
    statusUnavailable: "Claim status unavailable",
    countdownUnavailable: "Waiting for claim window data",
    connectPrompt: "Connect your wallet to view your yETH recovery state.",
    connectCta: "Connect wallet",
    wrongNetworkTitle: "Wrong network",
    wrongNetworkBody:
      "Switch to Ethereum mainnet to view your yETH recovery position.",
    completeTitle: "Recovery complete",
    completeBody:
      "No claimable yETH balance or Recovery Vault position remains for this wallet.",
    noSnapshotClaimTitle: "No active recovery position",
    noSnapshotClaimBody:
      "This wallet currently has no active yETH recovery position. If you believe this is incorrect, submit a manual settlement/discrepancy request for review.",
    noSnapshotClaimManualCta: "Open manual settlement/discrepancy request",
    sections: {
      recovery: "Your Recovery",
      actions: "Choose how you want to recover",
      trust: "Contracts, Risks & Sources",
    },
  },
  fields: {
    wallet: "Wallet",
    snapshotValue: "Original Snapshot Value",
    recoveredValue: "Recovered Value",
    claimableNow: "ETH Claimable Now",
    recoveredSoFar: "Recovered so far",
    claimWindowEnds: "Claim Deadline",
    claimedAt: "Claimed At",
    claimTx: "View transaction",
    claimWindowClosed: "Claim Window Closed",
  },
  actions: {
    exit: {
      title: "Claim & Exit",
      subtitle: "Most Secure",
      body: [
        "Receive ETH immediately",
        "Recovery finalized, no further action required",
        "Avoid ongoing smart-contract and strategy risk",
      ],
      cta: (amount: string) => `Claim ${amount} ETH & Exit`,
    },
    stay: {
      title: "Active Recovery (Risk Exposed)",
      body: [
        "Receive Recovery Vault shares",
        "Position grows only from donated yield",
        "Ongoing smart-contract and strategy risk",
      ],
      cta: "Deposit claim into Recovery Vault",
    },
    redeem: (amount: string) => `Exit with ${amount} ETH`,
  },
  riskModal: {
    title: "yETH Recovery Vault - risk acknowledgement",
    body: "This option keeps your value inside smart contracts and yield strategies. Losses due to exploits, depegs, or failures may be unrecoverable. There is no recovery of the recovery.",
    checkbox: "I understand and accept these risks",
    cancel: "Cancel",
    continue: "Continue",
  },
  postClaim: {
    stayingTitle: "Recovery Position",
    valueLabel: "Liquidation Value",
  },
  claimEnded: {
    title: "Claim Window Closed",
    body: "The claim window has ended. Late claims are handled through the manual governance process.",
    cta: "Manual Late Claim Process",
  },
} as const;
