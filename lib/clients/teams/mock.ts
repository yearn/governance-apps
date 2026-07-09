import mockExampleScenariosJson from "@/docs/apps/teams/examples/mock-data.example.json";
import { nowSeconds } from "@/lib/mocks/time";
import {
  createTeamsScenarioCatalog,
  deriveTeamsFundingSummary,
  type TeamsClient,
} from "./client";
import type {
  FundingApproval,
  TeamBonusState,
  TeamFinancials,
  TeamFinancialPeriod,
  TeamId,
  TeamLifecycleStatus,
  TeamReadOnlyReason,
  TeamRecord,
  TeamsAdminRecord,
  TeamsMockDataV1,
  TeamsMockExampleScenariosV1,
  TeamsMockScenario,
  TeamsMockScenarioId,
  TeamsViewerContext,
  TeamsViewerRole,
} from "./types";

type MockTeamsClientOptions = {
  latencyMs?: number;
};

export type TeamsMockRuntimeState = {
  presetId: TeamsMockScenarioId;
  data: TeamsMockDataV1;
  isLoading: boolean;
  isEmpty: boolean;
  currentTimeSeconds: number;
  periodBase: number;
  periodAnchorTimeSeconds: number;
  timeTravelDays: number;
};

export type TeamsRevenueDebugState = "seeded" | "empty-history" | "no-options";
export type TeamsFundingDebugState =
  | "claimable"
  | "late-liquid"
  | "fully-used"
  | "none";
export type TeamsBonusDebugState =
  | "claimable"
  | "pending-finalization"
  | "claimed"
  | "none";

const SECONDS_PER_DAY = 24 * 60 * 60;
const DEFAULT_SCENARIO_ID: TeamsMockScenarioId = "directory-observer";
const TEAMS_VIEWER_SCENARIOS: Record<TeamsViewerRole, TeamsMockScenarioId> = {
  observer: "directory-observer",
  "team-owner": "team-owner-funding",
  "finance-operator": "finance-operator-revenue",
  "operator-admin": "operator-admin",
};

const mockExampleScenarios = mockExampleScenariosJson as TeamsMockExampleScenariosV1;
const SCENARIOS = new Map<TeamsMockScenarioId, TeamsMockScenario>(
  mockExampleScenarios.scenarios.map((scenario) => [scenario.id, scenario] as const)
);

let teamsMockRuntimeState = createDefaultMockTeamsRuntimeState();

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function sleep(latencyMs: number) {
  if (latencyMs <= 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    setTimeout(resolve, latencyMs);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergePatch<T>(target: T, patch: Record<string, unknown>): T {
  const base = cloneValue(target) as Record<string, unknown>;

  for (const [key, value] of Object.entries(patch)) {
    if (isRecord(base[key]) && isRecord(value)) {
      base[key] = mergePatch(base[key], value);
      continue;
    }

    base[key] = cloneValue(value);
  }

  return base as T;
}

function getScenarioOrThrow(id: TeamsMockScenarioId): TeamsMockScenario {
  const scenario = SCENARIOS.get(id);
  if (!scenario) {
    throw new Error(`Unknown Teams mock scenario: ${id}`);
  }

  return scenario;
}

function cloneScenario(scenario: TeamsMockScenario): TeamsMockScenario {
  return cloneValue(scenario);
}

function cloneScenarioData(id: TeamsMockScenarioId): TeamsMockDataV1 {
  return cloneValue(getScenarioOrThrow(id).data);
}

function getScenarioTeamOrThrow(
  scenarioId: TeamsMockScenarioId,
  teamId: TeamId
): TeamRecord {
  const team = cloneScenarioData(scenarioId).teams.find(
    (candidate) => candidate.id === teamId
  );

  if (!team) {
    throw new Error(
      `Unknown Teams mock team "${teamId}" in scenario "${scenarioId}".`
    );
  }

  return team;
}

function sumFinancials(
  teams: readonly TeamRecord[],
  key: "currentPeriod" | "lifetime"
): TeamFinancials {
  const totals = teams.reduce(
    (current, team) => {
      current.revenueUsd += Number(team[key].revenueUsd);
      current.costUsd += Number(team[key].costUsd);
      current.profitUsd += Number(team[key].profitUsd);
      current.lossUsd += Number(team[key].lossUsd);
      return current;
    },
    {
      revenueUsd: 0,
      costUsd: 0,
      profitUsd: 0,
      lossUsd: 0,
    }
  );

  return {
    revenueUsd: totals.revenueUsd.toFixed(2),
    costUsd: totals.costUsd.toFixed(2),
    profitUsd: totals.profitUsd.toFixed(2),
    lossUsd: totals.lossUsd.toFixed(2),
  };
}

function normalizeTeamFinancialPeriods(
  team: TeamRecord,
  currentPeriod: number
): TeamFinancialPeriod[] {
  const periods =
    team.financialPeriods && team.financialPeriods.length > 0
      ? team.financialPeriods
      : [
          {
            period: currentPeriod,
            startsAt: null,
            endsAt: null,
            financials: team.currentPeriod,
          },
        ];

  const normalized = periods
    .map((period) => ({
      period: period.period,
      startsAt: period.startsAt ?? null,
      endsAt: period.endsAt ?? null,
      financials:
        period.period === currentPeriod
          ? team.currentPeriod
          : period.financials,
    }))
    .sort((left, right) => right.period - left.period);

  if (!normalized.some((period) => period.period === currentPeriod)) {
    return [
      {
        period: currentPeriod,
        startsAt: null,
        endsAt: null,
        financials: team.currentPeriod,
      },
      ...normalized,
    ];
  }

  return normalized;
}

function finalizeMockTeamsData(data: TeamsMockDataV1): TeamsMockDataV1 {
  const teams = data.teams.map((team) => ({
    ...team,
    financialPeriods: normalizeTeamFinancialPeriods(team, data.currentPeriod),
    fundingSummary: deriveTeamsFundingSummary(team.fundingApprovals),
  }));
  const selectedTeamId =
    data.selectedTeamId && teams.some((team) => team.id === data.selectedTeamId)
      ? data.selectedTeamId
      : null;
  const viewerTeamId =
    data.viewer.teamId && teams.some((team) => team.id === data.viewer.teamId)
      ? data.viewer.teamId
      : selectedTeamId;

  return {
    ...data,
    viewer: {
      ...data.viewer,
      teamId: data.viewer.role === "observer" ? null : viewerTeamId,
    },
    selectedTeamId,
    teams,
    totals: {
      currentPeriod: sumFinancials(teams, "currentPeriod"),
      lifetime: sumFinancials(teams, "lifetime"),
      activeTeamCount: teams.filter((team) => team.status === "active").length,
      retiringTeamCount: teams.filter((team) => team.status === "retiring").length,
      retiredTeamCount: teams.filter((team) => team.status === "retired").length,
    },
  };
}

function syncCurrentPeriod(state: TeamsMockRuntimeState) {
  state.timeTravelDays = Math.trunc(
    (state.currentTimeSeconds - state.periodAnchorTimeSeconds) / SECONDS_PER_DAY
  );
  state.data.currentPeriod = Math.max(
    1,
    state.periodBase + Math.floor(state.timeTravelDays / 7)
  );
}

function finalizeMockTeamsRuntimeState(
  state: TeamsMockRuntimeState
): TeamsMockRuntimeState {
  syncCurrentPeriod(state);
  state.data = finalizeMockTeamsData(state.data);
  return state;
}

function createDefaultMockTeamsRuntimeState(): TeamsMockRuntimeState {
  const data = cloneScenarioData(DEFAULT_SCENARIO_ID);
  const currentTimeSeconds = nowSeconds();

  return finalizeMockTeamsRuntimeState({
    presetId: DEFAULT_SCENARIO_ID,
    data,
    isLoading: false,
    isEmpty: false,
    currentTimeSeconds,
    periodBase: data.currentPeriod,
    periodAnchorTimeSeconds: currentTimeSeconds,
    timeTravelDays: 0,
  });
}

function updateMockTeamsRuntimeState(
  transform: (current: TeamsMockRuntimeState) => TeamsMockRuntimeState
) {
  teamsMockRuntimeState = finalizeMockTeamsRuntimeState(
    transform(cloneValue(teamsMockRuntimeState))
  );
}

function getSelectedTeamIdForMutation(data: TeamsMockDataV1) {
  if (data.selectedTeamId && data.teams.some((team) => team.id === data.selectedTeamId)) {
    return data.selectedTeamId;
  }

  return null;
}

function updateSelectedTeam(
  transform: (team: TeamRecord) => TeamRecord
) {
  updateMockTeamsRuntimeState((current) => {
    const teamId = getSelectedTeamIdForMutation(current.data);
    if (!teamId) {
      return current;
    }

    current.data.selectedTeamId = teamId;
    current.data.teams = current.data.teams.map((team) =>
      team.id === teamId ? transform(team) : team
    );

    return current;
  });
}

function createViewerContextForRole(
  role: TeamsViewerRole,
  current: TeamsMockDataV1
): TeamsViewerContext {
  const sourceViewer = cloneScenarioData(TEAMS_VIEWER_SCENARIOS[role]).viewer;
  const selectedTeamId = current.selectedTeamId ?? current.viewer.teamId ?? null;

  return {
    ...sourceViewer,
    role,
    address: current.viewer.address ?? sourceViewer.address,
    teamId: role === "observer" ? null : selectedTeamId,
  };
}

function getRevenueFixtureTeam() {
  return getScenarioTeamOrThrow("finance-operator-revenue", "platform");
}

function getFundingClaimableFixtureTeam() {
  return getScenarioTeamOrThrow("team-owner-funding", "security");
}

function getFundingLateLiquidFixtureTeam() {
  const team = getFundingClaimableFixtureTeam();
  return {
    ...team,
    fundingApprovals: team.fundingApprovals.filter(
      (approval) =>
        approval.status === "late-liquid" || approval.status === "fully-used"
    ),
    fundingReturns: team.fundingReturns.filter(
      (entry) => entry.approvalId === "approval-security-21"
    ),
  };
}

function getFundingFullyUsedFixtureTeam() {
  return getScenarioTeamOrThrow("directory-observer", "research");
}

function getBonusFixtureState(mode: TeamsBonusDebugState): TeamBonusState {
  if (mode === "claimable") {
    return getScenarioTeamOrThrow("bonus-available", "platform").bonus;
  }

  if (mode === "pending-finalization") {
    return getScenarioTeamOrThrow("operator-admin", "research").bonus;
  }

  if (mode === "claimed") {
    return getScenarioTeamOrThrow("directory-observer", "security").bonus;
  }

  return getScenarioTeamOrThrow("finance-operator-revenue", "platform").bonus;
}

function getLifecycleFixture(status: TeamLifecycleStatus) {
  if (status === "retiring") {
    return getScenarioTeamOrThrow("directory-observer", "research");
  }

  if (status === "retired") {
    return getScenarioTeamOrThrow("retired-read-only", "grants-archive");
  }

  return getScenarioTeamOrThrow("directory-observer", "platform");
}

function getDefaultAdminRecord(): TeamsAdminRecord {
  const admin = cloneScenarioData("operator-admin").admin;

  if (!admin) {
    throw new Error("Operator/admin scenario must include admin data.");
  }

  return admin;
}

function normalizeFundingApproval(
  approval: FundingApproval
): FundingApproval {
  return {
    ...approval,
    recipient: approval.recipient ?? null,
    averageClaimPriceUsd: approval.averageClaimPriceUsd ?? null,
  };
}

export function listTeamsMockScenarios(): readonly TeamsMockScenario[] {
  return mockExampleScenarios.scenarios;
}

export function getTeamsMockScenario(id: TeamsMockScenarioId): TeamsMockScenario {
  return cloneScenario(getScenarioOrThrow(id));
}

export function cloneTeamsMockScenarioData(id: TeamsMockScenarioId): TeamsMockDataV1 {
  return cloneScenarioData(id);
}

export function getMockTeamsRuntimeState(): TeamsMockRuntimeState {
  return cloneValue(teamsMockRuntimeState);
}

export function setMockTeamsPreset(id: TeamsMockScenarioId) {
  updateMockTeamsRuntimeState(() => {
    const data = cloneScenarioData(id);
    const currentTimeSeconds = nowSeconds();

    return {
      presetId: id,
      data,
      isLoading: false,
      isEmpty: false,
      currentTimeSeconds,
      periodBase: data.currentPeriod,
      periodAnchorTimeSeconds: currentTimeSeconds,
      timeTravelDays: 0,
    };
  });
}

export function resetMockTeamsStore() {
  teamsMockRuntimeState = createDefaultMockTeamsRuntimeState();
}

export function advanceMockTeamsTime(days: number) {
  updateMockTeamsRuntimeState((current) => {
    current.currentTimeSeconds += days * SECONDS_PER_DAY;
    return current;
  });
}

export function setMockTeamsNow(timestamp: number) {
  updateMockTeamsRuntimeState((current) => {
    current.currentTimeSeconds = timestamp;
    return current;
  });
}

export function setMockTeamsViewerRole(role: TeamsViewerRole) {
  updateMockTeamsRuntimeState((current) => {
    current.data.viewer = createViewerContextForRole(role, current.data);
    if (role === "operator-admin") {
      current.data.admin = current.data.admin ?? getDefaultAdminRecord();
    }
    return current;
  });
}

export function setMockTeamsSelectedTeam(teamId: TeamId | null) {
  updateMockTeamsRuntimeState((current) => {
    const nextTeamId =
      teamId && current.data.teams.some((team) => team.id === teamId) ? teamId : null;

    current.data.selectedTeamId = nextTeamId;
    if (current.data.viewer.role !== "observer") {
      current.data.viewer.teamId = nextTeamId;
    }

    return current;
  });
}

export function setMockTeamsLoading(value: boolean) {
  updateMockTeamsRuntimeState((current) => {
    current.isLoading = value;
    if (value) {
      current.isEmpty = false;
    }
    return current;
  });
}

export function setMockTeamsEmpty(value: boolean) {
  updateMockTeamsRuntimeState((current) => {
    current.isEmpty = value;
    if (value) {
      current.isLoading = false;
    }
    return current;
  });
}

export function setMockTeamsCurrentPeriod(period: number | null) {
  updateMockTeamsRuntimeState((current) => {
    current.periodBase = Math.max(
      1,
      period ?? cloneScenarioData(current.presetId).currentPeriod
    );
    current.periodAnchorTimeSeconds = current.currentTimeSeconds;
    current.timeTravelDays = 0;
    return current;
  });
}

export function replaceMockTeamsTeam(nextTeam: TeamRecord) {
  updateMockTeamsRuntimeState((current) => {
    current.data.teams = current.data.teams.map((team) =>
      team.id === nextTeam.id ? cloneValue(nextTeam) : team
    );
    return current;
  });
}

export function patchMockTeamsTeam(teamId: TeamId, patch: Record<string, unknown>) {
  updateMockTeamsRuntimeState((current) => {
    current.data.teams = current.data.teams.map((team) => {
      if (team.id !== teamId) {
        return team;
      }

      const nextTeam = mergePatch(team, patch);
      const approvalsPatched = Object.prototype.hasOwnProperty.call(
        patch,
        "fundingApprovals"
      );

      return approvalsPatched
        ? {
            ...nextTeam,
            fundingApprovals: nextTeam.fundingApprovals.map(normalizeFundingApproval),
          }
        : nextTeam;
    });

    return current;
  });
}

export function patchMockTeamsFundingApproval(
  approvalId: string,
  patch: Record<string, unknown>
) {
  updateMockTeamsRuntimeState((current) => {
    current.data.teams = current.data.teams.map((team) => {
      if (!team.fundingApprovals.some((approval) => approval.id === approvalId)) {
        return team;
      }

      return {
        ...team,
        fundingApprovals: team.fundingApprovals.map((approval) =>
          approval.id === approvalId
            ? normalizeFundingApproval(mergePatch(approval, patch))
            : approval
        ),
      };
    });

    return current;
  });
}

export function patchMockTeamsBonus(patch: Record<string, unknown>) {
  updateSelectedTeam((team) => {
    const nextBonus = mergePatch(team.bonus, patch);

    return {
      ...team,
      bonus: {
        ...nextBonus,
        includedPeriodCount: nextBonus.periods.length,
      },
    };
  });
}

export function patchMockTeamsAdmin(patch: Record<string, unknown>) {
  updateMockTeamsRuntimeState((current) => {
    const { enabled, ...adminPatch } = patch as Record<string, unknown> & {
      enabled?: boolean;
    };

    if (typeof enabled === "boolean") {
      current.data.viewer.canUseAdmin = enabled;
      current.data.admin = enabled ? current.data.admin ?? getDefaultAdminRecord() : undefined;
    }

    if (Object.keys(adminPatch).length > 0) {
      current.data.admin = mergePatch(
        current.data.admin ?? getDefaultAdminRecord(),
        adminPatch
      );
    }

    return current;
  });
}

export function setMockTeamsSelectedTeamLifecycle(status: TeamLifecycleStatus) {
  const fixture = getLifecycleFixture(status);

  updateSelectedTeam((team) => ({
    ...team,
    status,
    lifecycle: cloneValue(fixture.lifecycle),
    readOnlyReason: status === "retired" ? fixture.readOnlyReason : null,
  }));
}

export function setMockTeamsSelectedTeamReadOnlyReason(
  reason: TeamReadOnlyReason | null
) {
  updateSelectedTeam((team) => ({
    ...team,
    readOnlyReason: reason,
  }));
}

export function setMockTeamsSelectedTeamRevenueState(
  mode: TeamsRevenueDebugState
) {
  const fixture = getRevenueFixtureTeam();

  updateSelectedTeam((team) => ({
    ...team,
    revenueOptions:
      mode === "no-options" ? [] : cloneValue(fixture.revenueOptions),
    revenueHistory:
      mode === "seeded" ? cloneValue(fixture.revenueHistory) : [],
  }));
}

export function setMockTeamsSelectedTeamFundingState(
  mode: TeamsFundingDebugState
) {
  const fixture =
    mode === "claimable"
      ? getFundingClaimableFixtureTeam()
      : mode === "late-liquid"
        ? getFundingLateLiquidFixtureTeam()
        : mode === "fully-used"
          ? getFundingFullyUsedFixtureTeam()
          : null;

  updateSelectedTeam((team) => ({
    ...team,
    fundingApprovals: fixture ? cloneValue(fixture.fundingApprovals) : [],
    fundingReturns: fixture ? cloneValue(fixture.fundingReturns) : [],
  }));
}

export function setMockTeamsSelectedTeamBonusState(mode: TeamsBonusDebugState) {
  updateSelectedTeam((team) => ({
    ...team,
    bonus: cloneValue(getBonusFixtureState(mode)),
  }));
}

export function setMockTeamsAdminVisible(enabled: boolean) {
  patchMockTeamsAdmin({ enabled });
}

export class MockTeamsClient implements TeamsClient {
  private readonly latencyMs: number;

  constructor({ latencyMs = 300 }: MockTeamsClientOptions = {}) {
    this.latencyMs = latencyMs;
  }

  async listScenarioCatalog() {
    await sleep(this.latencyMs);
    return createTeamsScenarioCatalog(mockExampleScenarios.scenarios);
  }

  async getScenario(id: TeamsMockScenarioId) {
    await sleep(this.latencyMs);
    return cloneScenario(getScenarioOrThrow(id));
  }

  async getPageState() {
    await sleep(this.latencyMs);
    return getMockTeamsRuntimeState();
  }
}

export function createMockTeamsClient(options: MockTeamsClientOptions = {}) {
  return new MockTeamsClient(options);
}
