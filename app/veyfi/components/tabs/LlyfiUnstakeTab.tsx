"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { useLlyfiStartCooldown, useLlyfiWithdraw } from "@/lib/hooks/useVeyfi";
import { parseAmount } from "@/lib/parse";
import { UnstakePanel } from "@/components/domain/UnstakePanel";

export function LlyfiUnstakeTab({ token }: { token: LlyfiTokenState }) {
  const { isConnected } = useAccount();
  const [input, setInput] = useState("");

  const { amount, isValid } = useMemo(() => parseAmount(input), [input]);
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

  const insufficient = isValid && amount > token.stakedBalance;

  const handleStart = async (amt: bigint) => {
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
        tokenSymbol={token.symbol}
        availableBalance={token.stakedBalance}
        totalExiting={totalExiting}
        liquidEstimate={liquidAssets}
        streamingEstimate={streamingEstimate}
        cooldown={token.cooldown}
        onStartCooldown={handleStart}
        onWithdraw={handleWithdraw}
        isSubmitting={isSubmitting}
        canWithdraw={isConnected && liquidAssets > 0n && !isSubmitting}
        canStart={
          isConnected &&
          isValid &&
          amount > 0n &&
          !insufficient &&
          !isSubmitting
        }
        amount={amount}
        isValid={isValid}
        insufficientBalance={!isSubmitting && insufficient}
        onAmountChange={setInput}
        inputValue={input}
      />
    </div>
  );
}
