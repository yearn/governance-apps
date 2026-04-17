import type { BadgeProps } from "@/components/ui/Badge";
import type {
  BucketStatus,
  BonusPeriodStatus,
  FundingApprovalStatus,
  PeriodFinalizationStatus,
  RevenueTokenAdminStatus,
  TeamBonusStatus,
  TeamLifecycleStatus,
  TeamFundingSummaryState,
  TeamMigrationReadiness,
  TeamReadOnlyReason,
  TeamsRegistryStatus,
  TeamsViewerRole,
} from "@/lib/clients/teams";

type StatusCopy = {
  label: string;
  variant: BadgeProps["variant"];
};

export const teamsCopy = {
  app: {
    slug: "teams",
    routeKey: "/teams",
    displayLabel: "Team Finances",
    betaHost: "teams-beta.dao-ops.com",
    productionHost: "teams.yearn.fi",
  },
  page: {
    title: "Team Finances",
    eyebrow: "Interactive mock finance, lifecycle, and ops flows",
    description:
      "Mock-first workspace for scanning registered teams, opening a selected workspace, and validating revenue deposit, funding claim and return flows, bonus availability, ownership/lifecycle state, and operator/admin oversight without turning protocol math into the default view.",
    productionGate: "Production gated",
  },
  navigation: [
    {
      id: "directory",
      label: "Directory",
    },
    {
      id: "workspace",
      label: "Workspace",
    },
    {
      id: "revenue",
      label: "Revenue",
    },
    {
      id: "funding",
      label: "Funding",
    },
    {
      id: "bonus",
      label: "Bonus",
      title: "Bonus",
      body: "Keep claimable YFI simple in the main view, then open period detail only when you need the pricing inputs behind it.",
    },
    {
      id: "lifecycle",
      label: "Ownership & Lifecycle",
      title: "Ownership & Lifecycle",
      body: "Keep owner, pending owner, retirement, and migration state readable at a glance before write flows land.",
    },
    {
      id: "states",
      label: "States",
    },
    {
      id: "admin",
      label: "Admin",
    },
  ],
  stats: {
    currentPeriod: "Current period",
    activeTeams: "Active",
    retiringTeams: "Retiring",
    retiredTeams: "Retired",
    viewerRole: "Viewer",
  },
  controls: {
    title: "Prototype controls",
    heading: "Prototype States",
    description:
      "Switch between approved viewer scenarios and force explicit loading or empty coverage while validating revenue, funding, bonus, lifecycle, and admin states.",
    cardTitle: "Prototype States",
    cardBody:
      "Switch between approved viewer scenarios and force explicit loading or empty coverage while validating revenue, funding, bonus, lifecycle, and admin states.",
    scenarioLabel: "Scenarios",
    surfaceLabel: "Surface state",
    adminHint:
      "The admin console unlocks only in the Operator/admin view mock persona.",
    scenarioNames: {
      "directory-observer": "Directory mix",
      "team-owner-funding": "Owner workspace",
      "bonus-available": "Single-team snapshot",
      "finance-operator-revenue": "Operator workspace",
      "retired-read-only": "Retired workspace",
      "operator-admin": "Operator/admin view",
    },
    surfaceModes: {
      scenario: "Scenario",
      loading: "Loading",
      empty: "Empty",
    },
  },
  directory: {
    title: "Team Directory",
    description:
      "The default landing layer stays directory-first. Open a workspace when you want a selected team view.",
    loadingTitle: "Loading team directory",
    loadingBody: "Fetching the mock directory scenario.",
    emptyTitle: "No teams in this mock slice",
    emptyBody:
      "Use a populated scenario to inspect multiple teams and open a workspace state.",
    emptyHint: "Empty state coverage is explicit for WP2.",
    headers: {
      team: "Team",
      owner: "Owner",
      status: "Status",
      revenue: "Revenue",
      cost: "Cost",
      net: "Net",
      action: "Action",
    },
    openWorkspace: "Open workspace",
    selected: "Selected",
  },
  workspace: {
    title: "Workspace Overview",
    description:
      "Shows the selected team only. Current period and lifetime values stay separate so the reporting window never gets flattened into one total.",
    loadingTitle: "Loading workspace overview",
    loadingBody: "Preparing the selected team workspace.",
    emptyTitle: "No team selected",
    emptyBody:
      "Open a team from the directory to inspect current-period and lifetime overview cards.",
    noTeamsTitle: "No workspace available",
    noTeamsBody:
      "A team workspace appears here when the current scenario includes at least one team.",
    cards: {
      current: "Current Budget Period",
      lifetime: "Lifetime",
      revenue: "Revenue",
      cost: "Cost",
      profit: "Profit",
      loss: "Loss",
    },
    fields: {
      teamId: "Team ID",
      owner: "Owner",
      pendingOwner: "Pending owner",
      migration: "Migration readiness",
      successor: "Successor",
      retirement: "Retirement",
      viewer: "Viewer permissions",
    },
  },
  bonus: {
    title: "Bonus",
    description:
      "Lead with claimable YFI and period state. Open the drilldown only when you need the profit and pricing inputs behind a finalized amount.",
    placeholders: {
      loading: "Preparing bonus totals and period detail for the selected workspace.",
      empty:
        "Load a populated scenario to inspect claimable bonus state, period drilldown, and mock claim actions.",
      unselected:
        "Open a team from the directory to inspect claimable bonus, the primary claim action, and period-level detail.",
    },
    summary: {
      claimable: "Claimable now",
      periods: "Periods included",
      awaitingFinalization: "Awaiting finalization",
      noPendingFinalization: "None",
      currentState: "Current state",
    },
    periodDetailSummary: "View period detail and math",
    periodClaimable: "Period output",
    periodLabel: (period: number) => `Period ${period}`,
    periodCount: (count: number) =>
      `${count.toLocaleString("en-US")} ${count === 1 ? "period" : "periods"}`,
    mathTrigger: "Math inputs",
    math: {
      profit: "Team profit",
      spotPrice: "Spot price",
      adjustedPrice: "Adjusted price",
      growthFactor: "Growth factor",
      ybcSplit: "YBC split",
      yfiOutput: "YFI output",
    },
    action: {
      title: "Primary action",
      claimCta: "Claim Bonus",
      stagedCta: "Mock claim staged",
      pendingCta: "Waiting for finalization",
      claimedCta: "Already claimed",
      noneCta: "No bonus to claim",
      claimBody:
        "Stage the mock bonus claim from the default view, then keep the period drilldown available for audit detail.",
      stagedBody:
        "The mock claim is staged for review only. This prototype keeps the fixture unchanged so the bonus breakdown stays visible until live writes land later.",
      permissionBody:
        "This bonus is claimable, but the mock action stays limited to the eligible team-owner view.",
      pendingBody:
        "The primary action stays blocked until the included period finishes finalization and moves into the claimable total.",
      claimedBody:
        "The latest finalized bonus is already claimed, so the primary action stays in a historical state.",
      noneBody:
        "There is no claimable bonus in this workspace yet, so the default view stays focused on availability rather than submission.",
    },
    summaries: {
      claimable: (amount: string) =>
        `${amount} is finalized and available now. The default view stays focused on what can be acted on first.`,
      claimableWithPending: (amount: string, pendingPeriods: number) =>
        `${amount} is finalized and available now. ${pendingPeriods.toLocaleString("en-US")} ${pendingPeriods === 1 ? "period stays" : "periods stay"} outside the main total until finalization lands.`,
      pendingFinalization: (pendingPeriods: number) =>
        `No YFI is claimable yet. ${pendingPeriods.toLocaleString("en-US")} ${pendingPeriods === 1 ? "period is" : "periods are"} still waiting for finalization.`,
      claimed:
        "The latest finalized bonus period has already been claimed, so the default view stays read-only.",
      none: "No bonus periods are included in this mock slice yet.",
      noneWithHistory:
        "Included periods have no claimable YFI, so the default view stays focused on the historical state.",
    },
    noPeriods: "No bonus periods are available in this workspace.",
    statuses: {
      none: {
        label: "No bonus",
        variant: "neutral",
      },
      "pending-finalization": {
        label: "Pending finalization",
        variant: "warning",
      },
      claimable: {
        label: "Claimable",
        variant: "success",
      },
      claimed: {
        label: "Claimed",
        variant: "neutral",
      },
    } satisfies Record<TeamBonusStatus, StatusCopy>,
    periodStatuses: {
      "pending-finalization": {
        label: "Pending finalization",
        variant: "warning",
        body: "The open period is still waiting on finalization, so it stays out of the claimable total.",
      },
      "finalized-claimable": {
        label: "Finalized",
        variant: "success",
        body: "This period is finalized and contributes to the claimable total.",
      },
      "finalized-zero": {
        label: "Finalized to zero",
        variant: "neutral",
        body: "This period finalized with no claimable bonus after applying the configured math.",
      },
      claimed: {
        label: "Claimed",
        variant: "neutral",
        body: "This finalized period has already been claimed and now serves as history only.",
      },
    } satisfies Record<BonusPeriodStatus, StatusCopy & { body: string }>,
  },
  lifecycle: {
    title: "Ownership & Lifecycle",
    description:
      "Keep ownership transfer, retirement, and successor state readable before any ownership writes are introduced.",
    placeholders: {
      loading: "Preparing owner, retirement, migration, and successor state for the selected workspace.",
      empty:
        "Load a populated scenario to inspect ownership handoff, retirement, and migration coverage.",
      unselected:
        "Open a team from the directory to inspect owner, pending owner, retirement, and migration readiness.",
    },
    atAGlance: "At a glance",
    activeWorkspace: "Active workspace",
    pendingOwnerNone: "No pending transfer",
    successorNone: "No successor",
    unknownPeriod: "an upcoming period",
    fields: {
      owner: "Owner",
      pendingOwner: "Pending owner",
      retirement: "Retirement",
      migration: "Migration readiness",
      successor: "Successor",
      workspaceAccess: "Workspace access",
    },
    retirement: {
      active: "No retirement scheduled",
      notScheduled: "Retirement not scheduled",
      retiringPrefix: "Retires in period",
      retiredPrefix: "Retired in period",
      announcedPrefix: "Announced",
    },
    summaries: {
      active:
        "This team is active with no retirement scheduled, so ownership state is purely operational.",
      activeWithPendingOwner: (pendingOwner: string) =>
        `This team is active, but ownership is mid-transfer to ${pendingOwner}.`,
      retiring: (periodLabel: string, pendingOwner: string) =>
        `Retirement is scheduled for ${periodLabel}, and the pending owner state remains visible${pendingOwner === "No pending transfer" ? "." : ` as the handoff prepares for ${pendingOwner}.`}`,
      retired: (successor: string) =>
        `This team is historical and read-only. ${successor === "No successor" ? "No successor is recorded." : `Successor state now points to ${successor}.`}`,
    },
    migrationReadiness: {
      "not-needed": {
        label: "No migration needed",
        variant: "neutral",
      },
      pending: {
        label: "Migration pending",
        variant: "warning",
      },
      ready: {
        label: "Migration ready",
        variant: "warning",
      },
      completed: {
        label: "Migration completed",
        variant: "success",
      },
    } satisfies Record<TeamMigrationReadiness, StatusCopy>,
  },
  revenue: {
    title: "Revenue Deposit",
    description:
      "Deposit revenue on behalf of the selected team, preview any auto-conversion, and compare the submitted amount with the credited USD estimate.",
    loadingTitle: "Loading revenue deposit flow",
    loadingBody:
      "Preparing supported tokens, the conversion preview, and recent deposit history.",
    emptyTitle: "No revenue workspace available",
    emptyBody:
      "A revenue deposit flow appears here when the current scenario includes a team workspace.",
    noTeamTitle: "No team selected",
    noTeamBody:
      "Open a team from the directory to preview permissionless deposits and recent revenue history.",
    permissionless: {
      title: "Permissionless action",
      body: "Anyone can deposit supported revenue tokens on behalf of this team. Owner status is not required.",
    },
    unavailable: {
      title: "Deposits unavailable in this workspace",
      viewerBody:
        "This mock viewer cannot submit deposits, but recent history stays visible for review.",
      readOnlyBody:
        "This team is read-only in the current scenario, so new deposits stay disabled.",
      optionsBody:
        "This scenario exposes no supported revenue tokens for new deposits.",
    },
    form: {
      tokenLabel: "Supported tokens",
      amountLabel: "Deposit amount",
      amountHint:
        "Credited USD can differ from the nominal token amount because conversion and pricing apply before accounting.",
      submit: "Record mock deposit",
      amountError: "Enter an amount greater than 0.",
    },
    tokenBadges: {
      convertible: "Auto-converts",
      direct: "Direct credit",
    },
    preview: {
      title: "Deposit preview",
      submitted: "Depositing",
      path: "Deposit path",
      credit: "Estimated accountant credit",
      direct: "Direct accountant credit",
      quote: "Mock quote",
      convertedPrefix: "Auto-converts to",
    },
    history: {
      title: "Recent deposit history",
      description:
        "Recent deposits stay visible beside the next mock submission so UAT can compare the quoted credit against recorded entries.",
      emptyTitle: "No deposits recorded yet",
      emptyBody:
        "This selected team has no mock revenue deposit history in the current scenario.",
      headers: {
        period: "Period",
        deposit: "Deposit",
        credit: "Credited USD",
        path: "Path",
        depositor: "Deposited by",
        recorded: "Recorded",
      },
      direct: "Direct credit",
      permissionlessDepositor: "Permissionless depositor",
    },
    success: {
      title: "Mock deposit recorded",
      body:
        "The credited USD estimate and recent deposit history have been updated for this session.",
      currentPeriodPrefix: "Current period",
    },
  },
  funding: {
    title: "Funding Approvals",
    description:
      "Keep current-period claimability, late-liquid handling, and return accounting visible from the same selected team workspace.",
    emptyTitle: "No funding approvals in this scenario",
    emptyBody:
      "This selected team does not have any funding approvals yet, so claim and return flows stay inactive.",
    summary: {
      claimableUsd: "Stable claimable value",
      refundableUsd: "Refundable value",
      state: "Funding state",
      lateLiquidCount: "Late-liquid approvals",
    },
    summaryStates: {
      "no-approvals": "No approvals",
      "has-claimable": "Claimable balance available",
      "partially-claimed": "Claimed and claimable balances",
      "late-liquid-available": "Late-liquid balance available",
      "fully-used": "Fully used",
    } satisfies Record<TeamFundingSummaryState, string>,
    headers: {
      approval: "Approval",
      token: "Token",
      period: "Period scope",
      recipient: "Recipient",
      totalApproved: "Total approved",
      used: "Used",
      claimable: "Claimable now",
      flow: "Claim style",
      actions: "Actions",
    },
    statuses: {
      "claimable-current-period": {
        label: "Claimable now",
        variant: "success",
      },
      "partially-claimed": {
        label: "Partially claimed",
        variant: "warning",
      },
      "late-liquid": {
        label: "Late liquid",
        variant: "error",
      },
      "not-current-period": {
        label: "Future period",
        variant: "neutral",
      },
      "fully-used": {
        label: "Fully used",
        variant: "neutral",
      },
    } satisfies Record<FundingApprovalStatus, StatusCopy>,
    periodScope: {
      currentPeriod: (period: number) => `Current period #${period} claimable now`,
      lateLiquid: (period: number) => `Period #${period} late-claim window`,
      future: (period: number) => `Queued for period #${period}`,
      spent: (period: number) => `Period #${period} fully used`,
    },
    recipientMissing: "Recipient required on claim",
    actions: {
      claim: "Use in claim flow",
      claimSelected: "Selected for claim",
      return: "Use in return flow",
      returnSelected: "Selected for return",
      none: "No action available",
    },
    flow: {
      streamBacked: (days: number) => `Stream-backed • ${days}-day vest`,
      lateLiquid: "Liquid immediately",
      future: "Not claimable this period",
      spent: "No remaining balance",
    },
    claimForm: {
      title: "Claim Funding",
      description:
        "Select a claimable approval, set a recipient, and simulate the owner claim flow.",
      disabledPermission: "This viewer cannot claim funding in the current scenario.",
      disabledNoApproval: "Select a claimable approval from the table.",
      selectedApproval: "Selected approval",
      selectedState: "Claim status",
      recipient: "Recipient",
      recipientPlaceholder: "0x0000000000000000000000000000000000000000",
      amount: "Amount to claim",
      maxLabel: "Claimable",
      submit: "Simulate claim",
      helpers: {
        streamBacked: (days: number) =>
          `This approval remains stream-backed for ${days} days after claim.`,
        lateLiquid:
          "This approval is late-liquid. Claimed funds arrive immediately in the prototype.",
        future: "This approval is visible but not claimable in the current period.",
        spent: "This approval has no remaining claimable balance.",
      },
      success: (
        amount: string,
        symbol: string,
        approvalId: string,
        recipient: string
      ) => `Claimed ${amount} ${symbol} from ${approvalId} to ${recipient}.`,
      errors: {
        recipientRequired: "Enter a recipient address.",
        recipientInvalid: "Enter a valid recipient address.",
        amountRequired: "Enter an amount to claim.",
        amountInvalid: "Enter an amount greater than zero.",
        amountExceeds: "Claim amount exceeds the remaining balance.",
      },
    },
    returnForm: {
      title: "Return Funding",
      description:
        "Represent funding returns separately from claims. Refund value uses the historical average claim price.",
      disabledPermission: "This viewer cannot return funding in the current scenario.",
      disabledNoApproval: "Select a refundable approval from the table.",
      selectedApproval: "Selected approval",
      averagePrice: "Historical average claim price",
      amount: "Amount to return",
      maxLabel: "Used balance",
      estimate: "Estimated refund value",
      note: "Refund accounting uses the historical average claim price for this approval.",
      submit: "Simulate return",
      success: (
        amount: string,
        symbol: string,
        approvalId: string,
        refundValue: string
      ) => `Returned ${amount} ${symbol} from ${approvalId} for ${refundValue}.`,
      errors: {
        amountRequired: "Enter an amount to return.",
        amountInvalid: "Enter an amount greater than zero.",
        amountExceeds: "Return amount exceeds the used balance.",
      },
    },
    history: {
      title: "Return history",
      empty: "No funding returns recorded in this scenario yet.",
      period: (period: number) => `Period #${period}`,
      approval: (approvalId: string) => `Approval ${approvalId}`,
      returnedBy: "Returned by",
    },
  },
  admin: {
    eyebrow: "Admin console",
    mockBadge: "Mock persona gated",
    title: "Admin Console",
    description:
      "Operator/admin-only view for registry state, revenue token and bucket coverage, funding queue health, and bonus finalization readiness.",
    loadingTitle: "Loading admin console",
    loadingBody:
      "Preparing registry coverage, bucket usage, funding queue, and bonus finalization detail.",
    emptyTitle: "No admin console in this surface state",
    emptyBody:
      "Return to the scenario view to inspect the operator/admin information architecture.",
    accessCard: {
      title: "Admin visibility is persona-gated",
      body:
        "This section stays out of the default team workspace. Switch to the Operator/admin view mock persona to inspect registry, revenue ops, funding ops, and bonus ops.",
      viewerLabel: "Current viewer",
      accessLabel: "Admin controls",
      lockedValue: "Locked",
      hint: "The operator/admin scenario is the approved WP6 review surface.",
    },
    summary: {
      title: "Admin summary",
      viewer: "Viewer",
      currentPeriod: "Current period",
      registryStatus: "Registry",
      finalizationStatus: "Period finalization",
    },
    registry: {
      title: "Registry",
      description:
        "Keep team status, retirement timing, successor context, and migration readiness readable from one place.",
      metrics: {
        active: "Active teams",
        retiring: "Retiring teams",
        retired: "Retired teams",
      },
      headers: {
        team: "Team",
        owner: "Owner",
        status: "Status",
        retirement: "Retirement",
        migration: "Migration",
        workspace: "Workspace",
      },
      retirement: {
        active: "No retirement scheduled",
        period: (period: number) => `Period #${period}`,
        retired: "Historical team",
      },
      workspace: {
        full: "Full workspace",
        readOnlyPrefix: "Read-only",
        successor: (teamId: string) => `Successor: ${teamId}`,
        noSuccessor: "No successor set",
      },
    },
    revenue: {
      title: "Revenue Ops",
      description:
        "Show bucket headroom and whitelisted token wiring without expanding into low-level setter coverage.",
      directCredit: "Direct credit",
      bucketUsage: "Bucket usage",
      ofBudget: "of budget used",
      bucketLabels: {
        rewards: "Rewards bucket",
        treasury: "Treasury bucket",
        recovery: "Recovery bucket",
      },
      bucketMetrics: {
        budget: "Budget",
        used: "Used",
        remaining: "Remaining",
      },
      tokenTitle: "Whitelisted revenue tokens",
      tokenHeaders: {
        token: "Token",
        status: "Status",
        oracle: "Oracle",
        converter: "Converter",
      },
    },
    fundingOps: {
      title: "Funding Ops",
      description:
        "Track approval queue health, late-liquid exposure, and which approvals need operator follow-up.",
      metrics: {
        approvals: "Approvals visible",
        attention: "Operator attention",
        lateLiquid: "Late-liquid approvals",
      },
      headers: {
        approval: "Approval",
        team: "Team",
        status: "Status",
        attention: "Operator attention",
      },
    },
    bonusOps: {
      title: "Bonus Ops",
      description:
        "Keep bonus period review separate from the user claim surface and summarize what still needs finalization.",
      metrics: {
        periods: "Periods visible",
        finalization: "Needs finalization",
        history: "Claimed history",
      },
      headers: {
        team: "Team",
        period: "Period",
        status: "Status",
        finalization: "Finalization",
      },
      currentPeriod: (period: number) => `Period #${period}`,
    },
    registryStatuses: {
      active: {
        label: "Active",
        variant: "success",
      },
      paused: {
        label: "Paused",
        variant: "warning",
      },
      deprecated: {
        label: "Deprecated",
        variant: "neutral",
      },
    } satisfies Record<TeamsRegistryStatus, StatusCopy>,
    finalizationStatuses: {
      open: {
        label: "Open",
        variant: "neutral",
      },
      ready: {
        label: "Ready to finalize",
        variant: "warning",
      },
      finalized: {
        label: "Finalized",
        variant: "success",
      },
    } satisfies Record<PeriodFinalizationStatus, StatusCopy>,
    bucketStatuses: {
      healthy: {
        label: "Healthy",
        variant: "success",
      },
      watch: {
        label: "Watch",
        variant: "warning",
      },
      "limit-reached": {
        label: "Limit reached",
        variant: "error",
      },
    } satisfies Record<BucketStatus, StatusCopy>,
    tokenStatuses: {
      active: {
        label: "Active",
        variant: "success",
      },
      paused: {
        label: "Paused",
        variant: "warning",
      },
    } satisfies Record<RevenueTokenAdminStatus, StatusCopy>,
    operatorAttention: {
      clear: {
        label: "Clear",
        variant: "neutral",
      },
      required: {
        label: "Required",
        variant: "warning",
      },
    },
    finalizationState: {
      complete: {
        label: "Reviewed",
        variant: "neutral",
      },
      required: {
        label: "Finalize",
        variant: "warning",
      },
    },
  },
  viewerRoles: {
    observer: "Observer",
    "team-owner": "Team owner",
    "finance-operator": "Finance operator",
    "operator-admin": "Operator/admin",
  } satisfies Record<TeamsViewerRole, string>,
  statuses: {
    active: {
      label: "Active",
      variant: "success",
    },
    retiring: {
      label: "Retiring",
      variant: "warning",
    },
    retired: {
      label: "Retired",
      variant: "neutral",
    },
  } satisfies Record<TeamLifecycleStatus, StatusCopy>,
  readOnlyReasons: {
    retired: "Read-only after retirement",
    "successor-active": "Read-only while successor is active",
  } satisfies Record<TeamReadOnlyReason, string>,
} as const;
