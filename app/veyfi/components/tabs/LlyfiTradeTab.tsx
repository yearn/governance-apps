"use client";

import { useMemo, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIdentity } from "@/state/identity";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import {
  useVeyfiAccount,
  useLlyfiRedeem,
  useLlyfiMint,
  veyfiKeys,
} from "@/lib/hooks/useVeyfi";
import { useTokenApprove } from "@/lib/hooks/useTokenApprove";
import { useTokenAllowance } from "@/lib/hooks/useTokenAllowance";
import { formatTokenAmount, formatPercent } from "@/lib/format";
import { parseAmount } from "@/lib/parse";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { YFI_ADDRESS, SPENDER_REDEMPTION } from "@/lib/constants";

export function LlyfiTradeTab({ token }: { token: LlyfiTokenState }) {
  const { isConnected, yfiBalance, isBlacklisted, address } = useIdentity();
  const queryClient = useQueryClient();
  const { data } = useVeyfiAccount();
  const [mode, setMode] = useState<"sell" | "buy">("sell");
  const [input, setInput] = useState("");

  // Clear input when switching modes
  useEffect(() => {
    setInput("");
  }, [mode]);

  const { amount, isValid } = useMemo(() => parseAmount(input), [input]);

  const { write: redeem, state: redeemState } = useLlyfiRedeem();
  const { write: mint, state: mintState } = useLlyfiMint();
  const { write: approve, isLoading: approveLoading } = useTokenApprove();

  const { data: yfiAllowance = 0n, refetch: refetchYfiAllowance } =
    useTokenAllowance(YFI_ADDRESS, SPENDER_REDEMPTION);

  const { data: llyfiAllowance = 0n, refetch: refetchLlyfiAllowance } =
    useTokenAllowance(token.address, SPENDER_REDEMPTION);

  const isSell = mode === "sell";
  const userBalance = isSell ? token.walletBalance : yfiBalance;
  const sourceSymbol = isSell ? token.symbol : "YFI";
  const targetSymbol = isSell ? "YFI" : token.symbol;

  const exchangeRate = token.exchangeRate;
  const ONE_E18 = 10n ** 18n;

  // Math & Constraints
  const yfiValue = isSell ? amount / exchangeRate : amount;
  const llyfiValue = isSell ? amount : amount * exchangeRate;

  const feePercent = token.redemption.fee;
  const feeAmountYfi = (yfiValue * feePercent) / ONE_E18;

  const netOutput = isSell
    ? yfiValue > feeAmountYfi
      ? yfiValue - feeAmountYfi
      : 0n
    : llyfiValue;

  const remainingCapacityYfi =
    token.redemption.capacity - token.redemption.used;

  // --- Logic for Constraints & Instructive Errors ---
  let capExceeded = false;
  let inventoryExceeded = false;
  let maxProtocolInput = 0n;

  if (isSell) {
    // Selling LLYFI. Constraints are on the YFI Output side.
    const availableGlobalYfi = data?.inventory.availableYfi ?? 0n;

    // The bottleneck is the tighter of (Capacity Remaining) or (Inventory Remaining)
    const limitYfi =
      remainingCapacityYfi < availableGlobalYfi
        ? remainingCapacityYfi
        : availableGlobalYfi;

    // Convert that YFI limit back to LLYFI input
    maxProtocolInput = limitYfi * exchangeRate;

    if (yfiValue > remainingCapacityYfi) capExceeded = true;
    if (yfiValue > availableGlobalYfi) inventoryExceeded = true;
  } else {
    // Buying LLYFI (Minting). Constraint is on the LLYFI Inventory.
    // Input is YFI.
    // Max LLYFI we can buy is token.redemption.inventory.
    // Max YFI we can input is inventory / exchangeRate.

    maxProtocolInput = token.redemption.inventory / exchangeRate;

    // Use llyfiValue calculated above
    if (llyfiValue > token.redemption.inventory) inventoryExceeded = true;
  }

  const currentAllowance = isSell ? llyfiAllowance : yfiAllowance;
  const needsApproval = isValid && amount > 0n && amount > currentAllowance;

  const handleApprove = async () => {
    const tokenAddress = isSell ? token.address : YFI_ADDRESS;
    await approve(tokenAddress, SPENDER_REDEMPTION, amount, {
      invalidate: async () => {
        if (isSell) {
          await refetchLlyfiAllowance();
        } else {
          await refetchYfiAllowance();
        }
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
    });
  };

  const isSubmitting =
    redeemState.status === "mining" ||
    mintState.status === "mining" ||
    redeemState.status === "success" ||
    mintState.status === "success";

  // Error logic with Instructive Messages
  let errorMsg = undefined;
  if (!isSubmitting) {
    if (capExceeded) {
      errorMsg = `Exceeds capacity (Max: ${formatTokenAmount(
        maxProtocolInput,
        18,
        2
      )} ${sourceSymbol})`;
    } else if (inventoryExceeded) {
      errorMsg = `Exceeds inventory (Max: ${formatTokenAmount(
        maxProtocolInput,
        18,
        2
      )} ${sourceSymbol})`;
    } else if (isValid && amount > userBalance) {
      errorMsg = "Insufficient balance";
    }
  }

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-neutral-100">
        <RadioGroup
          name={`trade-${token.symbol}`}
          value={mode}
          onChange={setMode}
          options={[
            { value: "sell", label: `Sell ${token.symbol}` },
            { value: "buy", label: `Buy ${token.symbol}` },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
        <p className="text-neutral-600">{isSell ? "You sell" : "You buy"}</p>
        <div className="flex items-center gap-2 font-medium text-neutral-600">
          <span className="">
            {formatTokenAmount(isValid ? amount : 0n)} {sourceSymbol}
          </span>
          <span className="text-lg text-neutral-400">&rarr;</span>
          <span className="">
            {formatTokenAmount(netOutput)} {targetSymbol}
          </span>
        </div>
      </div>

      <AmountInput
        value={input}
        onChange={setInput}
        tokenSymbol={sourceSymbol}
        maxLabel={`Balance: ${formatTokenAmount(userBalance)}`}
        onMaxClick={() => setInput(formatTokenAmount(userBalance))}
        error={errorMsg}
      />

      {isSell && isValid && amount > 0n && !capExceeded && (
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-md border border-neutral-200 text-xs text-neutral-600">
          <span>Exit Fee ({formatPercent(Number(feePercent) / 1e18)})</span>
          <span className="font-number font-medium">
            -{formatTokenAmount(feeAmountYfi)} YFI
          </span>
        </div>
      )}

      <div className="flex justify-end pt-2">
        {needsApproval ? (
          <Button
            variant="secondary"
            disabled={!isConnected || approveLoading}
            isLoading={approveLoading}
            onClick={handleApprove}
          >
            Approve {sourceSymbol}
          </Button>
        ) : (
          <Button
            variant="veyfi"
            disabled={
              !isValid ||
              amount <= 0n ||
              !!errorMsg ||
              !isConnected ||
              isBlacklisted ||
              isSubmitting
            }
            isLoading={isSubmitting}
            onClick={() => {
              if (isSell) {
                redeem(token.symbol, amount);
              } else {
                mint(token.symbol, amount);
              }
            }}
          >
            {isSell ? `Sell ${token.symbol}` : `Buy ${token.symbol}`}
          </Button>
        )}
      </div>
    </div>
  );
}
