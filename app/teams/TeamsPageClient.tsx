"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { StatsBar } from "@/components/ui/StatsBar";
import {
  resolveSelectedTeam,
  type TeamRecord,
} from "@/lib/clients/teams";
import { useTeamsDebugActions, useTeamsState } from "@/lib/hooks/useTeams";
import { RevenueDepositCard } from "./components/RevenueDepositCard";
import { AdminConsole } from "./components/AdminConsole";
import { MockControls } from "./components/MockControls";
import { TeamWorkspace } from "./components/TeamWorkspace";
import { TeamsDirectory } from "./components/TeamsDirectory";
import { teamsCopy } from "./messages";

const EMPTY_STATS_VALUE = "--";

export function TeamsPageClient() {
  const { replaceTeam, setSelectedTeam } = useTeamsDebugActions();
  const runtimeQuery = useTeamsState();
  const runtime = runtimeQuery.data ?? null;
  const data = runtime?.data ?? null;
  const renderState =
    runtimeQuery.isPending || runtime?.isLoading
      ? "loading"
      : runtime?.isEmpty
        ? "empty"
        : "ready";
  const selectedTeamId = data?.selectedTeamId ?? null;
  const selectedTeam = resolveSelectedTeam(data);
  const showAdminSection = Boolean(data?.viewer.canUseAdmin);
  const navigationSections = showAdminSection
    ? teamsCopy.navigation
    : teamsCopy.navigation.filter((section) => section.id !== "admin");
  const revenueCardKey = [
    renderState,
    runtime?.presetId ?? "default",
    selectedTeam?.id ?? "none",
    selectedTeam?.revenueOptions
      .map((option) => `${option.tokenAddress}:${option.previewAmount}`)
      .join("|") ?? "no-options",
  ].join("::");

  const statsItems =
    renderState === "ready" && data
      ? [
          {
            label: teamsCopy.stats.currentPeriod,
            value: `#${data.currentPeriod}`,
          },
          {
            label: teamsCopy.stats.activeTeams,
            value: data.totals.activeTeamCount,
          },
          {
            label: teamsCopy.stats.retiringTeams,
            value: data.totals.retiringTeamCount,
          },
          {
            label: teamsCopy.stats.retiredTeams,
            value: data.totals.retiredTeamCount,
          },
          {
            label: teamsCopy.stats.viewerRole,
            value: teamsCopy.viewerRoles[data.viewer.role],
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
        <div className="container mx-auto min-h-[360px] px-4 py-12 md:px-6 md:py-16">
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
        </div>
      </section>

      <StatsBar items={statsItems} />

      <section
        id="directory"
        className="container mx-auto px-4 py-10 md:px-6 md:py-14"
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <TeamsDirectory
            teams={renderState === "ready" ? data?.teams ?? [] : []}
            selectedTeamId={selectedTeamId}
            onSelectTeam={(teamId) => {
              void setSelectedTeam(teamId);
            }}
            state={renderState}
          />

          <div id="workspace">
            <TeamWorkspace
              team={renderState === "ready" ? selectedTeam : null}
              viewer={renderState === "ready" ? data?.viewer ?? null : null}
              currentPeriod={renderState === "ready" ? data?.currentPeriod ?? null : null}
              onUpdateTeam={handleTeamUpdate}
              state={renderState}
            />
          </div>
        </div>
      </section>

      <section id="revenue" className="container mx-auto px-4 pb-10 md:px-6 md:pb-14">
        <RevenueDepositCard
          key={revenueCardKey}
          team={renderState === "ready" ? selectedTeam : null}
          viewer={renderState === "ready" ? data?.viewer ?? null : null}
          currentPeriod={renderState === "ready" ? data?.currentPeriod ?? null : null}
          onUpdateTeam={handleTeamUpdate}
          state={renderState}
        />
      </section>

      {showAdminSection ? (
        <section id="admin" className="container mx-auto px-4 pb-10 md:px-6 md:pb-14">
          <AdminConsole
            admin={renderState === "ready" ? data?.admin ?? null : null}
            teams={renderState === "ready" ? data?.teams ?? [] : []}
            viewer={renderState === "ready" ? data?.viewer ?? null : null}
            currentPeriod={renderState === "ready" ? data?.currentPeriod ?? null : null}
            state={renderState}
          />
        </section>
      ) : null}

      <MockControls />
    </div>
  );

  function handleTeamUpdate(nextTeam: TeamRecord) {
    void replaceTeam(nextTeam);
  }
}
