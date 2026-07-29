"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatsBar } from "@/components/ui/StatsBar";
import { Tabs } from "@/components/ui/Tabs";
import { UtcTime } from "@/components/ui/UtcTime";
import {
  deriveTeamsViewerForTeam,
  resolveSelectedTeam,
  type TeamRecord,
} from "@/lib/clients/teams";
import { useTeamsDebugActions, useTeamsState } from "@/lib/hooks/useTeams";
import { useTeamsWrites } from "@/lib/hooks/useTeamsWrites";
import { AdminConsole } from "./components/AdminConsole";
import { MockControls } from "./components/MockControls";
import { TeamWorkspace } from "./components/TeamWorkspace";
import { TeamsDirectory } from "./components/TeamsDirectory";
import { teamsCopy } from "./messages";

const EMPTY_STATS_VALUE = "--";
type TeamsTopTab = "directory" | "workspace" | "admin";

const WORKSPACE_HASHES = new Set([
  "workspace",
  "overview",
  "revenue",
  "funding",
  "bonus",
  "lifecycle",
]);

function getTeamsTopTabId(tabId: string) {
  return `teams-section-tab-${tabId}`;
}

export function TeamsPageClient() {
  const { replaceTeam, setSelectedTeam } = useTeamsDebugActions();
  const [activeTopTab, setActiveTopTab] = useState<TeamsTopTab>("directory");
  const [feedSelectedTeamId, setFeedSelectedTeamId] = useState<string | null>(null);
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const runtimeQuery = useTeamsState();
  const runtime = runtimeQuery.data ?? null;
  const isLiveBackend =
    runtimeQuery.backend === "feed" || runtime?.backend === "feed";
  const liveReadStatus = runtimeQuery.readStatus ?? "current";
  const teamsWrites = useTeamsWrites(runtimeQuery.writeFeed);
  const data = runtime?.data ?? null;
  const isMockRuntime = !isLiveBackend;
  const renderState =
    runtimeQuery.isPending || runtime?.isLoading
      ? "loading"
      : runtime?.isEmpty
        ? "empty"
        : "ready";
  const selectedTeamId =
    runtime?.backend === "feed"
      ? feedSelectedTeamId ?? data?.selectedTeamId ?? null
      : data?.selectedTeamId ?? null;
  const selectedTeam = resolveSelectedTeam(data, selectedTeamId);
  const selectedViewer =
    data && selectedTeam
      ? deriveTeamsViewerForTeam(
          data.viewer,
          selectedTeam,
          data.currentPeriod
        )
      : data?.viewer ?? null;
  const showAdminSection = Boolean(data?.viewer.canUseAdmin);
  const resolvedActiveTopTab =
    activeTopTab === "admin" && !showAdminSection ? "directory" : activeTopTab;
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;

      if (hash === "admin") {
        setActiveTopTab("admin");
        setPendingScrollId(hash);
        return;
      }

      if (WORKSPACE_HASHES.has(hash)) {
        setActiveTopTab("workspace");
        setPendingScrollId(hash);
        return;
      }

      if (hash === "directory") {
        setActiveTopTab("directory");
        setPendingScrollId(hash);
      }
    };

    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !showAdminSection) return;

    if (window.location.hash === "#admin") {
      window.requestAnimationFrame(() => {
        setActiveTopTab("admin");
        setPendingScrollId("admin");
      });
    }
  }, [showAdminSection]);

  useEffect(() => {
    if (runtime?.backend !== "feed" || !feedSelectedTeamId || !data) return;
    if (data.teams.some((team) => team.id === feedSelectedTeamId)) return;
    setFeedSelectedTeamId(data.selectedTeamId);
  }, [data, feedSelectedTeamId, runtime?.backend]);

  useEffect(() => {
    if (!pendingScrollId) return;

    window.requestAnimationFrame(() => {
      const target = document.getElementById(pendingScrollId);
      if (typeof target?.scrollIntoView === "function") {
        target.scrollIntoView({ block: "start" });
      }
      setPendingScrollId(null);
    });
  }, [resolvedActiveTopTab, pendingScrollId, showAdminSection]);

  const topTabs = [
    {
      id: "directory",
      label: teamsCopy.navigation.directory,
      badge:
        renderState === "ready" && data
          ? data.teams.length.toLocaleString("en-US")
          : undefined,
    },
    {
      id: "workspace",
      label: teamsCopy.navigation.workspace,
      badge: selectedTeam?.name ?? undefined,
    },
    ...(showAdminSection
      ? [
          {
            id: "admin",
            label: teamsCopy.navigation.admin,
          },
        ]
      : []),
  ];

  return (
    <div className="bg-app text-text-primary">
      <section className="border-b border-border bg-surface">
        <div className="container mx-auto px-4 py-10 md:px-6 md:py-12">
          <div className="max-w-3xl space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">{teamsCopy.app.routeKey}</Badge>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-bold uppercase text-text-tertiary">
                {teamsCopy.page.eyebrow}
              </p>
              <h1 className="text-3xl font-bold md:text-5xl">{teamsCopy.page.title}</h1>
              <p className="max-w-2xl text-base leading-7 text-text-secondary">
                {teamsCopy.page.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      <StatsBar items={statsItems} />

      <main className="container mx-auto space-y-6 px-4 py-8 md:px-6 md:py-10">
        {isLiveBackend ? (
          <TeamsDataStatusNotice
            isRefreshing={runtimeQuery.isRefreshing}
            lastUpdatedAt={runtimeQuery.lastUpdatedAt}
            onRetry={() => {
              void runtimeQuery.refetch();
            }}
            readStatus={liveReadStatus}
            warningMessage={
              runtimeQuery.warning?.message ??
              runtimeQuery.error?.message ??
              null
            }
          />
        ) : null}

        <Tabs
          aria-label="Team Finances sections"
          tabs={topTabs}
          activeTab={resolvedActiveTopTab}
          getPanelId={(tabId) => tabId}
          getTabId={getTeamsTopTabId}
          onChange={(tabId) => handleTopTabChange(tabId as TeamsTopTab)}
          variant="line"
          className="overflow-x-auto"
        />

        <section
          id="directory"
          role="tabpanel"
          aria-labelledby={getTeamsTopTabId("directory")}
          hidden={resolvedActiveTopTab !== "directory"}
        >
          <TeamsDirectory
            teams={renderState === "ready" ? data?.teams ?? [] : []}
            currentPeriod={renderState === "ready" ? data?.currentPeriod ?? null : null}
            selectedTeamId={selectedTeamId}
            onSelectTeam={(teamId) => {
              if (isMockRuntime) {
                void setSelectedTeam(teamId);
              } else {
                setFeedSelectedTeamId(teamId);
              }
              setActiveTopTab("workspace");
              replaceHash("workspace");
            }}
            state={renderState}
          />
        </section>

        <section
          id="workspace"
          role="tabpanel"
          aria-labelledby={getTeamsTopTabId("workspace")}
          hidden={resolvedActiveTopTab !== "workspace"}
        >
          <TeamWorkspace
            team={renderState === "ready" ? selectedTeam : null}
            viewer={renderState === "ready" ? selectedViewer : null}
            currentPeriod={renderState === "ready" ? data?.currentPeriod ?? null : null}
            onUpdateTeam={handleTeamUpdate}
            onNavigateSection={(section) => replaceHash(section)}
            revenueCardKey={revenueCardKey}
            state={renderState}
            liveWrites={
              runtime?.backend === "feed" &&
              liveReadStatus === "current" &&
              runtimeQuery.writeFeed
                ? teamsWrites
                : undefined
            }
          />
        </section>

        {showAdminSection ? (
          <section
            id="admin"
            role="tabpanel"
            aria-labelledby={getTeamsTopTabId("admin")}
            hidden={resolvedActiveTopTab !== "admin"}
          >
            <AdminConsole
              admin={renderState === "ready" ? data?.admin ?? null : null}
              teams={renderState === "ready" ? data?.teams ?? [] : []}
              viewer={renderState === "ready" ? data?.viewer ?? null : null}
              currentPeriod={renderState === "ready" ? data?.currentPeriod ?? null : null}
              state={renderState}
            />
          </section>
        ) : null}
      </main>

      {isMockRuntime ? <MockControls /> : null}
    </div>
  );

  function handleTeamUpdate(nextTeam: TeamRecord) {
    if (isMockRuntime) {
      void replaceTeam(nextTeam);
    }
  }

  function handleTopTabChange(tabId: TeamsTopTab) {
    setActiveTopTab(tabId);
    replaceHash(tabId);
  }
}

function replaceHash(id: string) {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `#${id}`);
}

export function TeamsDataStatusNotice({
  isRefreshing = false,
  lastUpdatedAt,
  onRetry,
  readStatus,
  warningMessage,
}: {
  isRefreshing?: boolean;
  lastUpdatedAt?: number | null;
  onRetry?: () => void;
  readStatus: "current" | "stale" | "unavailable";
  warningMessage?: string | null;
}) {
  if (readStatus === "current") {
    return (
      <div
        className="flex min-w-0 flex-wrap items-center gap-2 rounded-box border border-border bg-surface px-4 py-3 text-sm text-text-secondary"
        role="status"
        aria-live="polite"
      >
        <Badge variant={isRefreshing ? "neutral" : "success"}>
          {isRefreshing
            ? teamsCopy.page.refreshing
            : teamsCopy.page.current}
        </Badge>
        {lastUpdatedAt !== null && lastUpdatedAt !== undefined ? (
          <span className="min-w-0 text-pretty break-words [overflow-wrap:anywhere]">
            {teamsCopy.page.lastUpdated}:{" "}
            <UtcTime
              className="font-number tabular-nums"
              timestamp={lastUpdatedAt}
            />
          </span>
        ) : null}
      </div>
    );
  }

  const isUnavailable = readStatus === "unavailable";
  return (
    <Card
      className={
        isUnavailable
          ? "border-red-300 bg-red-50 text-red-950"
          : "border-amber-300 bg-amber-50 text-amber-950"
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-balance font-bold">
            {isUnavailable
              ? teamsCopy.page.unavailableTitle
              : teamsCopy.page.staleTitle}
          </p>
          <p className="text-pretty text-sm leading-6">
            {isUnavailable
              ? teamsCopy.page.unavailableBody
              : teamsCopy.page.staleBody}
          </p>
          {lastUpdatedAt !== null && lastUpdatedAt !== undefined ? (
            <p className="min-w-0 break-words font-number text-xs tabular-nums [overflow-wrap:anywhere]">
              {teamsCopy.page.lastUpdated}:{" "}
              <UtcTime timestamp={lastUpdatedAt} />
            </p>
          ) : null}
          {warningMessage ? (
            <p className="min-w-0 text-pretty break-words font-number text-xs opacity-80 [overflow-wrap:anywhere]">
              {warningMessage}
            </p>
          ) : null}
        </div>
        {onRetry ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0"
            disabled={isRefreshing}
            aria-busy={isRefreshing || undefined}
            onClick={onRetry}
          >
            {isRefreshing
              ? teamsCopy.page.retrying
              : teamsCopy.page.retryCta}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
