"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { useLlyfiStake, veyfiKeys } from "@/lib/hooks/useVeyfi";
import { useTokenApprove } from "@/lib/hooks/useTokenApprove";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { formatTokenAmount } from "@/lib/format";
import { parseAmount } from "@/lib/parse";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { toast } from "@/components/ui/Toast";

export function LlyfiStakeTab({ token }: { token: LlyfiTokenState }) {
  const { isConnected, address } = useAccount();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  const { amount, isValid } = useMemo(() => parseAmount(input), [input]);
  const { write: stake, state: stakeState } = useLlyfiStake();
  const { write: approve, isLoading: approveLoading } = useTokenApprove();

  const { data: currentAllowance = 0n, refetch: refetchAllowance } =
    useTokenAllowance(token.address, token.depositorAddress);

  const needsApproval = isValid && amount > 0n && amount > currentAllowance;
  const insufficientBalance = isValid && amount > token.walletBalance;

  const isSubmitting =
    stakeState.status === "signing" || stakeState.status === "mining";

  const isDisabled =
    !isConnected ||
    !isValid ||
    amount <= 0n ||
    insufficientBalance ||
    isSubmitting ||
    approveLoading;

  const handleApprove = async () => {
    await approve(token.address, token.depositorAddress, amount, {
      invalidate: async () => {
        await refetchAllowance();
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
    });
  };

  const handleStake = async () => {
    await stake(token.symbol, amount);
    setInput("");
    toast.success(
      `Successfully staked ${formatTokenAmount(amount)} ${token.symbol}`
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
        onMaxClick={() => setInput(formatTokenAmount(token.walletBalance))}
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
