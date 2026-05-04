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
    eyebrow: "Registered team finance and operations",
    description:
      "Compare registered teams, open one workspace, then act on revenue, funding, bonus, and lifecycle state.",
    productionGate: "Production gated",
  },
  navigation: {
    directory: "Directory",
    workspace: "Workspace",
    admin: "Admin",
  },
  stats: {
    currentPeriod: "Current period",
    activeTeams: "Active",
    retiringTeams: "Retiring",
    retiredTeams: "Retired",
    viewerRole: "Viewer",
  },
  controls: {
    description:
      "Bootstrap known review states, then adjust the live Teams runtime in place without changing the default route chrome.",
    presetLabel: "Preset",
    viewerLabel: "Viewer",
    workspaceLabel: "Workspace",
    currentPeriodLabel: "Current period",
    scenarioLabel: "Presets",
    directoryOnly: "Directory only",
    surfaceLabel: "Route state",
    surfaceNames: {
      live: "Live",
      loading: "Loading",
      empty: "Empty",
    },
    scenarioNames: {
      "directory-observer": "Directory mix",
      "team-owner-funding": "Owner workspace",
      "bonus-available": "Single-team snapshot",
      "finance-operator-revenue": "Operator workspace",
      "retired-read-only": "Retired workspace",
      "operator-admin": "Operator/admin view",
    },
    customRuntime: "Custom runtime",
  },
  directory: {
    title: "Team Directory",
    description:
      "Scan current-period performance in cards, or switch to the audit table for dense review.",
    loadingTitle: "Loading team directory",
    loadingBody: "Fetching the current teams snapshot.",
    emptyTitle: "No teams available",
    emptyBody:
      "No teams are available in this view yet.",
    emptyHint: "No teams are available right now.",
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
      "Current-period and lifetime reporting for the selected team, followed by action and ledger sections.",
    loadingTitle: "Loading workspace overview",
    loadingBody: "Preparing the selected team workspace.",
    emptyTitle: "No team selected",
    emptyBody:
      "Open a team from the directory to inspect current-period and lifetime overview cards.",
    noTeamsTitle: "No workspace available",
    noTeamsBody: "A team workspace appears here once a team is available and selected.",
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
      contract: "Contract",
      owner: "Owner",
      pendingOwner: "Pending owner",
      migration: "Migration readiness",
      successor: "Successor",
      retirement: "Retirement",
      viewer: "Viewer permissions",
    },
    tabs: {
      overview: "Overview",
      revenue: "Revenue",
      funding: "Funding",
      bonus: "Bonus",
      lifecycle: "Lifecycle",
    },
    actionDeck: {
      title: "Action deck",
      description:
        "Deposit permissionless revenue, then review outbound funding and bonus actions without losing the audit ledgers below.",
      outflowsTitle: "Outflows & Yield command",
      outflowsBody:
        "Funding approvals and finalized YFI bonus stay beside each other, but each panel keeps its source and action meaning separate.",
      fundingTitle: "Funding approvals",
      fundingSource: "Source: team funding approvals",
      fundingBody:
        "Claims spend approved funding balances. Returns account for previously used funding against the historical claim price.",
      fundingClaimSource: "Claim source",
      fundingReturnSource: "Return accounting",
      fundingClaimableCount: "Claimable approvals",
      fundingReturnableCount: "Returnable approvals",
      fundingClaimableValue: "Stable claimable value",
      fundingRefundableValue: "Refundable value",
      fundingClaimBody: (approvalId: string, amount: string, periodLabel: string) =>
        `${approvalId} has ${amount} available from ${periodLabel}.`,
      fundingReturnBody: (approvalId: string, amount: string) =>
        `${approvalId} has ${amount} of used balance available for return accounting.`,
      fundingNoClaimable:
        "No funding approval is claimable from this workspace right now.",
      fundingNoReturnable:
        "No used funding balance is available for return accounting right now.",
      fundingCta: "Open funding claim and return flows",
      fundingClaimCta: "Open funding claim flow",
      fundingReturnCta: "Open funding return flow",
      bonusTitle: "YFI bonus",
      bonusSource: "Source: finalized team bonus output",
      bonusBody:
        "Bonus yield is calculated from finalized period profit and remains separate from funding approvals.",
      bonusStatus: "Bonus state",
      bonusClaimable: "Claimable now",
      bonusPeriods: "Periods included",
      bonusPending: "Awaiting finalization",
      bonusCta: "Open bonus claim",
    },
    outflows: {
      title: "Outflows & Yield",
      description:
        "Funding approvals and YFI bonus actions are surfaced together as outbound work, while preserving their separate protocol meanings and ledgers.",
    },
  },
  bonus: {
    title: "Bonus",
    description:
      "Lead with claimable YFI and period state. Open the drilldown only when you need the profit and pricing inputs behind a finalized amount.",
    placeholders: {
      loading: "Preparing bonus totals and period detail for the selected workspace.",
      empty:
        "A bonus summary appears here once a team workspace is available.",
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
      stagedCta: "Claim staged",
      permissionCta: "Team owner required",
      pendingCta: "Waiting for finalization",
      claimedCta: "Already claimed",
      noneCta: "No bonus to claim",
      claimBody:
        "Stage the claim action from the default view, then keep the period drilldown available for audit detail.",
      stagedBody:
        "The claim is staged for review only. The bonus breakdown stays visible so the finalized periods remain easy to audit.",
      permissionBody:
        "This bonus is claimable, but the action stays limited to the eligible team-owner view.",
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
      none: "No bonus periods are included yet.",
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
        "Ownership and lifecycle details appear here once a team workspace is available.",
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
    emptyBody: "A revenue deposit flow appears here once a team workspace is available.",
    noTeamTitle: "No team selected",
    noTeamBody:
      "Open a team from the directory to preview permissionless deposits and recent revenue history.",
    permissionless: {
      title: "Permissionless action",
      body: "Anyone can deposit supported revenue tokens on behalf of this team. Owner status is not required.",
    },
    unavailable: {
      title: "Deposits unavailable in this workspace",
      disabledCta: "Deposit unavailable",
      viewerBody:
        "This viewer cannot submit deposits, but recent history stays visible for review.",
      readOnlyBody:
        "This team is read-only, so new deposits stay disabled.",
      optionsBody:
        "No supported revenue tokens are available for new deposits in this workspace.",
    },
    form: {
      tokenLabel: "Supported tokens",
      amountLabel: "Deposit amount",
      amountHint:
        "Credited USD can differ from the nominal token amount because conversion and pricing apply before accounting.",
      submit: "Record deposit",
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
      quote: "Quoted credit",
      convertedPrefix: "Auto-converts to",
    },
    history: {
      title: "Recent deposit history",
      description:
        "Recent deposits stay visible beside the next submission so teams can compare the quoted credit against recorded entries.",
      auditTitle: "Revenue audit ledger",
      auditDescription:
        "Deposit records stay reachable from the stable revenue anchor with visible record identifiers for audit review.",
      emptyTitle: "No deposits recorded yet",
      emptyBody: "This selected team has no revenue deposit history yet.",
      headers: {
        record: "Record ID",
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
      title: "Deposit recorded",
      body:
        "The credited USD estimate and recent deposit history have been updated for this session.",
      currentPeriodPrefix: "Current period",
    },
  },
  funding: {
    title: "Funding Approvals",
    description:
      "Keep current-period claimability, late-liquid handling, and return accounting visible from the same selected team workspace.",
    emptyTitle: "No funding approvals available",
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
      disabledPermission: "This viewer cannot claim funding in the current view.",
      disabledPermissionCta: "Claim unavailable",
      disabledNoApproval: "Select a claimable approval from the table.",
      disabledNoApprovalCta: "Select approval to claim",
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
          "This approval is late-liquid. Claimed funds arrive immediately in this flow.",
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
      disabledPermission: "This viewer cannot return funding in the current view.",
      disabledPermissionCta: "Return unavailable",
      disabledNoApproval: "Select a refundable approval from the table.",
      disabledNoApprovalCta: "Select approval to return",
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
      empty: "No funding returns have been recorded yet.",
      record: "Return record",
      period: (period: number) => `Period #${period}`,
      approval: (approvalId: string) => `Approval ${approvalId}`,
      returnedBy: "Returned by",
    },
  },
  admin: {
    eyebrow: "Admin console",
    mockBadge: "Access controlled",
    title: "Admin Console",
    description:
      "Operator/admin-only view for registry state, revenue token and bucket coverage, funding queue health, and bonus finalization readiness.",
    loadingTitle: "Loading admin console",
    loadingBody:
      "Preparing registry coverage, bucket usage, funding queue, and bonus finalization detail.",
    emptyTitle: "No admin console available",
    emptyBody:
      "Admin coverage appears here once the current view exposes operator controls.",
    accessCard: {
      title: "Admin visibility is role-gated",
      body:
        "This section stays out of the default team workspace. Switch to an operator/admin viewer to inspect registry, revenue ops, funding ops, and bonus ops.",
      viewerLabel: "Current viewer",
      accessLabel: "Admin controls",
      lockedValue: "Locked",
      hint: "Operator controls unlock when the current viewer has admin access.",
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
