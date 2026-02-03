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

export function LlyfiStakeTab({ token }: { token: LlyfiTokenState }) {
  const { isConnected, address } = useIdentity();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  const { amount, isValid } = useMemo(() => parseAmount(input), [input]);
  const scale = token.exchangeRate > 0n ? token.exchangeRate : 1n;
  const roundedAmount = isValid ? amount - (amount % scale) : 0n;
  const hasRemainder = isValid && amount > 0n && amount !== roundedAmount;
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
    !isConnected ||
    !isValid ||
    effectiveAmount <= 0n ||
    insufficientBalance ||
    isSubmitting ||
    approveLoading;

  const normalizeInput = () => {
    if (hasRemainder) {
      setInput(formatInputAmount(roundedAmount));
    }
  };

  const handleMaxClick = () => {
    const roundedMax = token.walletBalance - (token.walletBalance % scale);
    setInput(formatInputAmount(roundedMax));
  };

  const handleApprove = async () => {
    if (effectiveAmount <= 0n) return;
    normalizeInput();
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
    normalizeInput();
    const { data: freshAllowance = 0n } = await refetchAllowance();
    if (freshAllowance < effectiveAmount) {
      return;
    }
    await stake(token.symbol, effectiveAmount);
    setInput("");
    toast.success(
      `Successfully staked ${formatTokenAmount(effectiveAmount)} ${
        token.symbol
      }`
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
          token.symbol
        }`}
        onMaxClick={handleMaxClick}
        onBlur={normalizeInput}
        tokenSymbol={token.symbol}
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
              !isConnected ||
              !isValid ||
              amount <= 0n ||
              insufficientBalance ||
              approveLoading
            }
            isLoading={approveLoading}
          >
            Approve {token.symbol}
          </Button>
        ) : (
          <Button
            variant="veyfi"
            onClick={handleStake}
            disabled={isDisabled}
            isLoading={isSubmitting}
          >
            Stake {token.symbol}
          </Button>
        )}
      </div>
    </div>
  );
}
