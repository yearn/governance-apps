"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Address } from "viem";
import { cn } from "@/lib/cn";
import { formatAddress } from "@/lib/format";
import {
  applyMockTeamsFundingClaim,
  applyMockTeamsFundingReturn,
  formatTeamsAmount,
  formatTeamsUsd,
  getTeamsFundingReturnableRaw,
  isTeamsFundingApprovalClaimable,
  isTeamsFundingApprovalReturnable,
  multiplyTeamsDecimalsToFixed,
  parsePositiveTeamsTokenAmountRaw,
  resolveTeamsFundingUnitPriceDecimalUsd,
  type FundingApproval,
  type TeamRecord,
  type TeamsViewerContext,
} from "@/lib/clients/teams";
import { AmountInput } from "@/components/ui/AmountInput";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  AddressLink,
  TransactionLink,
} from "@/components/ui/ExplorerLink";
import { formatInputAmount, formatTokenAmount } from "@/lib/format";
import type { TxState } from "@/lib/tx/types";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { useTokenBalance } from "@/lib/hooks/useTokenBalance";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { UtcTime } from "@/components/ui/UtcTime";
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
  ) => Promise<boolean>;
  onReturnFunding?: (
    team: TeamRecord,
    approval: FundingApproval,
    amount: string
  ) => Promise<boolean>;
  onApproveFundingReturn?: (
    team: TeamRecord,
    approval: FundingApproval,
    amount: string
  ) => Promise<boolean>;
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
  onApproveFundingReturn,
  txState,
}: FundingApprovalsTableProps) {
  const claimableApprovals = useMemo(
    () =>
      team.fundingApprovals.filter((approval) =>
        isTeamsFundingApprovalClaimable(approval, currentPeriod)
      ),
    [currentPeriod, team.fundingApprovals]
  );
  const returnableApprovals = useMemo(
    () =>
      team.fundingApprovals.filter((approval) =>
        isTeamsFundingApprovalReturnable(approval, currentPeriod)
      ),
    [currentPeriod, team.fundingApprovals]
  );
  const expiredCount = team.fundingApprovals.filter(
    (approval) => approval.status === "expired"
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
    ? parsePositiveTeamsTokenAmountRaw(
        returnAmount,
        selectedReturnApproval.decimals
      )
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
  const returnNeedsApproval =
    liveReturnMode &&
    returnAmountRaw !== null &&
    !returnExceedsAvailableBalance &&
    (returnAllowance.data ?? 0n) < returnAmountRaw;
  const isTxPending = isTeamsTxPending(txState);
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
          level={2}
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
          level={2}
          title={teamsCopy.funding.title}
          description={teamsCopy.funding.description}
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <FundingMetric
            label={teamsCopy.funding.summary.claimableUsd}
            value={
              team.financialData.status === "available" &&
              team.fundingSummary.claimableUsd !== null
                ? formatTeamsUsd(team.fundingSummary.claimableUsd)
                : teamsCopy.financialData.unavailableValue
            }
          />
          <FundingMetric
            label={teamsCopy.funding.summary.refundableUsd}
            value={
              team.financialData.status === "available" &&
              team.fundingSummary.refundableUsd !== null
                ? formatTeamsUsd(team.fundingSummary.refundableUsd)
                : teamsCopy.financialData.unavailableValue
            }
          />
          <FundingMetric
            label={teamsCopy.funding.summary.state}
            value={teamsCopy.funding.summaryStates[team.fundingSummary.state]}
          />
          <FundingMetric
            label={teamsCopy.funding.summary.expiredCount}
            value={String(expiredCount)}
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
                {teamsCopy.funding.headers.unclaimed}
              </TableHead>
              <TableHead>{teamsCopy.funding.headers.flow}</TableHead>
              <TableHead className="text-right">{teamsCopy.funding.headers.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.fundingApprovals.map((approval) => {
              const status = teamsCopy.funding.statuses[approval.status];
              const canClaim = Boolean(viewer?.canClaimFunding) &&
                isTeamsFundingApprovalClaimable(approval, currentPeriod);
              const canReturn = Boolean(viewer?.canReturnFunding) &&
                isTeamsFundingApprovalReturnable(approval, currentPeriod);

              return (
                <TableRow key={approval.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-number text-sm font-bold text-text-primary">
                        {`Approval #${approval.idx}`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-number text-sm font-bold text-text-primary">
                        {approval.symbol}
                      </p>
                      <AddressLink
                        address={approval.tokenAddress}
                        variant="compact"
                      />
                    </div>
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
                    {approval.recipient ? (
                      <AddressLink
                        address={approval.recipient}
                        variant="compact"
                      />
                    ) : (
                      <span className="text-sm text-text-primary">
                        {teamsCopy.funding.recipientMissing}
                      </span>
                    )}
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
                        team.financialData.status === "available" &&
                        approval.claimedCostUsd !== null
                          ? formatTeamsUsd(approval.claimedCostUsd)
                          : null
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <AmountValue
                      primary={formatUnclaimedAllocation(approval)}
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
                          aria-label={`Use Approval #${approval.idx} in claim flow`}
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
                          aria-label={`Use Approval #${approval.idx} in return flow`}
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
                  onMaxClick={() =>
                    setClaimAmount(
                      formatInputAmount(
                        BigInt(selectedClaimApproval.claimableRaw),
                        selectedClaimApproval.decimals
                      )
                    )
                  }
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
                        {entry.txHash ? (
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <TransactionLink
                              hash={entry.txHash}
                              variant="compact"
                            />
                            {entry.logIndex !== undefined ? (
                              <span className="font-number text-xs text-text-secondary">
                                {teamsCopy.funding.history.logIndex(entry.logIndex)}
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-text-secondary">
                            {teamsCopy.funding.history.localRecord}
                          </p>
                        )}
                      </div>
                      <p className="font-number text-sm font-bold text-text-primary">
                        {team.financialData.status === "available" &&
                        entry.refundValueUsd !== null
                          ? formatTeamsUsd(entry.refundValueUsd)
                          : teamsCopy.financialData.unavailableValue}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-secondary">
                      <span>{formatApprovalAmount(entry.amount, entry.symbol)}</span>
                      <span>{teamsCopy.funding.history.period(entry.period)}</span>
                      <span>{teamsCopy.funding.history.approval(entry.approvalIdx)}</span>
                      <span>{teamsCopy.funding.history.returnedBy}:</span>
                      <AddressLink
                        address={entry.returnedBy}
                        variant="compact"
                      />
                      <UtcTime timestamp={entry.createdAt} format="date" />
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
      BigInt(selectedClaimApproval.claimableRaw),
      selectedClaimApproval.decimals,
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
      const submitted = await onClaimFunding(
        team,
        selectedClaimApproval,
        claimAmount,
        recipient
      );
      if (!submitted) return;
      setClaimFeedback({
        tone: "success",
        message: teamsCopy.funding.claimForm.success(
          formatTeamsAmount(claimAmount),
          selectedClaimApproval.symbol,
          selectedClaimApproval.idx,
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
        selectedClaimApproval.idx,
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
      getTeamsFundingReturnableRaw(selectedReturnApproval),
      selectedReturnApproval.decimals,
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
        if (!onApproveFundingReturn) {
          return;
        }
        const approved = await onApproveFundingReturn(
          team,
          selectedReturnApproval,
          returnAmount
        );
        if (!approved) return;
        await returnAllowance.refetch();
        return;
      }

      const submitted = await onReturnFunding(
        team,
        selectedReturnApproval,
        returnAmount
      );
      if (!submitted) return;
      await returnTokenBalance.refetch();
      setReturnFeedback({
        tone: "success",
        message: teamsCopy.funding.returnForm.success(
          formatTeamsAmount(returnAmount),
          selectedReturnApproval.symbol,
          selectedReturnApproval.idx,
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
        selectedReturnApproval.idx,
        formatReturnEstimate(selectedReturnApproval, returnAmount)
      ),
    });
    setReturnAmount("");
    setReturnAmountError(null);
  }
}

function FundingSectionHeader({
  level = 3,
  title,
  description,
}: {
  level?: 2 | 3;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      {level === 2 ? (
        <h2 className="text-xl font-bold text-text-primary">{title}</h2>
      ) : (
        <h3 className="text-xl font-bold text-text-primary">{title}</h3>
      )}
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
            {`Approval #${approval.idx}`}
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

function formatUnclaimedAllocation(approval: FundingApproval) {
  const amountRaw = BigInt(approval.amountRaw);
  const usedRaw = BigInt(approval.usedRaw);
  const unclaimedRaw = amountRaw > usedRaw ? amountRaw - usedRaw : 0n;
  return `${formatTokenAmount(unclaimedRaw, approval.decimals)} ${approval.symbol}`;
}

function getReturnMaxInputAmount(
  approval: FundingApproval,
  availableBalance: bigint | undefined
) {
  const decimals = approval.decimals;
  const returnableRaw = getReturnableAmountRaw(approval);
  if (
    availableBalance === undefined ||
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
    approval.decimals
  )} ${approval.symbol}`;
}

function getReturnableInputAmount(approval: FundingApproval) {
  const returnableRaw = getReturnableAmountRaw(approval);
  return formatInputAmount(returnableRaw, approval.decimals);
}

function getReturnableAmountRaw(approval: FundingApproval) {
  return getTeamsFundingReturnableRaw(approval);
}

function getApprovalScopeText(approval: FundingApproval, currentPeriod: number) {
  if (approval.status === "expired") {
    return teamsCopy.funding.periodScope.expired(approval.approvedPeriod);
  }

  if (approval.status === "scheduled") {
    return teamsCopy.funding.periodScope.future(approval.approvedPeriod);
  }

  if (approval.status === "current-unavailable") {
    return teamsCopy.funding.periodScope.currentUnavailable(
      approval.approvedPeriod
    );
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
  if (approval.status === "expired") {
    return teamsCopy.funding.flow.expired;
  }

  if (approval.status === "scheduled") {
    return teamsCopy.funding.flow.future;
  }

  if (approval.status === "current-unavailable") {
    return teamsCopy.funding.flow.currentUnavailable;
  }

  if (approval.status === "fully-used") {
    return teamsCopy.funding.flow.spent;
  }

  return approval.streamDurationDays > 0
    ? teamsCopy.funding.flow.vestingWindow(
        formatFundingDuration(approval.streamDurationDays)
      )
    : teamsCopy.funding.flow.immediate;
}

function getClaimHelperText(approval: FundingApproval, currentPeriod: number) {
  if (approval.status === "expired") {
    return teamsCopy.funding.claimForm.helpers.expired;
  }

  if (approval.status === "scheduled") {
    return teamsCopy.funding.claimForm.helpers.future;
  }

  if (approval.status === "current-unavailable") {
    return teamsCopy.funding.claimForm.helpers.currentUnavailable;
  }

  if (approval.status === "fully-used") {
    return teamsCopy.funding.claimForm.helpers.spent;
  }

  if (approval.approvedPeriod === currentPeriod) {
    return approval.streamDurationDays > 0
      ? teamsCopy.funding.claimForm.helpers.vestingWindow(
          formatFundingDuration(approval.streamDurationDays)
        )
      : teamsCopy.funding.claimForm.helpers.immediate;
  }

  return teamsCopy.funding.claimForm.helpers.expired;
}

function formatFundingDuration(durationDays: number) {
  const totalMinutes = durationDays * 24 * 60;
  if (totalMinutes < 1) {
    return "<1 minute";
  }

  const remainingMinutes = Math.max(
    1,
    Math.floor(totalMinutes + Number.EPSILON)
  );
  const days = Math.floor(remainingMinutes / (24 * 60));
  const hours = Math.floor((remainingMinutes % (24 * 60)) / 60);
  const minutes = remainingMinutes % 60;
  const parts = [
    formatDurationPart(days, "day"),
    formatDurationPart(hours, "hour"),
    formatDurationPart(minutes, "minute"),
  ].filter((part): part is string => part !== null);

  return parts.join(" ");
}

function formatDurationPart(value: number, unit: string) {
  if (value === 0) return null;
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

function validateAmount(
  rawAmount: string,
  maxAmountRaw: bigint,
  decimals: number,
  requiredMessage: string,
  invalidMessage: string,
  exceedsMessage: string
) {
  if (!rawAmount.trim()) {
    return requiredMessage;
  }

  const amount = parsePositiveTeamsTokenAmountRaw(rawAmount, decimals);
  if (amount === null) {
    return invalidMessage;
  }

  if (amount > maxAmountRaw) {
    return exceedsMessage;
  }

  return null;
}

function getAveragePriceLabel(approval: FundingApproval) {
  const resolvedUnitPriceUsd =
    resolveTeamsFundingUnitPriceDecimalUsd(approval);
  if (resolvedUnitPriceUsd === null) {
    return "Unavailable";
  }

  return formatTeamsUsd(resolvedUnitPriceUsd, 2);
}

function formatReturnEstimate(approval: FundingApproval, amount: string) {
  const averagePrice =
    resolveTeamsFundingUnitPriceDecimalUsd(approval);
  const estimate =
    averagePrice === null
      ? null
      : multiplyTeamsDecimalsToFixed(amount, averagePrice, 2);

  if (!estimate || estimate === "0" || estimate === "0.00") {
    return teamsCopy.financialData.unavailableValue;
  }

  return formatTeamsUsd(estimate, 2);
}

function isTeamsTxPending(state?: TxState) {
  return (
    state?.status === "signing" ||
    state?.status === "submitted" ||
    state?.status === "mining"
  );
}
