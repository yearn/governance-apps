// app/styfi/components/cards/stake/UnstakeTab.tsx

"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { Banner } from "@/components/ui/Banner";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatTokenAmount } from "@/lib/format";
import { parseAmount } from "@/lib/parse";
import {
  useStyfiAccount,
  useStyfiStartCooldown,
  useStyfiWithdraw,
} from "@/lib/hooks/useStyfi";
import { useEpochCountdown } from "@/lib/hooks/useEpochCountdown";
import { cn } from "@/lib/cn";
import { StyfiMode, modeLabel } from "../../types";
import { styfiCopy as copy } from "../../../messages";

type Props = {
  mode: StyfiMode;
};

export function UnstakeTab({ mode }: Props) {
  const { isConnected } = useAccount();
  const { data, isLoading } = useStyfiAccount();
  const { write: startCooldown, state: cooldownState } =
    useStyfiStartCooldown();
  const { write: withdraw, state: withdrawState } = useStyfiWithdraw();

  const [input, setInput] = useState<string>("");
  const [isAddingMore, setIsAddingMore] = useState(false);

  const { amount, isValid } = useMemo(() => parseAmount(input || "0"), [input]);

  const available =
    mode === "styfi"
      ? data?.styfiActive ?? 0n
      : data?.styfiX.sharesActive ?? 0n;

  const COOLDOWN_SECONDS = 14 * 24 * 60 * 60;
  const cooldown =
    mode === "styfi" ? data?.styfiCooldown : data?.styfiX.cooldown;
  const totalExiting =
    mode === "styfi"
      ? data?.styfiInCooldown ?? 0n
      : data?.styfiX.assetsInCooldown ?? 0n;

  // Unlocked funds (finished streaming but not withdrawn)
  const unlockedFromPrevious =
    mode === "styfi" ? data?.styfiUnlocked ?? 0n : data?.styfiX.assetsUnlocked;

  const impliedStart =
    cooldown?.endsAt !== undefined
      ? cooldown.endsAt - COOLDOWN_SECONDS
      : undefined;

  const { timeRemaining, progress } = useEpochCountdown(
    cooldown?.endsAt,
    impliedStart
  );

  const scaledProgress = Math.max(
    0,
    Math.min(10000, Math.floor(progress * 100))
  );

  const initialAmount = cooldown?.totalAmount ?? totalExiting;

  const unlockedFromStream =
    initialAmount > 0n ? (initialAmount * BigInt(scaledProgress)) / 10000n : 0n;

  const alreadyWithdrawn = initialAmount - totalExiting;
  const liquidFromStream =
    unlockedFromStream > alreadyWithdrawn
      ? unlockedFromStream - alreadyWithdrawn
      : 0n;

  const streaming =
    totalExiting > liquidFromStream ? totalExiting - liquidFromStream : 0n;

  const totalLiquid = (unlockedFromPrevious || 0n) + liquidFromStream;

  const insufficient = isValid && amount > available;
  const isCooldownSubmitting =
    cooldownState.status === "signing" ||
    cooldownState.status === "submitted" ||
    cooldownState.status === "mining";
  const isWithdrawSubmitting =
    withdrawState.status === "signing" ||
    withdrawState.status === "submitted" ||
    withdrawState.status === "mining";

  const disableStart =
    !isConnected ||
    !data ||
    data.isBlacklisted ||
    !isValid ||
    amount <= 0n ||
    insufficient ||
    isLoading ||
    isCooldownSubmitting;

  const disableWithdraw =
    !isConnected ||
    !data ||
    data.isBlacklisted ||
    totalLiquid <= 0n ||
    isWithdrawSubmitting;

  const showWarning = amount > 0n && streaming > 0n;

  // We show the Progress/Withdraw sections if there is an active cooldown OR unwithdrawn funds
  const hasActiveState = totalExiting > 0n || (unlockedFromPrevious || 0n) > 0n;

  // If we have an active state, we hide the input behind the ghost button unless explicitly clicked
  const showInput = !hasActiveState || isAddingMore;

  const onMax = () => setInput(formatTokenAmount(available));

  const handleStart = async () => {
    if (!isValid || amount <= 0n) return;
    await startCooldown(mode === "styfi" ? "stYFI" : "stYFIx", amount);
    setInput("");
    setIsAddingMore(false);
  };

  const handleWithdraw = async () => {
    await withdraw(mode === "styfi" ? "stYFI" : "stYFIx");
  };

  if (isLoading) {
    return (
      <p className="text-sm text-neutral-600">{copy.unstakeTab.loading}</p>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-neutral-600">{copy.unstakeTab.disconnected}</p>
    );
  }

  const formattedLiquid = formatTokenAmount(totalLiquid);
  const formattedStreaming = formatTokenAmount(streaming);
  const formattedTotal = formatTokenAmount(totalExiting);

  return (
    <div className="space-y-4">
      {data.isBlacklisted && (
        <Banner variant="error" title={copy.shared.blacklistedTitle}>
          {copy.shared.blacklistedBody}
        </Banner>
      )}

      {/* SECTION 1: Progress Bar (Status) */}
      {/* Only visible if we have active funds exiting */}
      {totalExiting > 0n && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-neutral-900">
              {copy.unstakeTab.progressTitle}
            </p>
            <p className="text-sm font-number font-semibold text-neutral-900">
              {formattedTotal} YFI
            </p>
          </div>
          <ProgressBar value={progress} variant="styfi" />
          <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
            <span>{copy.unstakeTab.availableLabel(formattedLiquid)}</span>
            <span>
              {copy.unstakeTab.streamingLabel(
                formattedStreaming,
                streaming > 0n ? timeRemaining : undefined
              )}
            </span>
          </div>
        </section>
      )}

      {/* SECTION 2: Withdraw Action */}
      {/* Always visible if we are in the unstake flow (active state), even if liquid is 0 */}
      {hasActiveState && (
        <section className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 transition-colors">
          <p className="text-sm text-neutral-600">
            {copy.unstakeTab.withdrawHelper}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p
              className={cn(
                "text-xl font-number font-bold",
                totalLiquid > 0n ? "text-neutral-900" : "text-neutral-400"
              )}
            >
              {formattedLiquid} YFI
            </p>
            <Button
              variant="primary"
              onClick={handleWithdraw}
              disabled={disableWithdraw}
              isLoading={isWithdrawSubmitting}
            >
              {copy.unstakeTab.withdrawCta}
            </Button>
          </div>
        </section>
      )}

      {/* SECTION 3: Start/Reset Cooldown (Progressive Disclosure) */}
      {showInput ? (
        <section
          className={cn(
            "space-y-3 animate-in fade-in slide-in-from-top-2",
            // Only add border/padding if we have content above it
            hasActiveState && "pt-4 border-t border-neutral-100"
          )}
        >
          {/* Header Row: Label Left, Cancel Right */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-600">
              {copy.unstakeTab.amountLabel}
            </p>

            {/* Cancel button only if we have an active state to return to */}
            {hasActiveState && (
              <button
                onClick={() => setIsAddingMore(false)}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900 underline decoration-neutral-300 underline-offset-4"
              >
                Cancel
              </button>
            )}
          </div>

          <AmountInput
            value={input}
            onChange={setInput}
            onMaxClick={onMax}
            // Standard placement: maxLabel uses default AmountInput logic (bottom right)
            maxLabel={copy.unstakeTab.availableBalance(
              formatTokenAmount(available),
              modeLabel(mode)
            )}
            tokenSymbol={mode === "styfi" ? "stYFI" : "stYFIx"}
            error={
              insufficient ? copy.unstakeTab.insufficientBalance : undefined
            }
            placeholder="0.00"
            disabled={isLoading || isCooldownSubmitting || data.isBlacklisted}
          />

          {showWarning && (
            <Banner variant="warning" title={copy.unstakeTab.warningTitle}>
              {copy.unstakeTab.warningBody}
            </Banner>
          )}

          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3 sm:justify-end">
            <p className="text-xs text-neutral-600 text-right max-w-[60%]">
              {copy.unstakeTab.helper}
            </p>
            <Button
              variant="secondary"
              onClick={handleStart}
              disabled={disableStart}
              isLoading={isCooldownSubmitting}
            >
              {copy.unstakeTab.startCta}
            </Button>
          </div>
        </section>
      ) : (
        /* Collapsed State (Ghost Button) */
        <div className="pt-4 border-t border-neutral-100">
          <Button
            variant="ghost"
            className="w-full border-dashed border-2 border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:text-neutral-900 hover:bg-neutral-50"
            onClick={() => setIsAddingMore(true)}
          >
            + Unstake more
          </Button>
        </div>
      )}
    </div>
  );
}
