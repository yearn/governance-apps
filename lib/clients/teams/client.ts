import type {
  BasisPoints,
  DecimalString,
  TeamFinancials,
  TeamId,
  TeamRecord,
  TeamsMockDataV1,
  TeamsMockExampleScenariosV1,
  TeamsMockScenario,
  TeamsMockScenarioId,
  TeamsViewerRole,
  UnixTimestampSeconds,
  UsdDecimalString,
} from "./types";

export type TeamsScenarioCatalogEntry = {
  id: TeamsMockScenarioId;
  label: string;
  selectedTeamId: TeamId | null;
  viewerRole: TeamsViewerRole;
  teamCount: number;
  hasAdmin: boolean;
};

export interface TeamsClient {
  listScenarioCatalog(): Promise<TeamsScenarioCatalogEntry[]>;
  getScenario(id: TeamsMockScenarioId): Promise<TeamsMockScenario>;
}

export function createTeamsScenarioCatalog(
  scenarios: TeamsMockExampleScenariosV1["scenarios"]
): TeamsScenarioCatalogEntry[] {
  return scenarios.map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    selectedTeamId: scenario.data.selectedTeamId,
    viewerRole: scenario.data.viewer.role,
    teamCount: scenario.data.teams.length,
    hasAdmin: Boolean(scenario.data.admin),
  }));
}

export function resolveSelectedTeam(
  data: TeamsMockDataV1 | null | undefined,
  teamId?: TeamId | null
): TeamRecord | null {
  if (!data) return null;

  const resolvedTeamId = teamId ?? data.selectedTeamId;
  if (!resolvedTeamId) return null;

  return data.teams.find((team) => team.id === resolvedTeamId) ?? null;
}

export function formatTeamsUsd(
  value: UsdDecimalString,
  maximumFractionDigits = 0
): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "$0";

  return numeric.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  });
}

export function formatTeamsDecimal(
  value: DecimalString,
  maximumFractionDigits = 2
): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";

  return numeric.toLocaleString("en-US", {
    maximumFractionDigits,
  });
}

export function formatTeamsTokenAmount(
  value: DecimalString,
  symbol?: string,
  maximumFractionDigits = 2
): string {
  const amount = formatTeamsDecimal(value, maximumFractionDigits);
  return symbol ? `${amount} ${symbol}` : amount;
}

export function formatTeamsPercentFromBps(
  value: BasisPoints,
  maximumFractionDigits = 0
): string {
  const numeric = value / 10_000;
  if (!Number.isFinite(numeric)) return "0%";

  return numeric.toLocaleString("en-US", {
    style: "percent",
    maximumFractionDigits,
  });
}

const TEAMS_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatTeamsDate(value: UnixTimestampSeconds | null | undefined) {
  if (typeof value !== "number") return null;
  return TEAMS_DATE_FORMATTER.format(value * 1000);
}

export function getFinancialNetState(financials: TeamFinancials) {
  const profit = Number(financials.profitUsd);
  const loss = Number(financials.lossUsd);

  if (Number.isFinite(loss) && loss > 0) {
    return {
      label: "Loss",
      value: financials.lossUsd,
      tone: "loss" as const,
    };
  }

  if (Number.isFinite(profit) && profit > 0) {
    return {
      label: "Profit",
      value: financials.profitUsd,
      tone: "profit" as const,
    };
  }

  return {
    label: "Net",
    value: "0.00" as UsdDecimalString,
    tone: "neutral" as const,
  };
}
