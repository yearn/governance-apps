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
      "Track collective influence, member maturity, and proposal lifecycle with a mock-first workspace for delegated weight, thresholds, and execution timing.",
    productionGate: "Production gated",
    loadingTitle: "Loading collective influence",
    loadingBody:
      "Seeding the YBC overview, member roster, and proposal board from the mock state machine.",
    errorTitle: "Unable to load collective influence",
    errorBody:
      "The YBC mock state could not be loaded. Retry to restore the overview, member roster, and proposal board prototype.",
    retryCta: "Retry",
  },
  proposalBoard: {
    title: "Proposal Board",
    eyebrow: "Proposal lifecycle",
    mockBadge: "Mock interactions",
    description:
      "Inspect every proposal phase with explicit UTC timing, visible vote thresholds, and scoped mock actions for propose, retract, vote, and execute.",
    emptyTitle: "No active proposal history in this perspective",
    emptyBody:
      "This mock perspective keeps the board intentionally empty so the route can exercise its no-proposal state without implying hidden history.",
    emptyHint:
      "Use the mock propose controls above or switch perspectives to inspect a populated board.",
    perspectiveLabel: "Mock perspective",
    thresholdTitle: "Threshold guide",
    viewerTitle: "Current viewer",
    terminalTitle: "Expired proposals",
    terminalBody:
      "Expired proposals stay visible as terminal history. The UI does not offer a revive path; members must start a fresh proposal instead.",
    proposeAdditionCta: "Mock propose addition",
    proposeExpulsionCta: "Mock propose expulsion",
    summary: {
      active: "Active",
      awaitingExecution: "Awaiting execution",
      terminal: "Terminal",
    },
  },
  rewards: {
    title: "Rewards Handoff",
    eyebrow: "Rewards visibility",
    handoffBadge: "Shared claim surface",
    description:
      "Track YBC-attributed rewards here, then hand claim execution to the shared rewards route instead of implying a separate YBC claim stack.",
    summary: {
      pending: "Pending for this wallet",
      claimable: "Claimable on shared route",
      accruing: "Accruing this epoch",
    },
    periodsTitle: "Reward periods",
    periodsBody:
      "Each period keeps the YBC reward source visible here while the actual claim path stays on the shared rewards surface.",
    viewerTitle: "Current viewer",
    handoffTitle: "Claim path",
    handoffBody:
      "YBC shows rewards sourced from member weight and operator bonuses, but claiming remains on the shared stYFI rewards surface.",
    rows: {
      role: "Role",
      pendingRewards: "Pending rewards",
      claimMode: "Claim mode",
      lastUpdated: "Last updated",
      claimable: "Claimable",
      earned: "Earned",
    },
    states: {
      observer: "Observer",
      member: "Member",
      operator: "Operator",
      sharedClaimMode: "Shared reward surface only",
      finalized: "Finalized",
      pending: "Accruing",
      memberWeight: "Member weight",
      operatorBonus: "Operator bonus",
      emptyMemberTitle: "No finalized YBC rewards yet",
      emptyMemberBody:
        "This member perspective keeps the handoff visible, but there are no finalized YBC reward periods ready for the shared claim surface yet.",
      emptyObserverTitle: "Connect a member wallet to view YBC reward periods",
      emptyObserverBody:
        "Observer wallets can inspect the reward section, but only member wallets with YBC rewards unlock the shared-claim handoff.",
      emptyUnseededTitle: "No YBC reward periods seeded",
      emptyUnseededBody:
        "This prototype state has no reward periods yet. Load a seeded YBC member scenario to inspect the shared-claim handoff.",
    },
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
      "WP2, WP3, WP4, and WP5 now fill the overview, member roster, proposal board, rewards handoff, and scoped operator panel on the route shell.",
    footerLabel: "Later work package",
  },
  operatorPanel: {
    eyebrow: "Scoped operator access",
    mockBadge: "Mock MVP scope",
    description:
      "Expose only add/remove member controls, current operator visibility, governance hook wiring, and reward sync status. Generic arbitrary-call tooling stays out of scope.",
    accessCard: {
      title: "Operator access required",
      body:
        "The admin section stays visible in the route map, but only the Operator/admin mock perspective unlocks scoped membership controls and governance wiring details.",
      viewerLabel: "Current viewer",
      controlsLabel: "Scoped member controls",
      lockedValue: "Locked",
      hint:
        "Switch to the Operator/admin view in the mock perspective controls to inspect the full panel.",
    },
    operationsTitle: "Scoped member overrides",
    operationsBody:
      "These actions reuse the proposal flow for membership changes instead of introducing separate admin write machinery in mock scope.",
    operations: {
      addMember: {
        title: "Add member",
        body: "Seed the add-member proposal flow directly from the operator panel.",
        cta: "Start add member flow",
      },
      removeMember: {
        title: "Remove member",
        body: "Seed the remove-member proposal flow without expanding into broader admin tooling.",
        cta: "Start remove member flow",
      },
    },
    operationEnabled: "Enabled",
    operationDisabled: "Unavailable",
    operatorsTitle: "Operators and management",
    operatorsBody:
      "Inspect the current operator set and management visibility without expanding into broader admin tooling.",
    roles: {
      operator: "Operator",
      management: "Management",
      you: "You",
    },
    viewerTitle: "Current operator viewer",
    viewer: {
      wallet: "Wallet",
      accessRole: "Access role",
      observerWallet: "No connected wallet",
      roles: {
        observer: "Observer",
        member: "Member",
        operator: "Operator",
      },
    },
    thresholdsTitle: "Membership thresholds",
    thresholds: {
      addition: "Add member",
      expulsion: "Remove member",
    },
    hooksTitle: "Governance hooks",
    hooks: {
      membershipHook: "Membership hook",
      rewardsDistributor: "Rewards distributor",
      bonusRecipient: "Bonus recipient",
    },
    rewardStatusTitle: "Reward wiring",
    rewardStatusBody:
      "Keep distributor funding and bonus recipient visibility in scope for MVP review.",
    rewardStatus: {
      funded: "Distributor funded",
      unfunded: "Funding needed",
      lastSynced: "Last synced UTC",
    },
    guardrailsTitle: "MVP guardrails",
    guardrails: [
      "Add member and remove member proposal entry points only",
      "Visible operator set, thresholds, hooks, and reward status",
      "No generic arbitrary-call builder in this prototype",
    ],
  },
} as const;
