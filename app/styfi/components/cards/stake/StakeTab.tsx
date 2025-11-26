"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { formatTokenAmount } from "@/lib/format";
import { parseAmount } from "@/lib/parse";
import {
  useStyfiAccount,
  useStyfiStake,
} from "@/lib/hooks/useStyfi";
import { useTokenApprove } from "@/lib/hooks/useTokenApprove";
import { MOCK_YFI_ADDRESS, SPENDER_STYFI, SPENDER_STYFIX } from "@/lib/constants";
import { StyfiMode, modeLabel } from "../../types";
import { styfiCopy as copy } from "../../../messages";

type Props = {
  mode: StyfiMode;
};

export function StakeTab({ mode }: Props) {
  const { isConnected } = useAccount();
  const { data, isLoading } = useStyfiAccount();
  const { write: stake, state: stakeState } = useStyfiStake();
  const { write: approve, isLoading: approveLoading } = useTokenApprove();

  const [input, setInput] = useState<string>("");
  const { amount, isValid } = useMemo(
    () => parseAmount(input || "0"),
    [input]
  );

  const yfiBalance = data?.yfiBalance ?? 0n;
  const allowance =
    mode === "styfi"
      ? data?.allowances.yfiToStyfi ?? 0n
      : data?.allowances.yfiToStyfiX ?? 0n;
  const outputAmount = isValid ? amount : 0n;

  const needsApproval = isValid && amount > allowance;
  const insufficientBalance = isValid && amount > yfiBalance;
  const isSubmitting =
    stakeState.status === "signing" ||
    stakeState.status === "submitted" ||
    stakeState.status === "mining";

  const isDisabled =
    !isConnected ||
    !data ||
    data.isBlacklisted ||
    !isValid ||
    amount <= 0n ||
    insufficientBalance ||
    isLoading ||
    approveLoading ||
    isSubmitting;

  const onMax = () => {
    setInput(formatTokenAmount(yfiBalance));
  };

  const handleApprove = async () => {
    if (!isValid || amount <= 0n) return;
    const spender = mode === "styfi" ? SPENDER_STYFI : SPENDER_STYFIX;
    await approve(MOCK_YFI_ADDRESS, spender, amount);
  };

  const handleStake = async () => {
    if (!isValid || amount <= 0n) return;
    await stake(mode === "styfi" ? "stYFI" : "stYFIx", amount);
    setInput("");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-neutral-600">
          <span>{copy.stakeTab.amountLabel}</span>
          <div className="font-number text-neutral-500">
            {copy.stakeTab.balanceLabel(formatTokenAmount(yfiBalance))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
          <span className="font-number">{formatTokenAmount(outputAmount)} YFI</span>
          <span className="text-lg">→</span>
          <span className="font-number">
            {formatTokenAmount(outputAmount)} {modeLabel(mode)}
          </span>
        </div>
      </div>

      <AmountInput
        value={input}
        onChange={setInput}
        onMaxClick={onMax}
        maxLabel="Max"
        tokenSymbol="YFI"
        error={
          insufficientBalance ? copy.stakeTab.insufficientBalance : undefined
        }
        placeholder="0.00"
        disabled={isLoading || approveLoading || isSubmitting}
      />

      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-3 sm:justify-end">
        {needsApproval ? (
          <Button
            variant="secondary"
            onClick={handleApprove}
            disabled={
              !isConnected ||
              !data ||
              data.isBlacklisted ||
              !isValid ||
              amount <= 0n ||
              approveLoading
            }
            isLoading={approveLoading}
          >
            {copy.stakeTab.approve}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleStake}
            disabled={isDisabled}
            isLoading={isSubmitting}
          >
            {copy.stakeTab.stake(modeLabel(mode))}
          </Button>
        )}

        {data?.isBlacklisted && (
          <p className="text-xs text-red-600">
            {copy.shared.blacklistedBody}
          </p>
        )}
      </div>
    </div>
  );
}
