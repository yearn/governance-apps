"use client";

import { useMemo, useState } from "react";
import { useIdentity } from "@/state/identity";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { useLlyfiStartCooldown, useLlyfiWithdraw } from "@/lib/hooks/useVeyfi";
import { parseAmount } from "@/lib/parse";
import { formatInputAmount } from "@/lib/format";
import { UnstakePanel } from "@/components/domain/UnstakePanel";
import { getLlyfiDisplaySymbol } from "@/lib/clients/veyfi/display";

export function LlyfiUnstakeTab({ token }: { token: LlyfiTokenState }) {
  const { canTransact } = useIdentity();
  const [input, setInput] = useState("");

  const { amount, isValid } = useMemo(() => parseAmount(input), [input]);
  const displaySymbol = getLlyfiDisplaySymbol(token.symbol);
  const scale = token.exchangeRate > 0n ? token.exchangeRate : 1n;
  const roundedAmount = isValid ? amount - (amount % scale) : 0n;
  const effectiveAmount = isValid ? roundedAmount : 0n;
  const { write: startCooldown, state: cooldownState } =
    useLlyfiStartCooldown();
  const { write: withdraw, state: withdrawState } = useLlyfiWithdraw();

  // Contract truth
  const totalExiting = token.cooldownBalance;
  const liquidAssets = token.withdrawable;

  const streamingEstimate =
    totalExiting > liquidAssets ? totalExiting - liquidAssets : 0n;

  const isSubmitting =
    cooldownState.status === "mining" ||
    cooldownState.status === "signing" ||
    withdrawState.status === "mining" ||
    withdrawState.status === "signing";

  const insufficient = isValid && effectiveAmount > token.stakedBalance;

  const handleMaxClick = () => {
    const roundedMax = token.stakedBalance - (token.stakedBalance % scale);
    setInput(formatInputAmount(roundedMax));
  };

  const handleStart = async (amt: bigint) => {
    if (amt <= 0n) return;
    await startCooldown(token.symbol, amt);
    setInput("");
  };

  const handleWithdraw = async () => {
    await withdraw(token.symbol);
  };

  return (
    <div className="max-w-xl">
      <UnstakePanel
        variant="veyfi"
        tokenSymbol={displaySymbol}
        availableBalance={token.stakedBalance}
        totalExiting={totalExiting}
        liquidEstimate={liquidAssets}
        streamingEstimate={streamingEstimate}
        cooldown={token.cooldown}
        onStartCooldown={handleStart}
        onWithdraw={handleWithdraw}
        isSubmitting={isSubmitting}
        canWithdraw={canTransact && liquidAssets > 0n && !isSubmitting}
        canStart={
          canTransact &&
          isValid &&
          effectiveAmount > 0n &&
          !insufficient &&
          !isSubmitting
        }
        amount={effectiveAmount}
        isValid={isValid}
        insufficientBalance={!isSubmitting && insufficient}
        onAmountChange={setInput}
        onMaxClick={handleMaxClick}
        inputValue={input}
      />
    </div>
  );
}
