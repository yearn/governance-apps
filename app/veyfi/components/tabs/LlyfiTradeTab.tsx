// app/veyfi/components/tabs/LlyfiTradeTab.tsx
"use client";

import { useMemo, useState } from "react";
import { useIdentity } from "@/state/identity";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import {
  useVeyfiAccount,
  useLlyfiRedeem,
  useLlyfiMint,
} from "@/lib/hooks/useVeyfi";
import { formatTokenAmount, formatPercent } from "@/lib/format";
import { parseAmount } from "@/lib/parse";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { RadioGroup } from "@/components/ui/RadioGroup";

export function LlyfiTradeTab({ token }: { token: LlyfiTokenState }) {
  const { isConnected, yfiBalance, isBlacklisted } = useIdentity();
  const { data } = useVeyfiAccount();
  const [mode, setMode] = useState<"sell" | "buy">("sell");
  const [input, setInput] = useState("");

  const { amount, isValid } = useMemo(() => parseAmount(input), [input]);
  const { write: redeem, state: redeemState } = useLlyfiRedeem();
  const { write: mint, state: mintState } = useLlyfiMint();

  const isSell = mode === "sell";
  const userBalance = isSell ? token.walletBalance : yfiBalance;
  const sourceSymbol = isSell ? token.symbol : "YFI";
  const targetSymbol = isSell ? "YFI" : token.symbol;

  // Inventory Constraints
  // Buying LLYFI: Limited by LLYFI inventory in Redemption contract
  // Selling LLYFI: Limited by YFI inventory in Redemption contract
  const inventoryLimit = isSell
    ? data?.inventory.availableYfi ?? 0n
    : token.redemption.inventory;

  // Capacity Constraints (Redemption only)
  // Capacity limits the amount of YFI that can be redeemed.
  const remainingCapacityYfi =
    token.redemption.capacity - token.redemption.used;

  const exchangeRate = token.exchangeRate;
  const ONE_E18 = 10n ** 18n;

  // Values in target assets
  // If Selling: Input LLYFI -> Output YFI
  // If Buying: Input YFI -> Output LLYFI

  // Equivalent YFI value of the input
  const yfiValue = isSell ? (amount * ONE_E18) / exchangeRate : amount;

  // Equivalent LLYFI value of the input
  const llyfiValue = isSell ? amount : (amount * exchangeRate) / ONE_E18;

  // Fee Calculation
  // Fee is only on Redemption (Sell)
  // Fee is scaled 1e18 in our new types (e.g. 0.1 * 1e18 = 10%)
  const feePercent = token.redemption.fee;
  const feeAmountYfi = (yfiValue * feePercent) / ONE_E18;

  const netOutput = isSell
    ? yfiValue > feeAmountYfi
      ? yfiValue - feeAmountYfi
      : 0n
    : llyfiValue;

  // Check Exceeded Constraints
  let capExceeded = false;
  let inventoryExceeded = false;

  if (isSell) {
    // Limited by Capacity (in YFI terms) AND Inventory (in YFI terms)
    if (yfiValue > remainingCapacityYfi) capExceeded = true;
    if (yfiValue > (data?.inventory.availableYfi ?? 0n))
      inventoryExceeded = true;
  } else {
    // Buying limited by LLYFI inventory
    if (llyfiValue > token.redemption.inventory) inventoryExceeded = true;
  }

  const handleMaxProtocol = () => {
    let maxInput = 0n;
    if (isSell) {
      // Max LLYFI to sell = min(Inventory YFI, Capacity YFI) * Rate
      const maxYfi =
        remainingCapacityYfi < (data?.inventory.availableYfi ?? 0n)
          ? remainingCapacityYfi
          : data?.inventory.availableYfi ?? 0n;
      maxInput = (maxYfi * exchangeRate) / ONE_E18;
    } else {
      // Max YFI to spend = Inventory LLYFI / Rate
      maxInput = (token.redemption.inventory * ONE_E18) / exchangeRate;
    }
    setInput(formatTokenAmount(maxInput));
  };

  const isSubmitting =
    redeemState.status === "mining" || mintState.status === "mining";

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
          <span className="text-lg text-neutral-400">→</span>
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
                  (remainingCapacityYfi * exchangeRate) / ONE_E18
                )} ${token.symbol}`
              : `${formatTokenAmount(token.redemption.inventory)} ${
                  token.symbol
                }`}
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

      <Button
        variant="veyfi"
        className="w-full"
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
        {isSell ? `Redeem ${token.symbol}` : `Buy ${token.symbol}`}
      </Button>
    </div>
  );
}
