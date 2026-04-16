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
    eyebrow: "Funding claim and return prototype",
    description:
      "Mock-first workspace for scanning registered teams, opening a selected team overview, and validating funding claim and return flows without collapsing current-period reporting into lifetime history.",
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
      "Switch between approved viewer scenarios and force explicit loading or empty coverage without leaving the route.",
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
