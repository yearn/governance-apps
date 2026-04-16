import type { BadgeProps } from "@/components/ui/Badge";
import type {
  BonusPeriodStatus,
  TeamBonusStatus,
  TeamLifecycleStatus,
  TeamMigrationReadiness,
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
    eyebrow: "Directory, bonus, and lifecycle prototype",
    description:
      "Mock-first workspace for scanning registered teams, opening a selected workspace, and keeping bonus availability plus ownership and lifecycle state visible without turning protocol math into the default view.",
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
    cardTitle: "Prototype States",
    cardBody:
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
