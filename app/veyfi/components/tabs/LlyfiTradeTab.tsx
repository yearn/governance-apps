"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
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
  const { isConnected, yfiBalance, isBlacklisted } = useIdentity();
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { data } = useVeyfiAccount();
  const [mode, setMode] = useState<"sell" | "buy">("sell");
  const [input, setInput] = useState("");

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

  let capExceeded = false;
  let inventoryExceeded = false;

  if (isSell) {
    if (yfiValue > remainingCapacityYfi) capExceeded = true;
    if (yfiValue > (data?.inventory.availableYfi ?? 0n))
      inventoryExceeded = true;
  } else {
    if (llyfiValue > token.redemption.inventory) inventoryExceeded = true;
  }

  const currentAllowance = isSell ? llyfiAllowance : yfiAllowance;
  const needsApproval = isValid && amount > 0n && amount > currentAllowance;

  const handleMaxProtocol = () => {
    let maxInput = 0n;
    if (isSell) {
      const availableYfi = data?.inventory.availableYfi ?? 0n;
      const limitYfi =
        remainingCapacityYfi < availableYfi
          ? remainingCapacityYfi
          : availableYfi;
      maxInput = limitYfi * exchangeRate;
    } else {
      maxInput = token.redemption.inventory / exchangeRate;
    }
    setInput(formatTokenAmount(maxInput));
  };

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
    redeemState.status === "mining" || mintState.status === "mining";
  const limitDecimals = token.symbol === "upYFI" ? 0 : 4;

  return (
    <div className="space-y-4 max-w-xl">
      <RadioGroup
        name={`trade-${token.symbol}`}
        value={mode}
        onChange={setMode}
        options={[
          { value: "sell", label: `Sell ${token.symbol}` },
          { value: "buy", label: `Buy ${token.symbol}` },
        ]}
        className="pb-2 border-b border-neutral-100"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
        <p className="text-neutral-600">{isSell ? "You sell" : "You buy"}</p>
        <div className="flex items-center gap-2 font-medium text-neutral-900">
          <span className="font-number">
            {formatTokenAmount(isValid ? amount : 0n)} {sourceSymbol}
          </span>
          <span className="text-lg text-neutral-400">&rarr;</span>
          <span className="font-number">
            {formatTokenAmount(netOutput)} {targetSymbol}
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleMaxProtocol}
          className="text-xs font-medium text-neutral-500 hover:text-disco-600 transition-colors"
        >
          {isSell ? "Protocol Limit: " : "Available to Buy: "}
          <span className="underline decoration-dotted">
            {isSell
              ? `${formatTokenAmount(
                  remainingCapacityYfi * exchangeRate,
                  18,
                  limitDecimals
                )} ${token.symbol}`
              : `${formatTokenAmount(
                  token.redemption.inventory,
                  18,
                  limitDecimals
                )} ${token.symbol}`}
          </span>
        </button>
      </div>

      <AmountInput
        value={input}
        onChange={setInput}
        tokenSymbol={sourceSymbol}
        maxLabel={`Wallet: ${formatTokenAmount(userBalance)}`}
        onMaxClick={() => setInput(formatTokenAmount(userBalance))}
        error={
          capExceeded
            ? "Exceeds redemption capacity"
            : inventoryExceeded
            ? "Exceeds protocol inventory"
            : undefined
        }
      />

      {isSell && isValid && amount > 0n && !capExceeded && (
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-md border border-neutral-100 text-xs text-neutral-600">
          <span>Exit Fee ({formatPercent(Number(feePercent) / 1e18)})</span>
          <span className="font-number">
            -{formatTokenAmount(feeAmountYfi)} YFI
          </span>
        </div>
      )}

      <div className="flex justify-end">
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
              capExceeded ||
              inventoryExceeded ||
              !isConnected ||
              isBlacklisted ||
              isSubmitting
            }
            isLoading={isSubmitting}
            onClick={() =>
              isSell ? redeem(token.symbol, amount) : mint(token.symbol, amount)
            }
          >
            {isSell ? `Sell ${token.symbol}` : `Buy ${token.symbol}`}
          </Button>
        )}
      </div>
    </div>
  );
}
