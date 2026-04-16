import type { BadgeProps } from "@/components/ui/Badge";
import type {
  TeamLifecycleStatus,
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
    eyebrow: "Revenue deposit prototype",
    description:
      "Mock-first workspace for scanning registered teams, opening a selected team overview, and previewing permissionless revenue deposits with conversion-aware credited USD.",
    productionGate: "Production gated",
  },
  sections: [
    {
      id: "directory",
      label: "Directory",
      title: "Team Directory",
      body: "Scan multiple teams, compare current-period revenue, cost, and net performance, then open a workspace state from the same route.",
    },
    {
      id: "workspace",
      label: "Workspace",
      title: "Workspace Overview",
      body: "Use current-period and lifetime cards to keep the active reporting window distinct from the longer-lived team history.",
    },
    {
      id: "revenue",
      label: "Revenue",
      title: "Revenue Deposit",
      body: "Preview supported tokens, auto-conversion paths, and accountant credit before recording a mock deposit.",
    },
    {
      id: "states",
      label: "States",
      title: "Prototype States",
      body: "Switch between approved viewer scenarios and force explicit loading or empty coverage without leaving the route.",
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
