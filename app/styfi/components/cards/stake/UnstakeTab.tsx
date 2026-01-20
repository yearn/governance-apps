"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { parseAmount } from "@/lib/parse";
import {
  useStyfiAccount,
  useStyfiStartCooldown,
  useStyfiWithdraw,
} from "@/lib/hooks/useStyfi";
import { UnstakePanel } from "@/components/domain/UnstakePanel";
import { StyfiAsset } from "../../types";
import { styfiCopy as copy } from "../../../messages";

type Props = {
  asset: StyfiAsset;
};

export function UnstakeTab({ asset }: Props) {
  const { isConnected } = useAccount();
  const { data, isLoading } = useStyfiAccount();
  const { write: startCooldown, state: cooldownState } =
    useStyfiStartCooldown();
  const { write: withdraw, state: withdrawState } = useStyfiWithdraw();

  const [input, setInput] = useState<string>("");
  const { amount, isValid } = useMemo(() => parseAmount(input || "0"), [input]);

  const available =
    (asset === "stYFI" ? data?.styfiActive : data?.styfiX.sharesActive) ?? 0n;

  // Use null fallback to satisfy CooldownState type
  const cooldown =
    (asset === "stYFI" ? data?.styfiCooldown : data?.styfiX.cooldown) ?? null;

  const totalExiting =
    (asset === "stYFI"
      ? data?.styfiInCooldown
      : data?.styfiX.assetsInCooldown) ?? 0n;

  // Contract truth for withdrawable amount
  const contractWithdrawable =
    (asset === "stYFI"
      ? data?.styfiWithdrawable
      : data?.styfiX.assetsWithdrawable) ?? 0n;

  // Derive streaming amount simply by subtraction, relying on contract truth for the liquid portion
  const streamingEstimate =
    totalExiting > contractWithdrawable
      ? totalExiting - contractWithdrawable
      : 0n;

  const insufficient = isValid && amount > available;
  const isSubmitting =
    cooldownState.status === "mining" ||
    cooldownState.status === "signing" ||
    withdrawState.status === "mining" ||
    withdrawState.status === "signing";

  const disableStart =
    !isConnected ||
    !data ||
    data.isBlacklisted ||
    !isValid ||
    amount <= 0n ||
    insufficient ||
    isLoading ||
    isSubmitting;

  const disableWithdraw =
    !isConnected ||
    !data ||
    data.isBlacklisted ||
    contractWithdrawable <= 0n ||
    isSubmitting;

  const handleStart = async (amt: bigint) => {
    if (!isValid || amt <= 0n) return;
    await startCooldown(asset, amt);
    setInput("");
  };

  const handleWithdraw = async () => {
    await withdraw(asset);
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

  return (
    <UnstakePanel
      variant="styfi"
      tokenSymbol={asset}
      availableBalance={available}
      totalExiting={totalExiting}
      liquidEstimate={contractWithdrawable}
      streamingEstimate={streamingEstimate}
      cooldown={cooldown}
      onStartCooldown={handleStart}
      onWithdraw={handleWithdraw}
      isSubmitting={isSubmitting}
      canWithdraw={!disableWithdraw}
      canStart={!disableStart}
      amount={amount}
      isValid={isValid}
      insufficientBalance={insufficient}
      onAmountChange={setInput}
      inputValue={input}
    />
  );
}
