"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  DebugControls,
  type DebugControlsSection,
} from "@/components/DebugControls";
import {
  resetMockTeamsStore,
  setMockTeamsNow,
} from "@/lib/clients/teams/mock";
import { nowSeconds } from "@/lib/mocks/time";
import {
  useTeamsDebugActions,
  useTeamsScenarioCatalog,
  useTeamsState,
} from "@/lib/hooks/useTeams";
import { teamsCopy } from "../messages";

export function MockControls() {
  const runtimeQuery = useTeamsState();
  const scenarioCatalogQuery = useTeamsScenarioCatalog();
  const actions = useTeamsDebugActions();
  const runtime = runtimeQuery.data ?? null;
  const data = runtime?.data ?? null;
  const selectedTeamId = data?.selectedTeamId ?? null;
  const selectedTeam = data?.teams.find((team) => team.id === selectedTeamId) ?? null;

  const section: DebugControlsSection = {
    id: "teams",
    title: "Teams",
    content: (
      <div className="space-y-3">
        <ControlGroup label={teamsCopy.controls.scenarioLabel}>
          {(scenarioCatalogQuery.data ?? []).map((scenario) => (
            <Button
              key={scenario.id}
              size="sm"
              variant={runtime?.presetId === scenario.id ? "primary" : "secondary"}
              onClick={() => {
                void actions.applyPreset(scenario.id);
              }}
            >
              {teamsCopy.controls.scenarioNames[scenario.id]}
            </Button>
          ))}
        </ControlGroup>

        <ControlGroup label={teamsCopy.stats.viewerRole}>
          {(
            Object.entries(teamsCopy.viewerRoles) as [
              keyof typeof teamsCopy.viewerRoles,
              string,
            ][]
          ).map(([role, label]) => (
            <Button
              key={role}
              size="sm"
              variant={data?.viewer.role === role ? "primary" : "secondary"}
              onClick={() => {
                void actions.setViewerRole(role);
              }}
            >
              {label}
            </Button>
          ))}
        </ControlGroup>

        <ControlGroup label={teamsCopy.controls.surfaceLabel}>
          <Button
            size="sm"
            variant={!runtime?.isLoading && !runtime?.isEmpty ? "primary" : "secondary"}
            onClick={async () => {
              await actions.setLoading(false);
              await actions.setEmpty(false);
            }}
          >
            Live
          </Button>
          <Button
            size="sm"
            variant={runtime?.isLoading ? "primary" : "secondary"}
            onClick={async () => {
              await actions.setEmpty(false);
              await actions.setLoading(true);
            }}
          >
            Loading
          </Button>
          <Button
            size="sm"
            variant={runtime?.isEmpty ? "primary" : "secondary"}
            onClick={async () => {
              await actions.setLoading(false);
              await actions.setEmpty(true);
            }}
          >
            Empty
          </Button>
        </ControlGroup>

        <ControlGroup label={teamsCopy.workspace.title}>
          <Button
            size="sm"
            variant={selectedTeamId === null ? "primary" : "secondary"}
            onClick={() => {
              void actions.setSelectedTeam(null);
            }}
          >
            Directory only
          </Button>
          {(data?.teams ?? []).map((team) => (
            <Button
              key={team.id}
              size="sm"
              variant={selectedTeamId === team.id ? "primary" : "secondary"}
              onClick={() => {
                void actions.setSelectedTeam(team.id);
              }}
            >
              {team.name}
            </Button>
          ))}
        </ControlGroup>

        <ControlGroup label={teamsCopy.stats.currentPeriod}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void actions.setCurrentPeriod(Math.max(1, (data?.currentPeriod ?? 1) - 1));
            }}
          >
            -1
          </Button>
          <Button size="sm" variant="primary" disabled>
            #{data?.currentPeriod ?? "--"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              void actions.setCurrentPeriod((data?.currentPeriod ?? 1) + 1);
            }}
          >
            +1
          </Button>
        </ControlGroup>

        <ControlGroup label={teamsCopy.lifecycle.title}>
          <Button
            size="sm"
            variant={selectedTeam?.status === "active" ? "primary" : "secondary"}
            onClick={() => {
              void actions.setLifecycle("active");
            }}
            disabled={!selectedTeam}
          >
            Active
          </Button>
          <Button
            size="sm"
            variant={selectedTeam?.status === "retiring" ? "primary" : "secondary"}
            onClick={() => {
              void actions.setLifecycle("retiring");
            }}
            disabled={!selectedTeam}
          >
            Retiring
          </Button>
          <Button
            size="sm"
            variant={selectedTeam?.status === "retired" ? "primary" : "secondary"}
            onClick={() => {
              void actions.setLifecycle("retired");
            }}
            disabled={!selectedTeam}
          >
            Retired
          </Button>
        </ControlGroup>

        <ControlGroup label="Read only">
          <Button
            size="sm"
            variant={selectedTeam?.readOnlyReason === null ? "primary" : "secondary"}
            onClick={() => {
              void actions.setReadOnlyReason(null);
            }}
            disabled={!selectedTeam}
          >
            Editable
          </Button>
          <Button
            size="sm"
            variant={selectedTeam?.readOnlyReason === "retired" ? "primary" : "secondary"}
            onClick={() => {
              void actions.setReadOnlyReason("retired");
            }}
            disabled={!selectedTeam}
          >
            Retired
          </Button>
          <Button
            size="sm"
            variant={
              selectedTeam?.readOnlyReason === "successor-active"
                ? "primary"
                : "secondary"
            }
            onClick={() => {
              void actions.setReadOnlyReason("successor-active");
            }}
            disabled={!selectedTeam}
          >
            Successor
          </Button>
        </ControlGroup>

        <ControlGroup label={teamsCopy.revenue.title}>
          <Button
            size="sm"
            variant={selectedTeam?.revenueHistory.length ? "primary" : "secondary"}
            onClick={() => {
              void actions.setRevenueState("seeded");
            }}
            disabled={!selectedTeam}
          >
            Seeded
          </Button>
          <Button
            size="sm"
            variant={
              selectedTeam && selectedTeam.revenueHistory.length === 0
                ? "primary"
                : "secondary"
            }
            onClick={() => {
              void actions.setRevenueState("empty-history");
            }}
            disabled={!selectedTeam}
          >
            No history
          </Button>
          <Button
            size="sm"
            variant={
              selectedTeam && selectedTeam.revenueOptions.length === 0
                ? "primary"
                : "secondary"
            }
            onClick={() => {
              void actions.setRevenueState("no-options");
            }}
            disabled={!selectedTeam}
          >
            No tokens
          </Button>
        </ControlGroup>

        <ControlGroup label={teamsCopy.funding.title}>
          <Button
            size="sm"
            variant={
              selectedTeam?.fundingSummary.state === "late-liquid-available"
                ? "primary"
                : "secondary"
            }
            onClick={() => {
              void actions.setFundingState("claimable");
            }}
            disabled={!selectedTeam}
          >
            Claimable
          </Button>
          <Button
            size="sm"
            variant={
              selectedTeam?.fundingApprovals.some(
                (approval) => approval.status === "late-liquid"
              )
                ? "primary"
                : "secondary"
            }
            onClick={() => {
              void actions.setFundingState("late-liquid");
            }}
            disabled={!selectedTeam}
          >
            Late liquid
          </Button>
          <Button
            size="sm"
            variant={
              selectedTeam?.fundingSummary.state === "fully-used"
                ? "primary"
                : "secondary"
            }
            onClick={() => {
              void actions.setFundingState("fully-used");
            }}
            disabled={!selectedTeam}
          >
            Fully used
          </Button>
          <Button
            size="sm"
            variant={
              selectedTeam?.fundingApprovals.length === 0 ? "primary" : "secondary"
            }
            onClick={() => {
              void actions.setFundingState("none");
            }}
            disabled={!selectedTeam}
          >
            No approvals
          </Button>
        </ControlGroup>

        <ControlGroup label={teamsCopy.bonus.title}>
          <Button
            size="sm"
            variant={selectedTeam?.bonus.status === "claimable" ? "primary" : "secondary"}
            onClick={() => {
              void actions.setBonusState("claimable");
            }}
            disabled={!selectedTeam}
          >
            Claimable
          </Button>
          <Button
            size="sm"
            variant={
              selectedTeam?.bonus.status === "pending-finalization"
                ? "primary"
                : "secondary"
            }
            onClick={() => {
              void actions.setBonusState("pending-finalization");
            }}
            disabled={!selectedTeam}
          >
            Pending
          </Button>
          <Button
            size="sm"
            variant={selectedTeam?.bonus.status === "claimed" ? "primary" : "secondary"}
            onClick={() => {
              void actions.setBonusState("claimed");
            }}
            disabled={!selectedTeam}
          >
            Claimed
          </Button>
          <Button
            size="sm"
            variant={selectedTeam?.bonus.status === "none" ? "primary" : "secondary"}
            onClick={() => {
              void actions.setBonusState("none");
            }}
            disabled={!selectedTeam}
          >
            None
          </Button>
        </ControlGroup>

        <ControlGroup label={teamsCopy.admin.title}>
          <Button
            size="sm"
            variant={!data?.viewer.canUseAdmin ? "primary" : "secondary"}
            onClick={() => {
              void actions.setAdminVisible(false);
            }}
          >
            Hidden
          </Button>
          <Button
            size="sm"
            variant={data?.viewer.canUseAdmin ? "primary" : "secondary"}
            onClick={() => {
              void actions.setAdminVisible(true);
            }}
          >
            Visible
          </Button>
        </ControlGroup>
      </div>
    ),
    onReset() {
      resetMockTeamsStore();
    },
    onTimeTravel() {
      setMockTeamsNow(nowSeconds());
    },
  };

  return <DebugControls sections={[section]} />;
}

function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
