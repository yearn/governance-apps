// components/domain/UnstakePanel.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Banner } from "@/components/ui/Banner";
import { formatTokenAmount } from "@/lib/format";
import { cn } from "@/lib/cn";
import { CooldownState } from "@/lib/clients/shared/types";
import { useEpochCountdown } from "@/lib/hooks/useEpochCountdown";
import { STREAM_DURATION } from "@/lib/constants";

interface UnstakePanelProps {
  // Balances
  availableBalance: bigint; // For starting new cooldown
  totalExiting: bigint; // Total currently in cooldown stream
  liquidEstimate: bigint; // unlocked/claimable
  streamingEstimate: bigint; // still locked

  // Configuration
  tokenSymbol: string;
  cooldown: CooldownState;
  variant?: "styfi" | "veyfi";

  // Actions
  onStartCooldown: (amount: bigint) => Promise<void>;
  onWithdraw: () => Promise<void>;

  // State
  isSubmitting: boolean;
  canWithdraw: boolean;
  canStart: boolean;

  // Validation
  amount: bigint;
  isValid: boolean;
  insufficientBalance: boolean;
  onAmountChange: (val: string) => void;
  inputValue: string;
}

export function UnstakePanel({
  availableBalance,
  totalExiting,
  liquidEstimate,
  streamingEstimate,
  tokenSymbol,
  cooldown,
  variant = "styfi",
  onStartCooldown,
  onWithdraw,
  isSubmitting,
  canWithdraw,
  canStart,
  amount,
  isValid,
  insufficientBalance,
  onAmountChange,
  inputValue,
}: UnstakePanelProps) {
  const [isAddingMore, setIsAddingMore] = useState(false);

  // Cooldown Timer Logic
  const impliedStart = cooldown?.endsAt
    ? cooldown.endsAt - STREAM_DURATION
    : undefined;
  const { timeRemaining, progress } = useEpochCountdown(
    cooldown?.endsAt,
    impliedStart
  );

  const hasActiveState = totalExiting > 0n;
  const showInput = !hasActiveState || isAddingMore;

  const formattedLiquid = formatTokenAmount(liquidEstimate);
  const formattedStreaming = formatTokenAmount(streamingEstimate);
  const formattedTotal = formatTokenAmount(totalExiting);

  const handleStart = async () => {
    await onStartCooldown(amount);
    setIsAddingMore(false);
  };

  return (
    <div className="space-y-4">
      {/* SECTION 1: Progress (Only visible if funds are exiting) */}
      {hasActiveState && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-neutral-900">
              Cooldown Status
            </p>
            <p className="text-sm font-number font-semibold text-neutral-900">
              {formattedTotal} {tokenSymbol}
            </p>
          </div>
          <ProgressBar value={progress} variant={variant} />
          <div className="flex items-center justify-between text-xs font-medium text-neutral-600">
            <span>{formattedLiquid} Available</span>
            <span>
              {formattedStreaming} Streaming ({timeRemaining})
            </span>
          </div>
        </section>
      )}

      {/* SECTION 2: Withdraw Action (Visible if in active state) */}
      {hasActiveState && (
        <section className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4 transition-colors">
          <p className="text-sm text-neutral-600">Available to withdraw</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p
              className={cn(
                "text-xl font-number font-bold",
                liquidEstimate > 0n ? "text-neutral-900" : "text-neutral-400"
              )}
            >
              {formattedLiquid} {tokenSymbol}
            </p>
            <Button
              variant={variant === "styfi" ? "primary" : "veyfi"}
              onClick={onWithdraw}
              disabled={!canWithdraw || isSubmitting}
              isLoading={isSubmitting}
            >
              Withdraw
            </Button>
          </div>
        </section>
      )}

      {/* SECTION 3: Start/Reset Cooldown (Progressive Disclosure) */}
      {showInput ? (
        <section
          className={cn(
            "space-y-3 animate-in fade-in slide-in-from-top-2",
            hasActiveState && "pt-4 border-t border-neutral-100"
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-neutral-600">Start new cooldown</p>
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
            value={inputValue}
            onChange={onAmountChange}
            maxLabel={`Available: ${formatTokenAmount(availableBalance)}`}
            onMaxClick={() =>
              onAmountChange(formatTokenAmount(availableBalance))
            }
            tokenSymbol={tokenSymbol}
            error={
              insufficientBalance ? "Exceeds available balance" : undefined
            }
          />

          {hasActiveState && (
            <Banner variant="warning" title="Timer Reset">
              Adding to the cooldown will reset the 14-day timer for the
              remaining stream.
            </Banner>
          )}

          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={handleStart}
              disabled={!canStart || isSubmitting}
              isLoading={isSubmitting}
            >
              Start Cooldown
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
