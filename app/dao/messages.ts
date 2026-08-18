import type {
  DaoDisplayStatus,
  DaoProposalType,
} from "@/lib/clients/dao";

export const daoCopy = {
  app: {
    name: "DAO Governance",
    route: "/dao",
    description: "Review proposals and take part in Yearn DAO decisions.",
  },
  navigation: {
    proposals: "Proposals",
    createProposal: "Create proposal",
    forum: "Discussion forum",
    forumHref: "https://gov.yearn.fi/",
    forumAccessibleLabel: "Open the Yearn discussion forum in a new tab",
  },
  wallet: {
    disconnectedTitle: "Wallet not connected",
    browseDisconnected:
      "Proposal history stays public. Connect a wallet when you want to vote or use a proposal action.",
    proposeDisconnected:
      "Connect a wallet from the header to check whether you can create a proposal.",
  },
  board: {
    title: "Proposal board",
    description: "Review active, upcoming, and closed proposals.",
    available: (count: number) =>
      `${count} ${count === 1 ? "proposal is" : "proposals are"} available.`,
    loading: "Loading proposal data",
    emptyTitle: "No proposals yet",
    emptyBody:
      "No proposals are available. Eligible authors can start with a public forum discussion.",
    errorTitle: "Proposal data is unavailable",
    errorBody:
      "The proposal list could not be loaded. Check your connection and try again.",
    retry: "Retry proposal data",
  },
  detail: {
    eyebrow: (proposalId: string) => `Proposal #${proposalId}`,
    sectionTitle: "Proposal details",
    loading: "Loading proposal details",
    errorTitle: "Proposal details are unavailable",
    errorBody:
      "This proposal could not be loaded. Check your connection and try again.",
    retry: "Retry proposal details",
    notFoundTitle: "Proposal not found",
    notFoundBody:
      "This proposal ID does not exist for the active Voting contract.",
    returnToBoard: "Return to proposals",
    contentUnavailable: "Proposal content is unavailable.",
    forumUnavailable: "No verified forum discussion",
  },
  propose: {
    title: "Before you propose",
    description:
      "Proposal authors need an eligible wallet and a public forum discussion.",
    loading: "Checking proposal eligibility",
    errorTitle: "Proposal eligibility is unavailable",
    errorBody:
      "Eligibility could not be checked. Check your connection and try again.",
    retry: "Retry eligibility check",
    eligibleTitle: "Your wallet can create a proposal",
    eligibleBody:
      "Start with a public discussion in the Proposals category before preparing immutable proposal content.",
    blockedTitle: "Your wallet cannot create a proposal",
    blockedFallback:
      "The connected wallet does not meet the current proposal requirements.",
    eligibleLabel: "Eligible",
    unavailableLabel: "Unavailable",
  },
  labels: {
    status: "Status",
    type: "Type",
    proposalId: "Proposal ID",
  },
  status: {
    discussion: "Discussion",
    voting: "Voting",
    approved: "Approved",
    rejected: "Rejected",
    executed: "Executed",
    expired: "Expired",
    retracted: "Retracted",
    flagged: "Flagged",
    vetoed: "Vetoed",
    not_found: "Not found",
  } satisfies Record<DaoDisplayStatus, string>,
  proposalType: {
    signal: "Signal",
    executable: "Executable",
  } satisfies Record<DaoProposalType, string>,
} as const;
