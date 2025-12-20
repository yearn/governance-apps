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

  const protocolInventoryYfi = data?.inventory.availableYfi ?? 0n;
  const protocolInventoryLlyfi = token.protocolLiquidity;
  const effectiveInventory = isSell
    ? protocolInventoryYfi
    : protocolInventoryLlyfi;

  const exchangeRate = token.exchangeRate;
  const ONE_E18 = 10n ** 18n;

  // Values in target assets
  const yfiValue = isSell ? (amount * ONE_E18) / exchangeRate : amount;
  const llyfiValue = isSell ? amount : (amount * exchangeRate) / ONE_E18;

  const feeBps = data?.inventory.feeBps ?? 0;
  const feeAmountYfi = (yfiValue * BigInt(feeBps)) / 10000n;
  const netOutput = isSell
    ? yfiValue > feeAmountYfi
      ? yfiValue - feeAmountYfi
      : 0n
    : llyfiValue;

  const capExceeded = isSell
    ? yfiValue > protocolInventoryYfi
    : llyfiValue > protocolInventoryLlyfi;

  const handleMaxProtocol = () => {
    // If selling: Max amount of LLYFI that results in the protocol's available YFI
    // If buying: Max amount of YFI that drains protocol's LLYFI inventory
    const maxInput = isSell
      ? (protocolInventoryYfi * exchangeRate) / ONE_E18
      : (protocolInventoryLlyfi * ONE_E18) / exchangeRate;
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
          Available in Protocol:{" "}
          <span className="underline decoration-dotted">
            {formatTokenAmount(effectiveInventory)} {targetSymbol}
          </span>
        </button>
      </div>

      <AmountInput
        value={input}
        onChange={setInput}
        tokenSymbol={sourceSymbol}
        maxLabel={`Wallet: ${formatTokenAmount(userBalance)}`}
        onMaxClick={() => setInput(formatTokenAmount(userBalance))}
        error={capExceeded ? "Exceeds protocol inventory" : undefined}
      />

      {isSell && isValid && amount > 0n && !capExceeded && (
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-md border border-neutral-100 text-xs text-neutral-600">
          <span>Exit Fee ({formatPercent(feeBps / 10000)})</span>
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
