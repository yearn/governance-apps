"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { Banner } from "@/components/ui/Banner";
import { useRedemptionCaps, useLlyfiRedeem } from "@/lib/hooks/useVeyfi";
import { useWalletYfiBalance } from "@/lib/hooks/useWalletYfiBalance";
import { formatTokenAmount, formatPercent } from "@/lib/format";
import { parseAmount } from "@/lib/parse";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { veyfiCopy as copy } from "../../messages";

export function LlyfiTradeTab({ token }: { token: LlyfiTokenState }) {
  const { isConnected } = useAccount();
  const [mode, setMode] = useState<"redeem" | "mint">("redeem");
  const [input, setInput] = useState("");

  const { amount, isValid } = useMemo(() => parseAmount(input), [input]);
  const { balance: yfiBalance } = useWalletYfiBalance();
  const caps = useRedemptionCaps();
  const { write: redeem, state: redeemState } = useLlyfiRedeem();

  const isRedeem = mode === "redeem";
  const balance = isRedeem ? token.walletBalance : yfiBalance;
  const symbol = isRedeem ? token.symbol : "YFI";

  // Cap Logic
  const tokenCap = caps?.perToken.find((t) => t.symbol === token.symbol);
  const globalRemaining = caps ? caps.globalLimit - caps.globalUsed : 0n;
  const tokenRemaining = tokenCap ? tokenCap.limit - tokenCap.used : 0n;
  const effectiveRemaining =
    globalRemaining < tokenRemaining ? globalRemaining : tokenRemaining;

  const capExceeded = isRedeem && amount > effectiveRemaining;
  const insufficientBalance = isValid && amount > balance;

  const feeBps = caps?.feeBps ?? 0;
  const feeAmount = (amount * BigInt(feeBps)) / 10000n;
  const netAmount = amount - feeAmount;

  const isSubmitting =
    redeemState.status === "signing" || redeemState.status === "mining";
  const isDisabled =
    !isConnected ||
    !isValid ||
    amount <= 0n ||
    insufficientBalance ||
    (isRedeem && capExceeded) ||
    isSubmitting;

  const handleAction = async () => {
    if (isRedeem) {
      await redeem(token.symbol, amount);
      setInput("");
    } else {
      console.log("Mint not implemented in mock yet");
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex gap-4 border-b border-neutral-200 pb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="tradeMode"
            checked={mode === "redeem"}
            onChange={() => setMode("redeem")}
            className="accent-disco-600 w-4 h-4"
          />
          <span className="text-sm font-bold text-neutral-900">
            {copy.manage.trade.redeem.label}
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="tradeMode"
            checked={mode === "mint"}
            onChange={() => setMode("mint")}
            className="accent-disco-600 w-4 h-4"
          />
          <span className="text-sm font-bold text-neutral-900">
            {copy.manage.trade.mint.label}
          </span>
        </label>
      </div>

      <p className="text-sm text-neutral-600">
        {isRedeem
          ? copy.manage.trade.redeem.description
          : copy.manage.trade.mint.description}
      </p>

      {isRedeem && effectiveRemaining < 100n * 10n ** 18n && (
        <Banner variant="warning" title="Low Redemption Capacity">
          Only {formatTokenAmount(effectiveRemaining)} YFI remaining for
          redemption.
        </Banner>
      )}

      <AmountInput
        value={input}
        onChange={setInput}
        maxLabel={`Balance: ${formatTokenAmount(balance)}`}
        onMaxClick={() => setInput(formatTokenAmount(balance))}
        tokenSymbol={symbol}
        error={
          insufficientBalance
            ? isRedeem
              ? copy.manage.trade.redeem.insufficientLlyfi
              : copy.manage.trade.mint.insufficientYfi
            : capExceeded
            ? copy.manage.trade.redeem.capExceeded
            : undefined
        }
      />

      {isRedeem && isValid && amount > 0n && !capExceeded && (
        <div className="p-3 bg-neutral-50 rounded-md border border-neutral-200 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-neutral-600">
              Exit Fee ({formatPercent(feeBps / 10000)})
            </span>
            <span className="font-number text-red-600">
              -{formatTokenAmount(feeAmount)} YFI
            </span>
          </div>
          <div className="flex justify-between font-bold border-t border-neutral-200 pt-1 mt-1">
            <span className="text-neutral-900">You Receive</span>
            <span className="font-number text-neutral-900">
              {formatTokenAmount(netAmount)} YFI
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="veyfi"
          onClick={handleAction}
          disabled={isDisabled}
          isLoading={isSubmitting}
        >
          {isRedeem ? copy.manage.trade.redeem.cta : copy.manage.trade.mint.cta}
        </Button>
      </div>
    </div>
  );
}
