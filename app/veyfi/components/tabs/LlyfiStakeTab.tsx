"use client";

import { useMemo, useState } from "react";
import { useIdentity } from "@/state/identity";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { useLlyfiStake, veyfiKeys } from "@/lib/hooks/useVeyfi";
import { useTokenApprove } from "@/lib/hooks/useTokenApprove";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { formatInputAmount, formatTokenAmount } from "@/lib/format";
import { parseAmount } from "@/lib/parse";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { toast } from "@/components/ui/Toast";
import { getLlyfiDisplaySymbol } from "@/lib/clients/veyfi/display";

export function LlyfiStakeTab({ token }: { token: LlyfiTokenState }) {
  const { canTransact, blacklistStatus, address } = useIdentity();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  const { amount, isValid } = useMemo(() => parseAmount(input), [input]);
  const displaySymbol = getLlyfiDisplaySymbol(token.symbol);
  const scale = token.exchangeRate > 0n ? token.exchangeRate : 1n;
  const roundedAmount = isValid ? amount - (amount % scale) : 0n;
  const effectiveAmount = isValid ? roundedAmount : 0n;
  const { write: stake, state: stakeState } = useLlyfiStake();
  const { write: approve, isLoading: approveLoading } = useTokenApprove();

  const { data: currentAllowance = 0n, refetch: refetchAllowance } =
    useTokenAllowance(token.address, token.depositorAddress);

  const needsApproval =
    isValid && effectiveAmount > 0n && effectiveAmount > currentAllowance;
  const insufficientBalance =
    isValid && effectiveAmount > token.walletBalance;

  const isSubmitting =
    stakeState.status === "signing" || stakeState.status === "mining";

  const isDisabled =
    !canTransact ||
    blacklistStatus === "blocked" ||
    !isValid ||
    effectiveAmount <= 0n ||
    insufficientBalance ||
    isSubmitting ||
    approveLoading;

  const handleMaxClick = () => {
    const roundedMax = token.walletBalance - (token.walletBalance % scale);
    setInput(formatInputAmount(roundedMax));
  };

  const handleApprove = async () => {
    if (effectiveAmount <= 0n) return;
    await approve(token.address, token.depositorAddress, effectiveAmount, {
      invalidate: async () => {
        await refetchAllowance();
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
    });
  };

  const handleStake = async () => {
    if (effectiveAmount <= 0n) return;
    const { data: freshAllowance = 0n } = await refetchAllowance();
    if (freshAllowance < effectiveAmount) {
      return;
    }
    await stake(token.symbol, effectiveAmount);
    setInput("");
    toast.success(
      `Successfully staked ${formatTokenAmount(effectiveAmount)} ${displaySymbol}`
    );
  };

  return (
    <div className="space-y-3 max-w-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">Amount to stake</p>
      </div>

      <AmountInput
        value={input}
        onChange={setInput}
        maxLabel={`Balance: ${formatTokenAmount(token.walletBalance)} ${
          displaySymbol
        }`}
        onMaxClick={handleMaxClick}
        tokenSymbol={displaySymbol}
        error={
          !isSubmitting && insufficientBalance
            ? "Insufficient balance"
            : undefined
        }
      />

      <div className="flex justify-end gap-3">
        {needsApproval ? (
          <Button
            variant="secondary"
            onClick={handleApprove}
            disabled={
              !canTransact ||
              blacklistStatus === "blocked" ||
              !isValid ||
              amount <= 0n ||
              insufficientBalance ||
              approveLoading
            }
            isLoading={approveLoading}
          >
            Approve {displaySymbol}
          </Button>
        ) : (
          <Button
            variant="veyfi"
            onClick={handleStake}
            disabled={isDisabled}
            isLoading={isSubmitting}
          >
            Stake {displaySymbol}
          </Button>
        )}
      </div>
      {blacklistStatus === "blocked" && (
        <p className="text-xs text-red-600">
          This address is restricted from making token transfers.
        </p>
      )}
    </div>
  );
}
