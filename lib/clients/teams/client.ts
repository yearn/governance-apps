import type {
  DecimalString,
  RevenueOption,
  TeamFinancials,
  TeamId,
  TeamRecord,
  TeamsMockDataV1,
  TeamsMockExampleScenariosV1,
  TeamsMockScenario,
  TeamsMockScenarioId,
  TeamsViewerRole,
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

export function formatTeamsTokenAmount(
  value: DecimalString,
  maximumFractionDigits = 4
): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "0";

  return numeric.toLocaleString("en-US", {
    maximumFractionDigits,
  });
}

export function estimateRevenueCreditUsd(
  option: RevenueOption,
  amount: DecimalString
): UsdDecimalString | null {
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return null;

  const quotedAmount = Number(option.previewAmount);
  const quotedCredit = Number(option.estimatedCreditUsd);

  if (
    Number.isFinite(quotedAmount) &&
    quotedAmount > 0 &&
    Number.isFinite(quotedCredit)
  ) {
    return ((parsedAmount / quotedAmount) * quotedCredit).toFixed(2);
  }

  const oraclePriceUsd = Number(option.oraclePriceUsd);
  if (!Number.isFinite(oraclePriceUsd)) return null;

  return (parsedAmount * oraclePriceUsd).toFixed(2);
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
