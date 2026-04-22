"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!selectedMemberId && data.roster.members[0]) {
      setSelectedMemberId(data.roster.members[0].address);
    }
  }, [data.roster.members, selectedMemberId]);

  useEffect(() => {
    if (!selectedProposalId && data.proposals.items[0]) {
      setSelectedProposalId(data.proposals.items[0].id);
    }
  }, [data.proposals.items, selectedProposalId]);

  useEffect(() => {
    if (
      selectedMemberId &&
      !data.roster.members.some(
        (member) => member.address.toLowerCase() === selectedMemberId.toLowerCase()
      )
    ) {
      setSelectedMemberId(data.roster.members[0]?.address ?? "");
    }
  }, [data.roster.members, selectedMemberId]);

  useEffect(() => {
    if (
      selectedProposalId &&
      !data.proposals.items.some((proposal) => proposal.id === selectedProposalId)
    ) {
      setSelectedProposalId(data.proposals.items[0]?.id ?? "");
    }
  }, [data.proposals.items, selectedProposalId]);

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

              <section className="space-y-2">
                <p className="font-bold uppercase tracking-wide text-text-tertiary">
                  Perspective
                </p>
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
              </section>

              <section className="space-y-2 border-t border-border pt-2">
                <p className="font-bold uppercase tracking-wide text-text-tertiary">
                  Coverage
                </p>
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
              </section>

              <section className="space-y-2 border-t border-border pt-2">
                <p className="font-bold uppercase tracking-wide text-text-tertiary">
                  Epoch
                </p>
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
              </section>

              <section className="space-y-2 border-t border-border pt-2">
                <p className="font-bold uppercase tracking-wide text-text-tertiary">
                  Member
                </p>
                <select
                  aria-label="Selected YBC member"
                  className={CONTROL_INPUT_CLASS_NAME}
                  value={selectedMemberId}
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
                      selectedMemberId
                        ? setMemberStatus(selectedMemberId, "active")
                        : undefined
                    }
                    disabled={!selectedMemberId}
                  >
                    Active
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedMemberId
                        ? setMemberStatus(selectedMemberId, "ramping")
                        : undefined
                    }
                    disabled={!selectedMemberId}
                  >
                    Ramping
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedMemberId
                        ? setMemberStatus(selectedMemberId, "pending-removal")
                        : undefined
                    }
                    disabled={!selectedMemberId}
                  >
                    Pending removal
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedMemberId
                        ? setMemberStatus(selectedMemberId, "removed")
                        : undefined
                    }
                    disabled={!selectedMemberId}
                  >
                    Removed
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedMemberId
                        ? setMemberMaturity(selectedMemberId, 2_500)
                        : undefined
                    }
                    disabled={!selectedMemberId}
                  >
                    25%
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedMemberId
                        ? setMemberMaturity(selectedMemberId, 5_000)
                        : undefined
                    }
                    disabled={!selectedMemberId}
                  >
                    50%
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedMemberId
                        ? setMemberMaturity(selectedMemberId, 10_000)
                        : undefined
                    }
                    disabled={!selectedMemberId}
                  >
                    100%
                  </Button>
                </div>
              </section>

              <section className="space-y-2 border-t border-border pt-2">
                <p className="font-bold uppercase tracking-wide text-text-tertiary">
                  Proposal
                </p>
                <select
                  aria-label="Selected YBC proposal"
                  className={CONTROL_INPUT_CLASS_NAME}
                  value={selectedProposalId}
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
                      selectedProposalId
                        ? setProposalPhase(selectedProposalId, "discussion")
                        : undefined
                    }
                    disabled={!selectedProposalId}
                  >
                    Discussion
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedProposalId
                        ? setProposalPhase(selectedProposalId, "voting")
                        : undefined
                    }
                    disabled={!selectedProposalId}
                  >
                    Voting
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedProposalId
                        ? setProposalPhase(selectedProposalId, "awaiting-execution")
                        : undefined
                    }
                    disabled={!selectedProposalId}
                  >
                    Awaiting
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedProposalId
                        ? setProposalPhase(selectedProposalId, "executed")
                        : undefined
                    }
                    disabled={!selectedProposalId}
                  >
                    Executed
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedProposalId
                        ? setProposalPhase(selectedProposalId, "expired")
                        : undefined
                    }
                    disabled={!selectedProposalId}
                  >
                    Expired
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedProposalId
                        ? setProposalPhase(selectedProposalId, "retracted")
                        : undefined
                    }
                    disabled={!selectedProposalId}
                  >
                    Retracted
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedProposalId
                        ? setProposalVoteState(selectedProposalId, "clear")
                        : undefined
                    }
                    disabled={!selectedProposalId}
                  >
                    Clear votes
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedProposalId
                        ? setProposalVoteState(selectedProposalId, "passing")
                        : undefined
                    }
                    disabled={!selectedProposalId}
                  >
                    Passing
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      selectedProposalId
                        ? setProposalVoteState(selectedProposalId, "failing")
                        : undefined
                    }
                    disabled={!selectedProposalId}
                  >
                    Failing
                  </Button>
                </div>
              </section>

              <section className="space-y-2 border-t border-border pt-2">
                <p className="font-bold uppercase tracking-wide text-text-tertiary">
                  Rewards
                </p>
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
              </section>

              <section className="space-y-2 border-t border-border pt-2">
                <p className="font-bold uppercase tracking-wide text-text-tertiary">
                  Admin
                </p>
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
              </section>
            </div>
          ),
        },
      ]}
    />
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
