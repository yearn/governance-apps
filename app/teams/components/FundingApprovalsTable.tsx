"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { parseUnits, type Address } from "viem";
import { cn } from "@/lib/cn";
import { formatAddress } from "@/lib/format";
import {
  applyMockTeamsFundingClaim,
  applyMockTeamsFundingReturn,
  formatTeamsAmount,
  formatTeamsUsd,
  isTeamsFundingApprovalClaimable,
  isTeamsFundingApprovalReturnable,
  resolveTeamsFundingUnitPriceUsd,
  type FundingApproval,
  type TeamRecord,
  type TeamsViewerContext,
} from "@/lib/clients/teams";
import { AmountInput } from "@/components/ui/AmountInput";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatInputAmount, formatTokenAmount } from "@/lib/format";
import type { TxState } from "@/lib/tx/types";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenApprove } from "@/lib/hooks/useTokenApprove";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { teamsCopy } from "../messages";

type FundingApprovalsTableProps = {
  team: TeamRecord;
  viewer: TeamsViewerContext | null;
  currentPeriod: number;
  onUpdateTeam: (team: TeamRecord) => void;
  onClaimFunding?: (
    team: TeamRecord,
    approval: FundingApproval,
    amount: string,
    recipient: string
  ) => Promise<void>;
  onReturnFunding?: (
    team: TeamRecord,
    approval: FundingApproval,
    amount: string
  ) => Promise<void>;
  txState?: TxState;
};

type FormFeedback = {
  tone: "success" | "neutral" | "error";
  message: string;
} | null;

type ClaimErrors = {
  recipient: string | null;
  amount: string | null;
};

const EMPTY_CLAIM_ERRORS: ClaimErrors = {
  recipient: null,
  amount: null,
};

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function FundingApprovalsTable({
  team,
  viewer,
  currentPeriod,
  onUpdateTeam,
  onClaimFunding,
  onReturnFunding,
  txState,
}: FundingApprovalsTableProps) {
  const claimableApprovals = useMemo(
    () => team.fundingApprovals.filter(isTeamsFundingApprovalClaimable),
    [team.fundingApprovals]
  );
  const returnableApprovals = useMemo(
    () => team.fundingApprovals.filter(isTeamsFundingApprovalReturnable),
    [team.fundingApprovals]
  );
  const lateLiquidCount = team.fundingApprovals.filter(
    (approval) =>
      approval.status === "late-liquid" && Number(approval.claimable) > 0
  ).length;

  const [selectedClaimApprovalId, setSelectedClaimApprovalId] = useState<string | null>(
    claimableApprovals[0]?.id ?? null
  );
  const [selectedReturnApprovalId, setSelectedReturnApprovalId] = useState<string | null>(
    returnableApprovals[0]?.id ?? null
  );
  const [claimRecipient, setClaimRecipient] = useState<string>(viewer?.address ?? "");
  const [claimAmount, setClaimAmount] = useState("");
  const [returnAmount, setReturnAmount] = useState("");
  const [claimErrors, setClaimErrors] = useState<ClaimErrors>(EMPTY_CLAIM_ERRORS);
  const [returnAmountError, setReturnAmountError] = useState<string | null>(null);
  const [claimFeedback, setClaimFeedback] = useState<FormFeedback>(null);
  const [returnFeedback, setReturnFeedback] = useState<FormFeedback>(null);

  const selectedClaimApproval =
    team.fundingApprovals.find((approval) => approval.id === selectedClaimApprovalId) ?? null;
  const selectedReturnApproval =
    team.fundingApprovals.find((approval) => approval.id === selectedReturnApprovalId) ?? null;
  const liveClaimMode = Boolean(onClaimFunding);
  const liveReturnMode = Boolean(onReturnFunding);
  const returnAmountRaw = selectedReturnApproval
    ? tryParseTokenAmount(returnAmount, selectedReturnApproval.decimals ?? 18)
    : null;
  const returnTokenBalance = useTokenBalance(
    (selectedReturnApproval?.tokenAddress ?? ZERO_ADDRESS) as Address,
    viewer?.address as Address | null | undefined
  );
  const returnAvailableBalance = returnTokenBalance.data;
  const hasReturnAvailableBalance = returnAvailableBalance !== undefined;
  const returnExceedsAvailableBalance =
    liveReturnMode &&
    hasReturnAvailableBalance &&
    returnAmountRaw !== null &&
    returnAmountRaw > returnAvailableBalance;
  const returnAllowance = useTokenAllowance(
    (selectedReturnApproval?.tokenAddress ?? ZERO_ADDRESS) as Address,
    team.address as Address
  );
  const returnApproval = useTokenApprove();
  const returnNeedsApproval =
    liveReturnMode &&
    returnAmountRaw !== null &&
    !returnExceedsAvailableBalance &&
    (returnAllowance.data ?? 0n) < returnAmountRaw;
  const isTxPending = returnApproval.isLoading || isTeamsTxPending(txState);
  const previousClaimApprovalIdRef = useRef<string | null>(selectedClaimApprovalId);

  useEffect(() => {
    if (
      selectedClaimApprovalId &&
      claimableApprovals.some((approval) => approval.id === selectedClaimApprovalId)
    ) {
      return;
    }

    setSelectedClaimApprovalId(claimableApprovals[0]?.id ?? null);
  }, [claimableApprovals, selectedClaimApprovalId]);

  useEffect(() => {
    if (
      selectedReturnApprovalId &&
      returnableApprovals.some((approval) => approval.id === selectedReturnApprovalId)
    ) {
      return;
    }

    setSelectedReturnApprovalId(returnableApprovals[0]?.id ?? null);
  }, [returnableApprovals, selectedReturnApprovalId]);

  useEffect(() => {
    const approvalChanged = previousClaimApprovalIdRef.current !== selectedClaimApprovalId;
    previousClaimApprovalIdRef.current = selectedClaimApprovalId;

    setClaimRecipient(selectedClaimApproval?.recipient ?? viewer?.address ?? "");
    setClaimAmount("");
    setClaimErrors(EMPTY_CLAIM_ERRORS);

    if (approvalChanged) {
      setClaimFeedback(null);
    }
  }, [selectedClaimApprovalId, selectedClaimApproval?.recipient, viewer?.address]);

  useEffect(() => {
    setReturnAmount("");
    setReturnAmountError(null);
    setReturnFeedback(null);
  }, [selectedReturnApprovalId]);

  if (team.fundingApprovals.length === 0) {
    return (
      <Card className="space-y-4">
        <FundingSectionHeader
          title={teamsCopy.funding.emptyTitle}
          description={teamsCopy.funding.emptyBody}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <FundingSectionHeader
          title={teamsCopy.funding.title}
          description={teamsCopy.funding.description}
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FundingMetric
            label={teamsCopy.funding.summary.claimableUsd}
            value={formatTeamsUsd(team.fundingSummary.claimableUsd)}
          />
          <FundingMetric
            label={teamsCopy.funding.summary.refundableUsd}
            value={formatTeamsUsd(team.fundingSummary.refundableUsd)}
          />
          <FundingMetric
            label={teamsCopy.funding.summary.state}
            value={teamsCopy.funding.summaryStates[team.fundingSummary.state]}
          />
          <FundingMetric
            label={teamsCopy.funding.summary.lateLiquidCount}
            value={String(lateLiquidCount)}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{teamsCopy.funding.headers.approval}</TableHead>
              <TableHead>{teamsCopy.funding.headers.token}</TableHead>
              <TableHead>{teamsCopy.funding.headers.period}</TableHead>
              <TableHead>{teamsCopy.funding.headers.recipient}</TableHead>
              <TableHead className="text-right">
                {teamsCopy.funding.headers.totalApproved}
              </TableHead>
              <TableHead className="text-right">{teamsCopy.funding.headers.used}</TableHead>
              <TableHead className="text-right">
                {teamsCopy.funding.headers.claimable}
              </TableHead>
              <TableHead>{teamsCopy.funding.headers.flow}</TableHead>
              <TableHead className="text-right">{teamsCopy.funding.headers.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.fundingApprovals.map((approval) => {
              const status = teamsCopy.funding.statuses[approval.status];
              const canClaim = Boolean(viewer?.canClaimFunding) &&
                isTeamsFundingApprovalClaimable(approval);
              const canReturn = Boolean(viewer?.canReturnFunding) &&
                isTeamsFundingApprovalReturnable(approval);

              return (
                <TableRow key={approval.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-number text-sm font-bold text-text-primary">
                        #{approval.idx}
                      </p>
                      <p className="text-xs text-text-secondary">{approval.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-number text-sm font-bold text-text-primary">
                      {approval.symbol}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-number text-sm font-bold text-text-primary">
                        {`Period #${approval.approvedPeriod}`}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {getApprovalScopeText(approval, currentPeriod)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-text-primary">
                      {approval.recipient
                        ? formatAddress(approval.recipient)
                        : teamsCopy.funding.recipientMissing}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <AmountValue
                      primary={formatApprovalAmount(
                        approval.totalApproved,
                        approval.symbol
                      )}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <AmountValue
                      primary={formatApprovalAmount(approval.used, approval.symbol)}
                      secondary={
                        Number(approval.claimedCostUsd) > 0
                          ? formatTeamsUsd(approval.claimedCostUsd)
                          : null
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <AmountValue
                      primary={formatApprovalAmount(approval.claimable, approval.symbol)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <p className="text-xs text-text-secondary">
                        {getApprovalFlowText(approval)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-2">
                      {canClaim ? (
                        <Button
                          size="sm"
                          variant={
                            selectedClaimApprovalId === approval.id ? "primary" : "secondary"
                          }
                          onClick={() => setSelectedClaimApprovalId(approval.id)}
                          aria-label={`Use ${approval.id} in claim flow`}
                        >
                          {selectedClaimApprovalId === approval.id
                            ? teamsCopy.funding.actions.claimSelected
                            : teamsCopy.funding.actions.claim}
                        </Button>
                      ) : null}
                      {canReturn ? (
                        <Button
                          size="sm"
                          variant={
                            selectedReturnApprovalId === approval.id ? "primary" : "secondary"
                          }
                          onClick={() => setSelectedReturnApprovalId(approval.id)}
                          aria-label={`Use ${approval.id} in return flow`}
                        >
                          {selectedReturnApprovalId === approval.id
                            ? teamsCopy.funding.actions.returnSelected
                            : teamsCopy.funding.actions.return}
                        </Button>
                      ) : null}
                      {!canClaim && !canReturn ? (
                        <span className="text-xs text-text-tertiary">
                          {teamsCopy.funding.actions.none}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4">
          <FundingSectionHeader
            title={teamsCopy.funding.claimForm.title}
            description={teamsCopy.funding.claimForm.description}
          />

          {!viewer?.canClaimFunding ? (
            <DisabledAction
              body={teamsCopy.funding.claimForm.disabledPermission}
              cta={teamsCopy.funding.claimForm.disabledPermissionCta}
            />
          ) : !selectedClaimApproval ? (
            <DisabledAction
              body={teamsCopy.funding.claimForm.disabledNoApproval}
              cta={teamsCopy.funding.claimForm.disabledNoApprovalCta}
            />
          ) : (
            <>
              <SelectionSummary
                title={teamsCopy.funding.claimForm.selectedApproval}
                approval={selectedClaimApproval}
                currentPeriod={currentPeriod}
              />

              <div className="space-y-2">
                <label
                  htmlFor="teams-claim-recipient"
                  className="text-xs font-bold uppercase tracking-wide text-text-tertiary"
                >
                  {teamsCopy.funding.claimForm.recipient}
                </label>
                <input
                  id="teams-claim-recipient"
                  type="text"
                  value={claimRecipient}
                  onChange={(event) => {
                    setClaimRecipient(event.target.value);
                    setClaimErrors((current) => ({ ...current, recipient: null }));
                  }}
                  placeholder={teamsCopy.funding.claimForm.recipientPlaceholder}
                  className={cn(
                    "w-full rounded-box border bg-app px-4 py-3 text-sm text-text-primary outline-none transition-colors",
                    claimErrors.recipient
                      ? "border-red-500"
                      : "border-border focus:border-text-primary"
                  )}
                />
                <FieldError error={claimErrors.recipient} />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="teams-claim-amount"
                  className="text-xs font-bold uppercase tracking-wide text-text-tertiary"
                >
                  {teamsCopy.funding.claimForm.amount}
                </label>
                <AmountInput
                  id="teams-claim-amount"
                  value={claimAmount}
                  onChange={(value) => {
                    setClaimAmount(value);
                    setClaimErrors((current) => ({ ...current, amount: null }));
                  }}
                  tokenSymbol={selectedClaimApproval.symbol}
                  onMaxClick={() => setClaimAmount(selectedClaimApproval.claimable)}
                  maxLabel={`${teamsCopy.funding.claimForm.maxLabel}: ${formatApprovalAmount(selectedClaimApproval.claimable, selectedClaimApproval.symbol)}`}
                  error={claimErrors.amount ?? undefined}
                />
              </div>

              <MessageBox tone="neutral">
                {getClaimHelperText(selectedClaimApproval, currentPeriod)}
              </MessageBox>

              {claimFeedback ? (
                <MessageBox tone={claimFeedback.tone} role="status">
                  {claimFeedback.message}
                </MessageBox>
              ) : null}

              <Button
                onClick={() => {
                  void handleClaim();
                }}
                className="w-full"
                disabled={isTxPending}
                isLoading={isTxPending}
              >
                {teamsCopy.funding.claimForm.submit}
              </Button>
              {txState?.status === "error" && txState.errorMessage ? (
                <MessageBox tone="error" role="alert">
                  {txState.errorMessage}
                </MessageBox>
              ) : null}
            </>
          )}
        </Card>

        <Card className="space-y-4">
          <FundingSectionHeader
            title={teamsCopy.funding.returnForm.title}
            description={teamsCopy.funding.returnForm.description}
          />

          {!viewer?.canReturnFunding ? (
            <DisabledAction
              body={teamsCopy.funding.returnForm.disabledPermission}
              cta={teamsCopy.funding.returnForm.disabledPermissionCta}
            />
          ) : !selectedReturnApproval ? (
            <DisabledAction
              body={teamsCopy.funding.returnForm.disabledNoApproval}
              cta={teamsCopy.funding.returnForm.disabledNoApprovalCta}
            />
          ) : (
            <>
              <SelectionSummary
                title={teamsCopy.funding.returnForm.selectedApproval}
                approval={selectedReturnApproval}
                currentPeriod={currentPeriod}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <FundingMetric
                  label={teamsCopy.funding.returnForm.averagePrice}
                  value={getAveragePriceLabel(selectedReturnApproval)}
                />
                <FundingMetric
                  label={teamsCopy.funding.returnForm.estimate}
                  value={formatReturnEstimate(selectedReturnApproval, returnAmount)}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="teams-return-amount"
                  className="text-xs font-bold uppercase tracking-wide text-text-tertiary"
                >
                  {teamsCopy.funding.returnForm.amount}
                </label>
                <AmountInput
                  id="teams-return-amount"
                  value={returnAmount}
                  onChange={(value) => {
                    setReturnAmount(value);
                    setReturnAmountError(null);
                  }}
                  tokenSymbol={selectedReturnApproval.symbol}
                  onMaxClick={() =>
                    setReturnAmount(
                      getReturnMaxInputAmount(
                        selectedReturnApproval,
                        liveReturnMode ? returnAvailableBalance : undefined
                      )
                    )
                  }
                  maxLabel={getReturnMaxLabel(
                    selectedReturnApproval,
                    liveReturnMode ? returnAvailableBalance : undefined
                  )}
                  error={
                    returnAmountError ??
                    (returnExceedsAvailableBalance
                      ? teamsCopy.funding.returnForm.errors.amountExceedsBalance
                      : undefined)
                  }
                />
              </div>

              <MessageBox tone="neutral">{teamsCopy.funding.returnForm.note}</MessageBox>

              {returnFeedback ? (
                <MessageBox tone={returnFeedback.tone} role="status">
                  {returnFeedback.message}
                </MessageBox>
              ) : null}

              <Button
                onClick={() => {
                  void handleReturn();
                }}
                className="w-full"
                disabled={
                  isTxPending ||
                  returnExceedsAvailableBalance ||
                  (liveReturnMode && returnTokenBalance.isLoading)
                }
                isLoading={isTxPending}
              >
                {returnNeedsApproval
                  ? teamsCopy.funding.returnForm.approve
                  : teamsCopy.funding.returnForm.submit}
              </Button>
              {txState?.status === "error" && txState.errorMessage ? (
                <MessageBox tone="error" role="alert">
                  {txState.errorMessage}
                </MessageBox>
              ) : null}
            </>
          )}

          <div className="space-y-3 border-t border-border pt-4">
            <div>
              <h4 className="text-sm font-bold text-text-primary">
                {teamsCopy.funding.history.title}
              </h4>
            </div>

            {team.fundingReturns.length === 0 ? (
              <p className="text-sm text-text-secondary">{teamsCopy.funding.history.empty}</p>
            ) : (
              <div className="space-y-2">
                {team.fundingReturns.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-box border border-border bg-app px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
                          {teamsCopy.funding.history.record}
                        </p>
                        <p className="font-number text-sm font-bold break-all text-text-primary">
                          {entry.id}
                        </p>
                      </div>
                      <p className="font-number text-sm font-bold text-text-primary">
                        {formatTeamsUsd(entry.refundValueUsd)}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                      <span>{formatApprovalAmount(entry.amount, entry.symbol)}</span>
                      <span>{teamsCopy.funding.history.period(entry.period)}</span>
                      <span>{teamsCopy.funding.history.approval(entry.approvalId)}</span>
                      <span>
                        {teamsCopy.funding.history.returnedBy}: {formatAddress(entry.returnedBy)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  async function handleClaim() {
    setClaimFeedback(null);

    if (!selectedClaimApproval || !viewer?.canClaimFunding) {
      return;
    }

    const recipient = claimRecipient.trim();
    const nextErrors: ClaimErrors = {
      recipient: null,
      amount: null,
    };

    if (!recipient) {
      nextErrors.recipient = teamsCopy.funding.claimForm.errors.recipientRequired;
    } else if (!ADDRESS_PATTERN.test(recipient)) {
      nextErrors.recipient = teamsCopy.funding.claimForm.errors.recipientInvalid;
    }

    const amountError = validateAmount(
      claimAmount,
      selectedClaimApproval.claimable,
      selectedClaimApproval.decimals ?? 18,
      teamsCopy.funding.claimForm.errors.amountRequired,
      teamsCopy.funding.claimForm.errors.amountInvalid,
      teamsCopy.funding.claimForm.errors.amountExceeds
    );

    if (nextErrors.recipient || amountError) {
      setClaimErrors({
        recipient: nextErrors.recipient,
        amount: amountError,
      });
      return;
    }

    if (liveClaimMode && onClaimFunding) {
      await onClaimFunding(team, selectedClaimApproval, claimAmount, recipient);
      setClaimFeedback({
        tone: "success",
        message: teamsCopy.funding.claimForm.success(
          formatTeamsAmount(claimAmount),
          selectedClaimApproval.symbol,
          selectedClaimApproval.id,
          formatAddress(recipient)
        ),
      });
      setClaimAmount("");
      setClaimErrors(EMPTY_CLAIM_ERRORS);
      return;
    }

    const nextTeam = applyMockTeamsFundingClaim(
      team,
      {
        approvalId: selectedClaimApproval.id,
        amount: claimAmount,
        recipient,
      },
      currentPeriod
    );

    onUpdateTeam(nextTeam);
    setClaimFeedback({
      tone: "success",
      message: teamsCopy.funding.claimForm.success(
        formatTeamsAmount(claimAmount),
        selectedClaimApproval.symbol,
        selectedClaimApproval.id,
        formatAddress(recipient)
      ),
    });
    setClaimAmount("");
    setClaimErrors(EMPTY_CLAIM_ERRORS);
  }

  async function handleReturn() {
    setReturnFeedback(null);

    if (!selectedReturnApproval || !viewer?.canReturnFunding || !viewer.address) {
      return;
    }

    const amountError = validateAmount(
      returnAmount,
      getReturnableInputAmount(selectedReturnApproval),
      selectedReturnApproval.decimals ?? 18,
      teamsCopy.funding.returnForm.errors.amountRequired,
      teamsCopy.funding.returnForm.errors.amountInvalid,
      teamsCopy.funding.returnForm.errors.amountExceeds
    );

    if (amountError || returnAmountRaw === null) {
      setReturnAmountError(amountError);
      return;
    }

    if (returnExceedsAvailableBalance) {
      setReturnAmountError(teamsCopy.funding.returnForm.errors.amountExceedsBalance);
      return;
    }

    if (liveReturnMode && onReturnFunding) {
      if (returnNeedsApproval) {
        await returnApproval.write(
          selectedReturnApproval.tokenAddress as Address,
          team.address as Address,
          returnAmountRaw,
          {
            invalidate: async () => {
              await returnAllowance.refetch();
            },
          }
        );
        return;
      }

      await onReturnFunding(team, selectedReturnApproval, returnAmount);
      await returnTokenBalance.refetch();
      setReturnFeedback({
        tone: "success",
        message: teamsCopy.funding.returnForm.success(
          formatTeamsAmount(returnAmount),
          selectedReturnApproval.symbol,
          selectedReturnApproval.id,
          formatReturnEstimate(selectedReturnApproval, returnAmount)
        ),
      });
      setReturnAmount("");
      setReturnAmountError(null);
      return;
    }

    const nextTeam = applyMockTeamsFundingReturn(team, {
      approvalId: selectedReturnApproval.id,
      amount: returnAmount,
      returnedBy: viewer.address,
      currentPeriod,
    });

    onUpdateTeam(nextTeam);
    setReturnFeedback({
      tone: "success",
      message: teamsCopy.funding.returnForm.success(
        formatTeamsAmount(returnAmount),
        selectedReturnApproval.symbol,
        selectedReturnApproval.id,
        formatReturnEstimate(selectedReturnApproval, returnAmount)
      ),
    });
    setReturnAmount("");
    setReturnAmountError(null);
  }
}

function FundingSectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-xl font-bold text-text-primary">{title}</h3>
      <p className="text-sm leading-6 text-text-secondary">{description}</p>
    </div>
  );
}

function FundingMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-box border border-border bg-app px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
        {label}
      </p>
      <p className="mt-1 font-number text-base font-bold text-text-primary">{value}</p>
    </div>
  );
}

function DisabledAction({ body, cta }: { body: string; cta: string }) {
  const descriptionId = useId();

  return (
    <div className="space-y-3">
      <div id={descriptionId}>
        <MessageBox tone="neutral">{body}</MessageBox>
      </div>
      <Button disabled className="w-full" aria-describedby={descriptionId}>
        {cta}
      </Button>
    </div>
  );
}

function SelectionSummary({
  title,
  approval,
  currentPeriod,
}: {
  title: string;
  approval: FundingApproval;
  currentPeriod: number;
}) {
  const status = teamsCopy.funding.statuses[approval.status];

  return (
    <div className="rounded-box border border-border bg-app px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
            {title}
          </p>
          <p className="font-number text-base font-bold text-text-primary">
            #{approval.idx} • {approval.id}
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FundingMetric
          label={teamsCopy.funding.headers.period}
          value={getApprovalScopeText(approval, currentPeriod)}
        />
        <FundingMetric
          label={teamsCopy.funding.headers.claimable}
          value={formatApprovalAmount(approval.claimable, approval.symbol)}
        />
      </div>
    </div>
  );
}

function AmountValue({
  primary,
  secondary,
}: {
  primary: string;
  secondary?: string | null;
}) {
  return (
    <div className="space-y-1">
      <p className="font-number text-sm font-bold text-text-primary">{primary}</p>
      {secondary ? <p className="text-xs text-text-secondary">{secondary}</p> : null}
    </div>
  );
}

function MessageBox({
  children,
  tone,
  role,
}: {
  children: string;
  tone: "success" | "neutral" | "error";
  role?: "status" | "alert";
}) {
  return (
    <div
      role={role}
      className={cn(
        "rounded-box border px-4 py-3 text-sm",
        tone === "success"
          ? "border-green-200 bg-green-50 text-green-900"
          : tone === "error"
            ? "border-red-200 bg-red-50 text-red-900"
          : "border-border bg-app text-text-secondary"
      )}
    >
      {children}
    </div>
  );
}

function FieldError({ error }: { error: string | null }) {
  if (!error) {
    return <div className="min-h-[1.25rem]" />;
  }

  return (
    <p className="min-h-[1.25rem] text-xs font-medium text-red-500" role="alert">
      {error}
    </p>
  );
}

function formatApprovalAmount(amount: string, symbol: string) {
  return `${formatTeamsAmount(amount)} ${symbol}`;
}

function getReturnMaxInputAmount(
  approval: FundingApproval,
  availableBalance: bigint | undefined
) {
  const decimals = approval.decimals ?? 18;
  const returnableRaw = getReturnableAmountRaw(approval);
  if (
    availableBalance === undefined ||
    returnableRaw === null ||
    availableBalance >= returnableRaw
  ) {
    return getReturnableInputAmount(approval);
  }

  return formatInputAmount(availableBalance, decimals);
}

function getReturnMaxLabel(
  approval: FundingApproval,
  availableBalance: bigint | undefined
) {
  if (availableBalance === undefined) {
    return `${teamsCopy.funding.returnForm.maxLabel}: ${formatApprovalAmount(
      getReturnableInputAmount(approval),
      approval.symbol
    )}`;
  }

  return `${teamsCopy.funding.returnForm.balanceLabel}: ${formatTokenAmount(
    availableBalance,
    approval.decimals ?? 18
  )} ${approval.symbol}`;
}

function getReturnableInputAmount(approval: FundingApproval) {
  const returnableRaw = getReturnableAmountRaw(approval);
  return returnableRaw === null
    ? "0"
    : formatInputAmount(returnableRaw, approval.decimals ?? 18);
}

function getReturnableAmountRaw(approval: FundingApproval) {
  const decimals = approval.decimals ?? 18;
  const usedRaw = tryParseTokenAmount(approval.used, decimals);
  const refundableRaw = getRefundableAmountRaw(approval);

  if (usedRaw === null || refundableRaw === null) {
    return null;
  }

  return usedRaw < refundableRaw ? usedRaw : refundableRaw;
}

function getRefundableAmountRaw(approval: FundingApproval) {
  const unitPriceUsd = resolveTeamsFundingUnitPriceUsd(approval);
  const refundableUsd = Number(approval.refundValueUsd);

  if (
    unitPriceUsd === null ||
    unitPriceUsd <= 0 ||
    !Number.isFinite(refundableUsd) ||
    refundableUsd <= 0
  ) {
    return null;
  }

  const decimals = approval.decimals ?? 18;
  const precision = Math.min(decimals, 12);
  const factor = 10 ** precision;
  const amount = Math.floor((refundableUsd / unitPriceUsd) * factor) / factor;

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return tryParseTokenAmount(
    amount.toFixed(precision).replace(/\.?0+$/, "") || "0",
    decimals
  );
}

function getApprovalScopeText(approval: FundingApproval, currentPeriod: number) {
  if (approval.status === "late-liquid") {
    return teamsCopy.funding.periodScope.lateLiquid(approval.approvedPeriod);
  }

  if (approval.status === "not-current-period") {
    return teamsCopy.funding.periodScope.future(approval.approvedPeriod);
  }

  if (approval.status === "fully-used") {
    return teamsCopy.funding.periodScope.spent(approval.approvedPeriod);
  }

  if (approval.approvedPeriod === currentPeriod) {
    return teamsCopy.funding.periodScope.currentPeriod(approval.approvedPeriod);
  }

  return teamsCopy.funding.periodScope.currentPeriod(approval.approvedPeriod);
}

function getApprovalFlowText(approval: FundingApproval) {
  if (approval.status === "late-liquid") {
    return teamsCopy.funding.flow.lateLiquid;
  }

  if (approval.status === "not-current-period") {
    return teamsCopy.funding.flow.future;
  }

  if (approval.status === "fully-used") {
    return teamsCopy.funding.flow.spent;
  }

  return teamsCopy.funding.flow.streamBacked(approval.streamDurationDays);
}

function getClaimHelperText(approval: FundingApproval, currentPeriod: number) {
  if (approval.status === "late-liquid") {
    return teamsCopy.funding.claimForm.helpers.lateLiquid;
  }

  if (approval.status === "not-current-period") {
    return teamsCopy.funding.claimForm.helpers.future;
  }

  if (approval.status === "fully-used") {
    return teamsCopy.funding.claimForm.helpers.spent;
  }

  if (approval.approvedPeriod === currentPeriod) {
    return teamsCopy.funding.claimForm.helpers.streamBacked(approval.streamDurationDays);
  }

  return teamsCopy.funding.claimForm.helpers.streamBacked(approval.streamDurationDays);
}

function validateAmount(
  rawAmount: string,
  maxAmount: string,
  decimals: number,
  requiredMessage: string,
  invalidMessage: string,
  exceedsMessage: string
) {
  if (!rawAmount.trim()) {
    return requiredMessage;
  }

  const amount = tryParseTokenAmount(rawAmount, decimals);
  if (amount === null) {
    return invalidMessage;
  }

  const max = tryParseTokenAmount(maxAmount, decimals);
  if (max !== null && amount > max) {
    return exceedsMessage;
  }

  return null;
}

function getAveragePriceLabel(approval: FundingApproval) {
  const resolvedUnitPriceUsd = resolveTeamsFundingUnitPriceUsd(approval);
  if (resolvedUnitPriceUsd === null) {
    return "Unavailable";
  }

  return formatTeamsUsd(resolvedUnitPriceUsd.toFixed(2), 2);
}

function formatReturnEstimate(approval: FundingApproval, amount: string) {
  const numericAmount = Number(amount);
  const averagePrice = resolveTeamsFundingUnitPriceUsd(approval);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0 ||
    averagePrice === null ||
    averagePrice <= 0
  ) {
    return formatTeamsUsd("0.00", 2);
  }

  return formatTeamsUsd((numericAmount * averagePrice).toFixed(2), 2);
}

function tryParseTokenAmount(value: string, decimals: number) {
  try {
    const amount = parseUnits(value, decimals);
    return amount > 0n ? amount : null;
  } catch {
    return null;
  }
}

function isTeamsTxPending(state?: TxState) {
  return (
    state?.status === "signing" ||
    state?.status === "submitted" ||
    state?.status === "mining"
  );
}
