"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { Banner } from "@/components/ui/Banner";
import {
  useRedemptionCaps,
  useLlyfiRedeem,
  useLlyfiMint,
} from "@/lib/hooks/useVeyfi";
import { useWalletYfiBalance } from "@/lib/hooks/useWalletYfiBalance";
import { formatTokenAmount, formatPercent } from "@/lib/format";
import { parseAmount } from "@/lib/parse";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { RadioGroup } from "@/components/ui/RadioGroup";

export function LlyfiTradeTab({ token }: { token: LlyfiTokenState }) {
  const { isConnected } = useAccount();
  const [mode, setMode] = useState<"sell" | "buy">("sell");
  const [input, setInput] = useState("");

  const { amount, isValid } = useMemo(() => parseAmount(input), [input]);
  const { balance: yfiBalance } = useWalletYfiBalance();
  const caps = useRedemptionCaps();
  const { write: redeem, state: redeemState } = useLlyfiRedeem();
  const { write: mint, state: mintState } = useLlyfiMint();

  const isSell = mode === "sell";
  const balance = isSell ? token.walletBalance : yfiBalance;
  const symbol = isSell ? token.symbol : "YFI";

  // --- Capacity Logic ---
  // Sell LLYFI (Redeem): Capacity is Protocol YFI available
  const globalRemaining = caps ? caps.globalLimit - caps.globalUsed : 0n;
  // We use global YFI capacity as the limiting factor for Selling
  const effectiveCapacityYfi = globalRemaining;

  // Buy LLYFI (Mint): Capacity is Protocol LLYFI inventory
  const protocolLlyfiCapacity = token.protocolLiquidity;

  // --- Conversion Math ---
  const rate = token.exchangeRate; // Scaled 1e18
  const ONE_E18 = 10n ** 18n;

  const amountInYfi = isSell ? (amount * ONE_E18) / rate : amount;

  const amountInLlyfi = isSell ? amount : (amount * rate) / ONE_E18;

  const feeBps = caps?.feeBps ?? 0;
  const feeAmountYfi = (amountInYfi * BigInt(feeBps)) / 10000n;

  const netYfi = amountInYfi > feeAmountYfi ? amountInYfi - feeAmountYfi : 0n;
  const grossLlyfi = amountInLlyfi;

  const visualOutput = isSell ? netYfi : grossLlyfi;
  const outputSymbol = isSell ? "YFI" : token.symbol;

  const capExceeded = isSell
    ? amountInYfi > effectiveCapacityYfi
    : amountInLlyfi > protocolLlyfiCapacity;

  const insufficientBalance = isValid && amount > balance;

  const isSubmitting =
    redeemState.status === "signing" ||
    redeemState.status === "mining" ||
    mintState.status === "signing" ||
    mintState.status === "mining";

  const isDisabled =
    !isConnected ||
    !isValid ||
    amount <= 0n ||
    insufficientBalance ||
    capExceeded ||
    isSubmitting;

  const handleAction = async () => {
    if (isSell) {
      await redeem(token.symbol, amount);
    } else {
      await mint(token.symbol, amount);
    }
    setInput("");
  };

  const handleMaxCapacity = () => {
    if (isSell) {
      // Capacity is YFI. Input is LLYFI.
      // LLYFI = YFI * Rate / 1e18
      const capacityInLlyfi = (effectiveCapacityYfi * rate) / ONE_E18;
      setInput(formatTokenAmount(capacityInLlyfi));
    } else {
      // Capacity is LLYFI. Input is YFI.
      // YFI = LLYFI * 1e18 / Rate
      const capacityInYfi = (protocolLlyfiCapacity * ONE_E18) / rate;
      setInput(formatTokenAmount(capacityInYfi));
    }
  };

  const capacityLabel = isSell
    ? `${formatTokenAmount(effectiveCapacityYfi)} YFI`
    : `${formatTokenAmount(protocolLlyfiCapacity)} ${token.symbol}`;

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <RadioGroup
          name={`tradeMode-${token.symbol}`}
          value={mode}
          onChange={setMode}
          options={[
            { value: "sell", label: `Sell ${token.symbol}` },
            { value: "buy", label: `Buy ${token.symbol}` },
          ]}
          className="pl-1"
        />
      </div>

      <div className="space-y-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
          <p className="text-neutral-600">{isSell ? `You sell` : `You buy`}</p>
          <div className="flex items-center gap-2 font-medium text-neutral-900">
            <span className="font-number">
              {formatTokenAmount(isValid ? amount : 0n)} {symbol}
            </span>
            <span className="text-lg text-neutral-400">→</span>
            <span className="font-number">
              {formatTokenAmount(visualOutput)} {outputSymbol}
            </span>
          </div>
        </div>

        <div className="flex justify-end text-xs">
          <button
            onClick={handleMaxCapacity}
            className="font-medium text-neutral-500 hover:text-disco-600 hover:underline transition-colors decoration-disco-300 underline-offset-2"
          >
            Protocol Capacity: {capacityLabel}
          </button>
        </div>
      </div>

      {isSell && effectiveCapacityYfi < 100n * 10n ** 18n && (
        <Banner variant="warning" title="Low Protocol Liquidity">
          Only {formatTokenAmount(effectiveCapacityYfi)} YFI remaining for
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
            ? isSell
              ? `Insufficient ${token.symbol}`
              : "Insufficient YFI"
            : capExceeded
            ? "Exceeds protocol capacity"
            : undefined
        }
      />

      {isSell && isValid && amount > 0n && !capExceeded && (
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-md border border-neutral-200 text-xs text-neutral-600">
          <span>Exit Fee ({formatPercent(feeBps / 10000)})</span>
          <span className="font-number">
            -{formatTokenAmount(feeAmountYfi)} YFI
          </span>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          variant="veyfi"
          onClick={handleAction}
          disabled={isDisabled}
          isLoading={isSubmitting}
        >
          {isSell ? `Sell ${token.symbol}` : `Buy ${token.symbol}`}
        </Button>
      </div>
    </div>
  );
}
