"use client";

import Link from "next/link";
import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatsBar } from "@/components/ui/StatsBar";
import { LogoYearnGlyph } from "@/components/icons/LogoYearnGlyph";
import {
  resolveSelectedTeam,
  type TeamsMockDataV1,
  type TeamsMockScenarioId,
  type TeamRecord,
} from "@/lib/clients/teams";
import { useTeamsScenario, useTeamsScenarioCatalog } from "@/lib/hooks/useTeams";
import { RevenueDepositCard } from "./components/RevenueDepositCard";
import { AdminConsole } from "./components/AdminConsole";
import { TeamWorkspace } from "./components/TeamWorkspace";
import { TeamsDirectory } from "./components/TeamsDirectory";
import { teamsCopy } from "./messages";

const DEFAULT_SCENARIO_ID: TeamsMockScenarioId = "directory-observer";
const EMPTY_STATS_VALUE = "--";

type SurfaceState = "scenario" | "loading" | "empty";

export function TeamsPageClient() {
  const [activeScenarioId, setActiveScenarioId] =
    useState<TeamsMockScenarioId>(DEFAULT_SCENARIO_ID);
  const [manualSelectedTeamId, setManualSelectedTeamId] = useState<string | null>(null);
  const [surfaceState, setSurfaceState] = useState<SurfaceState>("scenario");
  const [scenarioData, setScenarioData] = useState<TeamsMockDataV1 | null>(null);

  const scenarioCatalogQuery = useTeamsScenarioCatalog();
  const scenarioQuery = useTeamsScenario(activeScenarioId);
  const scenario = scenarioQuery.data ?? null;
  const activeScenarioCatalogEntry = scenarioCatalogQuery.data?.find(
    (entry) => entry.id === activeScenarioId
  );
  const renderState =
    surfaceState === "loading" || scenarioQuery.isPending
      ? "loading"
      : surfaceState === "empty"
        ? "empty"
        : "ready";
  const showAdminSection = activeScenarioCatalogEntry?.hasAdmin ?? false;
  const navigationSections = showAdminSection
    ? teamsCopy.navigation
    : teamsCopy.navigation.filter((section) => section.id !== "admin");

  useEffect(() => {
    if (surfaceState !== "scenario") {
      return;
    }

    setScenarioData(scenario?.data ?? null);
  }, [scenario, surfaceState]);

  const selectedTeamId = useMemo(() => {
    if (!scenarioData) return null;

    if (
      manualSelectedTeamId &&
      scenarioData.teams.some((team) => team.id === manualSelectedTeamId)
    ) {
      return manualSelectedTeamId;
    }

    if (
      scenarioData.selectedTeamId &&
      scenarioData.teams.some((team) => team.id === scenarioData.selectedTeamId)
    ) {
      return scenarioData.selectedTeamId;
    }

    return null;
  }, [manualSelectedTeamId, scenarioData]);

  const selectedTeam = useMemo(
    () => resolveSelectedTeam(scenarioData, selectedTeamId),
    [scenarioData, selectedTeamId]
  );

  const statsItems =
    renderState === "ready" && scenarioData
      ? [
          {
            label: teamsCopy.stats.currentPeriod,
            value: `#${scenarioData.currentPeriod}`,
          },
          {
            label: teamsCopy.stats.activeTeams,
            value: scenarioData.totals.activeTeamCount,
          },
          {
            label: teamsCopy.stats.retiringTeams,
            value: scenarioData.totals.retiringTeamCount,
          },
          {
            label: teamsCopy.stats.retiredTeams,
            value: scenarioData.totals.retiredTeamCount,
          },
          {
            label: teamsCopy.stats.viewerRole,
            value: teamsCopy.viewerRoles[scenarioData.viewer.role],
          },
        ]
      : [
          { label: teamsCopy.stats.currentPeriod, value: EMPTY_STATS_VALUE },
          { label: teamsCopy.stats.activeTeams, value: EMPTY_STATS_VALUE },
          { label: teamsCopy.stats.retiringTeams, value: EMPTY_STATS_VALUE },
          { label: teamsCopy.stats.retiredTeams, value: EMPTY_STATS_VALUE },
          { label: teamsCopy.stats.viewerRole, value: EMPTY_STATS_VALUE },
        ];

  return (
    <div className="bg-app text-text-primary">
      <section className="border-b border-border bg-surface">
        <div className="container mx-auto grid min-h-[420px] items-center gap-10 px-4 py-12 md:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] md:px-6 md:py-16">
          <div className="max-w-3xl space-y-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">{teamsCopy.app.routeKey}</Badge>
              <Badge variant="warning">{teamsCopy.page.productionGate}</Badge>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-bold uppercase text-text-tertiary">
                {teamsCopy.page.eyebrow}
              </p>
              <h1 className="text-4xl font-bold md:text-6xl">{teamsCopy.page.title}</h1>
              <p className="max-w-2xl text-base leading-7 text-text-secondary md:text-lg">
                {teamsCopy.page.description}
              </p>
            </div>

            <nav aria-label="Team Finances sections" className="flex flex-wrap gap-2">
              {navigationSections.map((section) => (
                <Link
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-box border border-border bg-app px-3 py-2 text-sm font-bold text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
                >
                  {section.label}
                </Link>
              ))}
            </nav>
          </div>

          <Card className="relative overflow-hidden p-0">
            <div className="absolute right-0 top-0 h-24 w-24 border-b border-l border-yearn-blue/20 bg-yearn-blue/10" />
            <div className="relative space-y-6 p-6">
              <div className="flex size-16 items-center justify-center rounded-box bg-yearn-blue text-white">
                <LogoYearnGlyph
                  className="size-9"
                  backClassName="text-yearn-blue"
                  frontClassName="text-white"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold uppercase text-text-tertiary">
                    {teamsCopy.controls.title}
                  </p>
                  <h2 className="text-2xl font-bold">
                    {teamsCopy.controls.heading ?? teamsCopy.controls.cardTitle}
                  </h2>
                </div>
                <p className="text-sm leading-6 text-text-secondary">
                  {teamsCopy.controls.description ?? teamsCopy.controls.cardBody}
                </p>
              </div>

              <div id="states" className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
                    {teamsCopy.controls.scenarioLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(scenarioCatalogQuery.data ?? []).map((scenarioOption) => (
                      <Button
                        key={scenarioOption.id}
                        size="sm"
                        variant={
                          surfaceState === "scenario" &&
                          scenarioOption.id === activeScenarioId
                            ? "primary"
                            : "secondary"
                        }
                        onClick={() => {
                          setSurfaceState("scenario");
                          setManualSelectedTeamId(null);
                          startTransition(() => {
                            setActiveScenarioId(scenarioOption.id);
                          });
                        }}
                      >
                        {teamsCopy.controls.scenarioNames[scenarioOption.id]}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
                    {teamsCopy.controls.surfaceLabel}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(
                      Object.entries(teamsCopy.controls.surfaceModes) as [
                        SurfaceState,
                        string,
                      ][]
                    ).map(([mode, label]) => (
                      <Button
                        key={mode}
                        size="sm"
                        variant={surfaceState === mode ? "primary" : "secondary"}
                        onClick={() => setSurfaceState(mode)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-xs leading-5 text-text-secondary">
                {teamsCopy.controls.adminHint}
              </p>

              <div className="grid gap-3 text-sm">
                <RolloutRow
                  label="Beta host"
                  value={teamsCopy.app.betaHost}
                  status="Mock-first route validation target"
                />
                <RolloutRow
                  label="Production host"
                  value={teamsCopy.app.productionHost}
                  status="Gated until live contract wiring and production approval"
                />
              </div>
            </div>
          </Card>
        </div>
      </section>

      <StatsBar items={statsItems} />

      <section
        id="directory"
        className="container mx-auto px-4 py-10 md:px-6 md:py-14"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <TeamsDirectory
            teams={renderState === "ready" ? scenarioData?.teams ?? [] : []}
            selectedTeamId={selectedTeamId}
            onSelectTeam={setManualSelectedTeamId}
            state={renderState}
          />

          <div id="workspace">
            <TeamWorkspace
              team={renderState === "ready" ? selectedTeam : null}
              viewer={renderState === "ready" ? scenarioData?.viewer ?? null : null}
              currentPeriod={renderState === "ready" ? scenarioData?.currentPeriod ?? null : null}
              onUpdateTeam={handleTeamUpdate}
              state={renderState}
            />
          </div>
        </div>
      </section>

      <section id="revenue" className="container mx-auto px-4 pb-10 md:px-6 md:pb-14">
        <RevenueDepositCard
          key={`${renderState}:${activeScenarioId}:${selectedTeamId ?? "none"}`}
          team={renderState === "ready" ? selectedTeam : null}
          viewer={renderState === "ready" ? scenarioData?.viewer ?? null : null}
          currentPeriod={renderState === "ready" ? scenarioData?.currentPeriod ?? null : null}
          state={renderState}
        />
      </section>

      {showAdminSection ? (
        <section id="admin" className="container mx-auto px-4 pb-10 md:px-6 md:pb-14">
          <AdminConsole
            admin={renderState === "ready" ? scenarioData?.admin ?? null : null}
            teams={renderState === "ready" ? scenarioData?.teams ?? [] : []}
            viewer={renderState === "ready" ? scenarioData?.viewer ?? null : null}
            currentPeriod={renderState === "ready" ? scenarioData?.currentPeriod ?? null : null}
            state={renderState}
          />
        </section>
      ) : null}
    </div>
  );

  function handleTeamUpdate(nextTeam: TeamRecord) {
    setScenarioData((currentData) => {
      if (!currentData) {
        return currentData;
      }

      return {
        ...currentData,
        teams: currentData.teams.map((team) => (team.id === nextTeam.id ? nextTeam : team)),
      };
    });
  }
}

function RolloutRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: string;
}) {
  return (
    <div className="grid gap-1 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase text-text-tertiary">{label}</span>
        <span className="font-number text-sm font-bold text-text-primary">{value}</span>
      </div>
      <p className="text-xs text-text-secondary">{status}</p>
    </div>
  );
}
