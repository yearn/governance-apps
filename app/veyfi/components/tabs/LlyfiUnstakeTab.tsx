"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Banner } from "@/components/ui/Banner";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { useLlyfiStartCooldown, useLlyfiWithdraw } from "@/lib/hooks/useVeyfi";
import { useEpochCountdown } from "@/lib/hooks/useEpochCountdown";
import { formatTokenAmount } from "@/lib/format";
import { parseAmount } from "@/lib/parse";
import { cn } from "@/lib/cn";

export function LlyfiUnstakeTab({ token }: { token: LlyfiTokenState }) {
  const { isConnected } = useAccount();
  const [input, setInput] = useState("");
  const [isAddingMore, setIsAddingMore] = useState(false);

  const { amount, isValid } = useMemo(() => parseAmount(input), [input]);
  const { write: startCooldown, state: cooldownState } =
    useLlyfiStartCooldown();
  const { write: withdraw, state: withdrawState } = useLlyfiWithdraw();

  // Cooldown Logic
  const COOLDOWN_SECONDS = 14 * 24 * 60 * 60;
  const cooldown = token.cooldown;
  const totalExiting = token.cooldownBalance;

  const impliedStart = cooldown?.endsAt
    ? cooldown.endsAt - COOLDOWN_SECONDS
    : undefined;
  const { timeRemaining, progress } = useEpochCountdown(
    cooldown?.endsAt,
    impliedStart
  );

  // Linear Streaming Estimation for UI
  const scaledProgress = Math.max(
    0,
    Math.min(10000, Math.floor(progress * 100))
  );

  const liquidEstimate = (totalExiting * BigInt(scaledProgress)) / 10000n;

  const isSubmitting =
    cooldownState.status === "mining" ||
    cooldownState.status === "signing" ||
    withdrawState.status === "mining" ||
    withdrawState.status === "signing";

  const insufficient = isValid && amount > token.stakedBalance;
  const hasActiveState = totalExiting > 0n;
  const showInput = !hasActiveState || isAddingMore;

  const handleStart = async () => {
    await startCooldown(token.symbol, amount);
    setInput("");
    setIsAddingMore(false);
  };

  const handleWithdraw = async () => {
    await withdraw(token.symbol);
  };

  return (
    <div className="space-y-6 max-w-xl">
      {hasActiveState && (
        <section className="space-y-2">
          <div className="flex justify-between text-sm font-bold text-neutral-900">
            <span>Unstaking Progress</span>
            <span className="font-number">
              {formatTokenAmount(totalExiting)} {token.symbol}
            </span>
          </div>
          <ProgressBar value={progress} variant="veyfi" />
          <div className="flex justify-between text-xs font-medium text-neutral-600">
            <span>{formatTokenAmount(liquidEstimate)} Available</span>
            <span>{timeRemaining} remaining</span>
          </div>
        </section>
      )}

      {hasActiveState && (
        <section className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-600">Available to withdraw</p>
            <p className="text-xl font-bold font-number text-neutral-900">
              {formatTokenAmount(liquidEstimate)}{" "}
              <span className="text-sm font-normal text-neutral-500">
                {token.symbol}
              </span>
            </p>
          </div>
          <Button
            variant="veyfi"
            onClick={handleWithdraw}
            disabled={!isConnected || liquidEstimate === 0n || isSubmitting}
            isLoading={
              withdrawState.status === "mining" ||
              withdrawState.status === "signing"
            }
          >
            Withdraw
          </Button>
        </section>
      )}

      {showInput ? (
        <section
          className={cn(
            "space-y-4",
            hasActiveState && "pt-4 border-t border-neutral-100"
          )}
        >
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Start cooldown</span>
            {hasActiveState && (
              <button
                onClick={() => setIsAddingMore(false)}
                className="text-neutral-500 hover:text-neutral-900 underline"
              >
                Cancel
              </button>
            )}
          </div>

          <AmountInput
            value={input}
            onChange={setInput}
            maxLabel="Staked Balance"
            onMaxClick={() => setInput(formatTokenAmount(token.stakedBalance))}
            tokenSymbol={token.symbol}
            error={insufficient ? "Insufficient staked balance" : undefined}
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
              disabled={
                !isConnected ||
                !isValid ||
                amount <= 0n ||
                insufficient ||
                isSubmitting
              }
              isLoading={
                cooldownState.status === "mining" ||
                cooldownState.status === "signing"
              }
            >
              Start Cooldown
            </Button>
          </div>
        </section>
      ) : (
        <div className="pt-2">
          <Button
            variant="ghost"
            className="w-full border-dashed border-2"
            onClick={() => setIsAddingMore(true)}
          >
            + Unstake more
          </Button>
        </div>
      )}
    </div>
  );
}
