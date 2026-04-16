import type { BadgeProps } from "@/components/ui/Badge";
import type {
  FundingApprovalStatus,
  TeamLifecycleStatus,
  TeamFundingSummaryState,
  TeamReadOnlyReason,
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
    eyebrow: "Interactive mock finance flows",
    description:
      "Mock-first workspace for scanning registered teams, opening a selected team overview, and validating revenue deposit plus funding claim and return flows without collapsing current-period reporting into lifetime history.",
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
      id: "states",
      label: "States",
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
      "Switch between approved viewer scenarios and force explicit loading or empty coverage while validating both revenue deposit and funding claim flows.",
    scenarioLabel: "Scenarios",
    surfaceLabel: "Surface state",
    scenarioNames: {
      "directory-observer": "Directory mix",
      "team-owner-funding": "Owner workspace",
      "bonus-available": "Single-team snapshot",
      "finance-operator-revenue": "Operator workspace",
      "retired-read-only": "Retired workspace",
      "operator-admin": "Two-team snapshot",
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
    retirement: {
      active: "Active",
      retiringPrefix: "Retires in period",
      retiredPrefix: "Retired in period",
      announcedPrefix: "Announced",
    },
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
