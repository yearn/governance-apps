export const ybcCopy = {
  app: {
    slug: "ybc",
    routeKey: "/ybc",
    displayLabel: "Yearn Builder's Collective",
    betaHost: "ybc-beta.dao-ops.com",
    productionHost: "ybc.yearn.fi",
  },
  page: {
    title: "Yearn Builder's Collective",
    eyebrow: "YBC governance workspace",
    description:
      "Track collective influence and member maturity with a mock-first overview of internal weight, delegated weight, and roster health.",
    productionGate: "Production gated",
    loadingTitle: "Loading collective influence",
    loadingBody:
      "Seeding the YBC overview and member roster from the mock state machine.",
  },
  sections: [
    {
      id: "overview",
      label: "Overview",
      title: "Collective Influence",
      body: "Separate internal member weight from delegated public influence before proposal actions come online.",
    },
    {
      id: "members",
      label: "Members",
      title: "Members and Weight",
      body: "Keep raw stake, effective voting weight, target weight, maturity progress, and source mix distinct for every member.",
    },
  ],
  hero: {
    summary: {
      internalLabel: "Internal influence",
      internalBody: "Weight sourced from current YBC members.",
      delegatedLabel: "Delegated influence",
      delegatedBody: "External delegated voting power visible to the collective.",
      totalLabel: "Total collective influence",
      totalBody: "Internal and delegated influence combined for governance.",
    },
    stats: {
      members: "Members",
      epoch: "Current epoch",
      activeProposals: "Active proposals",
      awaitingExecution: "Awaiting execution",
    },
    perspective: {
      observerTitle: "Observer view",
      observerBody:
        "Browse member weight and maturity without exposing proposal or operator actions.",
      memberTitle: "Member view",
      memberBody:
        "Your raw stake, active voting weight, and full target weight remain separate until maturity completes.",
      membership: "Membership",
      collectiveAddress: "Collective address",
      rawStaked: "Raw staked",
      effectiveWeight: "Effective weight",
      targetWeight: "Target weight",
      maturity: "Maturity",
    },
    states: {
      observer: "Observer",
      member: "Member",
    },
  },
  members: {
    title: "Members and weight",
    description:
      "Each row keeps raw stake, effective weight, target weight, maturity progress, and source mix visible as separate values.",
    totals: {
      rawStaked: "Raw staked",
      effectiveWeight: "Effective weight",
      targetWeight: "Target weight",
      rampingMembers: "Ramping members",
    },
    columns: {
      member: "Member",
      status: "Status",
      rawStaked: "Raw staked",
      effectiveWeight: "Effective weight",
      targetWeight: "Target weight",
      maturity: "Maturity",
      sourceMix: "Source mix",
    },
    states: {
      active: "Active",
      ramping: "Ramping",
      pendingRemoval: "Pending removal",
      removed: "Removed",
      you: "You",
      fullyMatured: "Fully mature",
      maturesOn: "Full weight on",
      emptyTitle: "No members seeded",
      emptyBody:
        "This prototype state has no member records yet. Load a seeded YBC mock state to inspect maturity and weight splits.",
    },
  },
  roadmap: {
    title: "Later work packages",
    body:
      "Proposal actions, reward handoff, and scoped operator controls stay mapped but out of scope for this prototype.",
    items: ["Proposals", "Rewards", "Admin"],
  },
} as const;
