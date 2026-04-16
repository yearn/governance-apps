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
      "A governance and membership workspace for collective influence, member weight maturity, proposal lifecycle, scoped operations, and reward visibility.",
    defaultSection: "Overview",
    productionGate: "Production gated",
  },
  heroStats: [
    { label: "Members", value: "--" },
    { label: "Internal Weight", value: "--" },
    { label: "Delegated Weight", value: "--" },
    { label: "Current Epoch", value: "--" },
    { label: "Active Proposals", value: "--" },
  ],
  proposalBoard: {
    eyebrow: "Proposal lifecycle",
    mockBadge: "Mock interactions",
    description:
      "Inspect every proposal phase with explicit UTC timing, visible vote thresholds, and scoped mock actions for propose, retract, vote, and execute.",
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
  rollout: {
    title: "Rollout posture",
    beta: {
      label: "Beta host",
      value: "ybc-beta.dao-ops.com",
      status: "Path and beta shell",
    },
    production: {
      label: "Production host",
      value: "ybc.yearn.fi",
      status: "Gated until live contract wiring and production approval",
    },
  },
} as const;
