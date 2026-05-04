"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { DebugControls } from "@/components/DebugControls";
import { Button } from "@/components/ui/Button";
import { useYbcState } from "@/lib/hooks/useYbc";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});

const DAY_SECONDS = 86_400;
const CONTROL_INPUT_CLASS_NAME =
  "h-8 w-full rounded-box border border-border bg-app px-2 text-xs text-text-primary";

export function MockControls() {
  const {
    data,
    resetRuntime,
    runtime,
    seedPerspective,
    seedRewardsState,
    setEmptyBoard,
    setEmptyRoster,
    setEpoch,
    setHooksVisible,
    setLoading,
    setMemberMaturity,
    setMemberStatus,
    setOperatorAccess,
    setProposalPhase,
    setProposalVoteState,
    setThresholdProfile,
    syncToNow,
  } = useYbcState({ bootstrap: false, latencyMs: 0 });
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const resolvedSelectedMemberId = data.roster.members.some(
    (member) => member.address.toLowerCase() === selectedMemberId.toLowerCase()
  )
    ? selectedMemberId
    : data.roster.members[0]?.address ?? "";
  const resolvedSelectedProposalId = data.proposals.items.some(
    (proposal) => proposal.id === selectedProposalId
  )
    ? selectedProposalId
    : data.proposals.items[0]?.id ?? "";

  return (
    <DebugControls
      sections={[
        {
          id: "ybc",
          title: "YBC",
          onReset: () => {
            resetRuntime();
          },
          onTimeTravel: (days) => {
            syncToNow(data.asOf + days * DAY_SECONDS);
          },
          content: (
            <div className="space-y-3 text-xs">
              <div className="rounded-box border border-border bg-app px-3 py-2">
                <p className="font-bold text-text-primary">
                  {runtime.scenarioId} | epoch {data.epoch.current}
                </p>
                <p className="text-text-secondary">
                  As of {DATE_TIME_FORMATTER.format(data.asOf * 1000)} UTC
                </p>
              </div>

              <ControlGroup label="Perspective" defaultOpen>
                <div className="grid grid-cols-3 gap-2">
                  <ToggleButton
                    active={runtime.scenarioId === "observer"}
                    onClick={() => seedPerspective("observer")}
                  >
                    Observer
                  </ToggleButton>
                  <ToggleButton
                    active={
                      runtime.scenarioId === "member-matured" ||
                      runtime.scenarioId === "member-ramping"
                    }
                    onClick={() => seedPerspective("member")}
                  >
                    Member
                  </ToggleButton>
                  <ToggleButton
                    active={runtime.scenarioId === "operator-admin"}
                    onClick={() => seedPerspective("operator")}
                  >
                    Operator
                  </ToggleButton>
                </div>
              </ControlGroup>

              <ControlGroup label="Coverage" defaultOpen>
                <div className="grid grid-cols-3 gap-2">
                  <ToggleButton
                    active={runtime.loading}
                    onClick={() => setLoading(!runtime.loading)}
                  >
                    Loading
                  </ToggleButton>
                  <ToggleButton
                    active={runtime.emptyRoster}
                    onClick={() => setEmptyRoster(!runtime.emptyRoster)}
                  >
                    Empty roster
                  </ToggleButton>
                  <ToggleButton
                    active={runtime.emptyBoard}
                    onClick={() => setEmptyBoard(!runtime.emptyBoard)}
                  >
                    Empty board
                  </ToggleButton>
                </div>
              </ControlGroup>

              <ControlGroup label="Epoch">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEpoch(Math.max(1, data.epoch.current - 1))}
                  >
                    Epoch -1
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEpoch(data.epoch.current + 1)}
                  >
                    Epoch +1
                  </Button>
                </div>
              </ControlGroup>

              <ControlGroup label="Member">
                <select
                  aria-label="Selected YBC member"
                  className={CONTROL_INPUT_CLASS_NAME}
                  value={resolvedSelectedMemberId}
                  onChange={(event) => setSelectedMemberId(event.target.value)}
                >
                  {data.roster.members.map((member) => (
                    <option key={member.address} value={member.address}>
                      {member.ens ?? member.address}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedMemberId
                        ? setMemberStatus(resolvedSelectedMemberId, "active")
                        : undefined
                    }
                    disabled={!resolvedSelectedMemberId}
                  >
                    Active
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedMemberId
                        ? setMemberStatus(resolvedSelectedMemberId, "ramping")
                        : undefined
                    }
                    disabled={!resolvedSelectedMemberId}
                  >
                    Ramping
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedMemberId
                        ? setMemberStatus(resolvedSelectedMemberId, "pending-removal")
                        : undefined
                    }
                    disabled={!resolvedSelectedMemberId}
                  >
                    Pending removal
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedMemberId
                        ? setMemberStatus(resolvedSelectedMemberId, "removed")
                        : undefined
                    }
                    disabled={!resolvedSelectedMemberId}
                  >
                    Removed
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedMemberId
                        ? setMemberMaturity(resolvedSelectedMemberId, 2_500)
                        : undefined
                    }
                    disabled={!resolvedSelectedMemberId}
                  >
                    25%
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedMemberId
                        ? setMemberMaturity(resolvedSelectedMemberId, 5_000)
                        : undefined
                    }
                    disabled={!resolvedSelectedMemberId}
                  >
                    50%
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedMemberId
                        ? setMemberMaturity(resolvedSelectedMemberId, 10_000)
                        : undefined
                    }
                    disabled={!resolvedSelectedMemberId}
                  >
                    100%
                  </Button>
                </div>
              </ControlGroup>

              <ControlGroup label="Proposal">
                <select
                  aria-label="Selected YBC proposal"
                  className={CONTROL_INPUT_CLASS_NAME}
                  value={resolvedSelectedProposalId}
                  onChange={(event) => setSelectedProposalId(event.target.value)}
                >
                  {data.proposals.items.map((proposal) => (
                    <option key={proposal.id} value={proposal.id}>
                      {proposal.id}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedProposalId
                        ? setProposalPhase(resolvedSelectedProposalId, "discussion")
                        : undefined
                    }
                    disabled={!resolvedSelectedProposalId}
                  >
                    Discussion
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedProposalId
                        ? setProposalPhase(resolvedSelectedProposalId, "voting")
                        : undefined
                    }
                    disabled={!resolvedSelectedProposalId}
                  >
                    Voting
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedProposalId
                        ? setProposalPhase(
                            resolvedSelectedProposalId,
                            "awaiting-execution"
                          )
                        : undefined
                    }
                    disabled={!resolvedSelectedProposalId}
                  >
                    Awaiting
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedProposalId
                        ? setProposalPhase(resolvedSelectedProposalId, "executed")
                        : undefined
                    }
                    disabled={!resolvedSelectedProposalId}
                  >
                    Executed
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedProposalId
                        ? setProposalPhase(resolvedSelectedProposalId, "expired")
                        : undefined
                    }
                    disabled={!resolvedSelectedProposalId}
                  >
                    Expired
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedProposalId
                        ? setProposalPhase(resolvedSelectedProposalId, "retracted")
                        : undefined
                    }
                    disabled={!resolvedSelectedProposalId}
                  >
                    Retracted
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedProposalId
                        ? setProposalVoteState(resolvedSelectedProposalId, "clear")
                        : undefined
                    }
                    disabled={!resolvedSelectedProposalId}
                  >
                    Clear votes
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedProposalId
                        ? setProposalVoteState(resolvedSelectedProposalId, "passing")
                        : undefined
                    }
                    disabled={!resolvedSelectedProposalId}
                  >
                    Passing
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      resolvedSelectedProposalId
                        ? setProposalVoteState(resolvedSelectedProposalId, "failing")
                        : undefined
                    }
                    disabled={!resolvedSelectedProposalId}
                  >
                    Failing
                  </Button>
                </div>
              </ControlGroup>

              <ControlGroup label="Rewards">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => seedRewardsState("empty")}
                  >
                    Empty
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => seedRewardsState("member")}
                  >
                    Member
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => seedRewardsState("operator")}
                  >
                    Operator
                  </Button>
                </div>
              </ControlGroup>

              <ControlGroup label="Admin">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setOperatorAccess(false)}
                  >
                    Observer access
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setOperatorAccess(true)}
                  >
                    Operator access
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setHooksVisible(false)}
                  >
                    Hide hooks
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setHooksVisible(true)}
                  >
                    Show hooks
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setThresholdProfile("default")}
                  >
                    50% / 60%
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setThresholdProfile("strict")}
                  >
                    67% / 75%
                  </Button>
                </div>
              </ControlGroup>
            </div>
          ),
        },
      ]}
    />
  );
}

function ControlGroup({
  children,
  defaultOpen = false,
  label,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  label: string;
}) {
  return (
    <details
      className="rounded-box border border-border bg-surface px-3 py-2"
      open={defaultOpen}
    >
      <summary className="cursor-pointer font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </summary>
      <div className="mt-2 space-y-2">{children}</div>
    </details>
  );
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <Button size="sm" variant={active ? "primary" : "secondary"} onClick={onClick}>
      {children}
    </Button>
  );
}
