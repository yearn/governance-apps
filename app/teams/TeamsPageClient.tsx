"use client";

import {
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
} from "react";
import { Button, getButtonClassName } from "@/components/ui/Button";
import { StatsBar } from "@/components/ui/StatsBar";
import { UtcTime } from "@/components/ui/UtcTime";
import { cn } from "@/lib/cn";
import {
  deriveTeamsViewerForTeam,
  type TeamRecord,
} from "@/lib/clients/teams";
import { useTeamsDebugActions, useTeamsState } from "@/lib/hooks/useTeams";
import { useTeamsWrites } from "@/lib/hooks/useTeamsWrites";
import { AdminConsole } from "./components/AdminConsole";
import { MockControls } from "./components/MockControls";
import { TeamWorkspace } from "./components/TeamWorkspace";
import { TeamsDirectory } from "./components/TeamsDirectory";
import { teamsCopy } from "./messages";
import {
  createTeamsRouteHref,
  findTeamByRouteAddress,
  getCanonicalTeamsRouteHref,
  getTeamsTopSection,
  isTeamsAdminRouteRequest,
  parseTeamsRouteState,
  type TeamsRouteSection,
  type TeamsRouteState,
} from "./route-state";

const EMPTY_STATS_VALUE = "--";
const TEAMS_PAGE_TOP_ID = "teams-page-top";

export function TeamsPageClient() {
  const { replaceTeam, setSelectedTeam } = useTeamsDebugActions();
  const [routeState, setRouteState] = useState<TeamsRouteState>({
    section: "directory",
    teamAddress: null,
  });
  const [pendingScrollId, setPendingScrollId] =
    useState<TeamsRouteSection | null>(null);
  const navigateTo = useCallback(
    (
      nextRoute: TeamsRouteState,
      options: { replace?: boolean } = {}
    ) => {
      if (
        nextRoute.section === routeState.section &&
        nextRoute.teamAddress === routeState.teamAddress
      ) {
        return;
      }

      setRouteState(nextRoute);
      setPendingScrollId(nextRoute.section);
      if (typeof window === "undefined") return;

      const method = options.replace ? "replaceState" : "pushState";
      window.history[method](
        null,
        "",
        createTeamsRouteHref(window.location.href, nextRoute)
      );
    },
    [routeState]
  );
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
  const routeAuthorizationReady =
    data !== null &&
    !runtimeQuery.isPending &&
    !runtime?.isLoading;
  const selectedTeam = findTeamByRouteAddress(
    data?.teams ?? [],
    routeState.teamAddress
  );
  const selectedViewer =
    data && selectedTeam
      ? deriveTeamsViewerForTeam(
          data.viewer,
          selectedTeam,
          data.currentPeriod
        )
      : data?.viewer ?? null;
  const showAdminSection = Boolean(data?.viewer.canUseAdmin);
  const resolvedRouteSection =
    routeState.section === "admin" && !showAdminSection
      ? "directory"
      : routeState.section;
  const resolvedSurface = getTeamsTopSection(resolvedRouteSection);
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

    const applyLocation = () => {
      const nextRoute = parseTeamsRouteState(window.location.href, {
        canUseAdmin: showAdminSection,
        adminAuthorizationReady: routeAuthorizationReady,
      });
      const canonicalHref = getCanonicalTeamsRouteHref(
        window.location.href,
        nextRoute
      );
      if (
        canonicalHref &&
        (routeAuthorizationReady ||
          !isTeamsAdminRouteRequest(window.location.href))
      ) {
        window.history.replaceState(null, "", canonicalHref);
      }
      setRouteState(nextRoute);
      setPendingScrollId(nextRoute.section);
    };

    applyLocation();
    window.addEventListener("popstate", applyLocation);
    return () => {
      window.removeEventListener("popstate", applyLocation);
    };
  }, [routeAuthorizationReady, showAdminSection]);

  useEffect(() => {
    if (
      !routeState.teamAddress ||
      renderState === "loading" ||
      (renderState === "ready" && selectedTeam)
    ) {
      return;
    }

    navigateTo(
      {
        section: "directory",
        teamAddress: null,
      },
      { replace: true }
    );
  }, [navigateTo, renderState, routeState.teamAddress, selectedTeam]);

  useEffect(() => {
    if (!pendingScrollId || renderState !== "ready") return;

    const topSection = getTeamsTopSection(pendingScrollId);
    if (topSection === "workspace" && !selectedTeam) {
      if (!routeState.teamAddress) {
        setPendingScrollId(null);
      }
      return;
    }
    if (topSection === "admin" && !showAdminSection) return;
    const scrollTargetId = getTeamsScrollTargetId(pendingScrollId);

    window.requestAnimationFrame(() => {
      const target = document.getElementById(scrollTargetId);
      if (typeof target?.scrollIntoView === "function") {
        target.scrollIntoView({ block: "start" });
        setPendingScrollId(null);
      }
    });
  }, [
    pendingScrollId,
    renderState,
    resolvedSurface,
    routeState.teamAddress,
    selectedTeam,
    showAdminSection,
  ]);

  const isWorkspaceSurface =
    resolvedSurface === "workspace" && selectedTeam !== null;
  const isAdminSurface = resolvedSurface === "admin";
  const heroTitle = isWorkspaceSurface
    ? selectedTeam.name
    : isAdminSurface
      ? teamsCopy.admin.title
      : teamsCopy.page.title;
  const heroDescription = isWorkspaceSurface
    ? null
    : isAdminSurface
      ? teamsCopy.admin.description
      : teamsCopy.page.description;

  return (
    <div className="bg-app text-text-primary">
      <section
        id={TEAMS_PAGE_TOP_ID}
        className="scroll-mt-24 border-b border-border bg-surface"
      >
        <div
          className={cn(
            "container mx-auto px-4 md:px-6",
            isWorkspaceSurface ? "py-7 md:py-8" : "py-10 md:py-12"
          )}
        >
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-4">
              <TeamsBreadcrumb
                currentLabel={
                  isWorkspaceSurface
                    ? selectedTeam.id
                    : isAdminSurface
                      ? teamsCopy.navigation.admin.toLowerCase()
                      : null
                }
                onNavigateRoot={navigateToDirectory}
              />
              <h1
                className={cn(
                  "text-balance font-bold",
                  isWorkspaceSurface
                    ? "text-3xl md:text-4xl"
                    : "text-3xl md:text-5xl"
                )}
              >
                {heroTitle}
              </h1>
              {heroDescription ? (
                <p className="max-w-2xl text-pretty text-base leading-7 text-text-secondary">
                  {heroDescription}
                </p>
              ) : null}
            </div>
            {showAdminSection && !isAdminSurface ? (
              <a
                href="/teams?section=admin"
                className={getButtonClassName({
                  variant: "secondary",
                  size: "sm",
                  className: "shrink-0",
                })}
                onClick={(event) => {
                  if (!shouldHandleInternalNavigation(event)) return;
                  event.preventDefault();
                  navigateTo({
                    section: "admin",
                    teamAddress: null,
                  });
                }}
              >
                {teamsCopy.navigation.admin}
              </a>
            ) : null}
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

        {resolvedSurface === "directory" ? (
          <section id="directory">
          <TeamsDirectory
            teams={renderState === "ready" ? data?.teams ?? [] : []}
            currentPeriod={renderState === "ready" ? data?.currentPeriod ?? null : null}
            onSelectTeam={(teamId) => {
              const team = data?.teams.find((entry) => entry.id === teamId);
              if (!team) return;
              if (isMockRuntime) {
                void setSelectedTeam(teamId);
              }
              navigateTo({
                section: "overview",
                teamAddress: team.address,
              });
            }}
            state={renderState}
          />
          </section>
        ) : null}

        {resolvedSurface === "workspace" ? (
          <section id="workspace" className="min-w-0 overflow-x-hidden">
          <TeamWorkspace
            team={renderState === "ready" ? selectedTeam : null}
            viewer={renderState === "ready" ? selectedViewer : null}
            currentPeriod={renderState === "ready" ? data?.currentPeriod ?? null : null}
            onUpdateTeam={handleTeamUpdate}
            onNavigateSection={(section) =>
              navigateTo({
                section,
                teamAddress: routeState.teamAddress,
              })
            }
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
        ) : null}

        {showAdminSection && resolvedSurface === "admin" ? (
          <section id="admin">
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

  function navigateToDirectory() {
    navigateTo({
      section: "directory",
      teamAddress: null,
    });
  }
}

function TeamsBreadcrumb({
  currentLabel,
  onNavigateRoot,
}: {
  currentLabel: string | null;
  onNavigateRoot: () => void;
}) {
  if (!currentLabel) return null;

  return (
    <nav aria-label="Teams hierarchy">
      <ol className="flex min-h-10 min-w-0 items-center gap-1.5 font-number text-sm font-medium">
        <li className="min-w-0">
          <a
            href="/teams"
            className="inline-flex min-h-10 items-center rounded-md px-2 text-text-secondary transition-[background-color,color] duration-150 ease-out hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
            onClick={(event) => {
              if (!shouldHandleInternalNavigation(event)) return;
              event.preventDefault();
              onNavigateRoot();
            }}
          >
            {teamsCopy.app.routeKey}
          </a>
        </li>
        <li aria-hidden="true" className="select-none text-text-tertiary">
          /
        </li>
        <li
          className="min-w-0 truncate px-1 text-text-secondary lowercase"
          aria-current="page"
          title={currentLabel}
        >
          {currentLabel}
        </li>
      </ol>
    </nav>
  );
}

export function shouldHandleInternalNavigation(
  event: Pick<
    MouseEvent<HTMLAnchorElement>,
    "altKey" | "button" | "ctrlKey" | "metaKey" | "shiftKey"
  >
) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function getTeamsScrollTargetId(section: TeamsRouteSection) {
  return section === "directory" ||
    section === "overview" ||
    section === "admin"
    ? TEAMS_PAGE_TOP_ID
    : section;
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
        className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary"
        role="status"
        aria-live="polite"
      >
        {isRefreshing ? <span>{teamsCopy.page.refreshing}</span> : null}
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
    <div
      className={
        isUnavailable
          ? "flex min-w-0 flex-col gap-3 rounded-box border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950 sm:flex-row sm:items-start sm:justify-between"
          : "flex min-w-0 flex-col gap-3 rounded-box border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between"
      }
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0 space-y-1">
        {isUnavailable ? (
          <p className="text-balance font-bold">
            {teamsCopy.page.unavailableTitle}
          </p>
        ) : null}
        {isUnavailable ? (
          <p className="text-pretty text-sm leading-6">
            {teamsCopy.page.unavailableBody}
          </p>
        ) : null}
        {!isUnavailable && warningMessage ? (
          <p className="min-w-0 text-pretty break-words [overflow-wrap:anywhere]">
            {warningMessage}
          </p>
        ) : null}
        {lastUpdatedAt !== null && lastUpdatedAt !== undefined ? (
          <p className="min-w-0 break-words font-number text-xs tabular-nums [overflow-wrap:anywhere]">
            {teamsCopy.page.lastUpdated}:{" "}
            <UtcTime timestamp={lastUpdatedAt} />
          </p>
        ) : null}
        {isUnavailable && warningMessage ? (
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
  );
}
