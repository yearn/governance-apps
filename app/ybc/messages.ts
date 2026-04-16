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
    errorTitle: "Unable to load collective influence",
    errorBody:
      "The YBC mock state could not be loaded. Retry to restore the overview and roster prototype.",
    retryCta: "Retry",
  },
  sections: [
    {
      id: "overview",
      label: "Overview",
      status: "Default",
      title: "Collective Influence",
      body: "Summarizes member count, internal member weight, public delegated weight, total influence, current epoch, active proposals, and execution queue.",
    },
    {
      id: "members",
      label: "Members",
      status: "Mapped",
      title: "Members and Weight",
      body: "Keeps raw staked YFI, effective voting weight, target weight, maturity progress, and source mix visible as separate values.",
    },
    {
      id: "proposals",
      label: "Proposals",
      status: "Mapped",
      title: "Proposal Board",
      body: "Tracks addition and expulsion proposals through discussion, voting, awaiting execution, executed, and expired terminal states.",
    },
    {
      id: "rewards",
      label: "Rewards",
      status: "Mapped",
      title: "Rewards Handoff",
      body: "Shows YBC-related rewards here while sending claim actions through the shared reward surface.",
    },
    {
      id: "admin",
      label: "Admin",
      status: "Conditional",
      title: "Scoped Operator Panel",
      body: "Limits MVP operations to add member, remove member, operator visibility, hooks visibility, threshold visibility, and reward status.",
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
  shell: {
    title: "Accepted shell map",
    body:
      "WP2 fills the overview and member roster while the approved proposal, rewards, and admin sections remain visible as mapped shells for later work packages.",
    footerLabel: "Later work package",
  },
} as const;
