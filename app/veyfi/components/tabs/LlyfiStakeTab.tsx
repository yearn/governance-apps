"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { useLlyfiStake, veyfiKeys } from "@/lib/hooks/useVeyfi";
import { useTokenApprove } from "@/lib/hooks/useTokenApprove";
import { formatTokenAmount } from "@/lib/format";
import { parseAmount } from "@/lib/parse";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { SPENDER_LLYFI_STAKER } from "@/lib/constants";

export function LlyfiStakeTab({ token }: { token: LlyfiTokenState }) {
  const { isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  const { amount, isValid } = useMemo(() => parseAmount(input), [input]);
  const { write: stake, state: stakeState } = useLlyfiStake();
  const { write: approve, isLoading: approveLoading } = useTokenApprove();

  const needsApproval = isValid && amount > token.allowance;
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
    await approve(token.address, SPENDER_LLYFI_STAKER, amount, {
      invalidate: async () => {
        await queryClient.invalidateQueries({ queryKey: veyfiKeys.account() });
      },
    });
  };

  const handleStake = async () => {
    await stake(token.symbol, amount);
    setInput("");
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex justify-between text-sm">
        <span className="text-neutral-600">Stake {token.symbol}</span>
        <span className="font-bold text-neutral-900">
          {formatTokenAmount(token.walletBalance)} Available
        </span>
      </div>

      <AmountInput
        value={input}
        onChange={setInput}
        maxLabel="Max"
        onMaxClick={() => setInput(formatTokenAmount(token.walletBalance))}
        tokenSymbol={token.symbol}
        error={insufficientBalance ? "Insufficient balance" : undefined}
      />

      <div className="flex justify-end gap-3">
        {needsApproval ? (
          <Button
            variant="secondary"
            onClick={handleApprove}
            disabled={isDisabled}
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
