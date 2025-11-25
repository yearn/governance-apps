"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/ui/AmountInput";
import { Banner } from "@/components/ui/Banner";
import { formatTokenAmount } from "@/lib/format";
import { parseAmount } from "@/lib/parse";
import {
  useStyfiAccount,
  useStyfiStartCooldown,
} from "@/lib/hooks/useStyfi";
import { StyfiMode, modeLabel } from "../../types";

type Props = {
  mode: StyfiMode;
};

export function CooldownTab({ mode }: Props) {
  const { isConnected } = useAccount();
  const { data, isLoading } = useStyfiAccount();
  const { write: startCooldown, state } = useStyfiStartCooldown();
  const [input, setInput] = useState<string>("");

  const { amount, isValid } = useMemo(
    () => parseAmount(input || "0"),
    [input]
  );

  const available =
    mode === "styfi"
      ? data?.styfiActive ?? 0n
      : data?.styfiPlus.sharesActive ?? 0n;
  const outputAmount = isValid ? amount : 0n;

  const existingCooldown =
    mode === "styfi"
      ? data?.styfiCooldown?.amount ?? 0n
      : data?.styfiPlus.cooldown?.amount ?? 0n;

  const hasActiveCooldown = existingCooldown > 0n;

  const insufficient = isValid && amount > available;
  const isSubmitting =
    state.status === "signing" ||
    state.status === "submitted" ||
    state.status === "mining";

  const isDisabled =
    !isConnected ||
    !data ||
    data.isBlacklisted ||
    hasActiveCooldown ||
    !isValid ||
    amount <= 0n ||
    insufficient ||
    isLoading ||
    isSubmitting;

  const onMax = () => setInput(formatTokenAmount(available));

  const handleStart = async () => {
    if (!isValid || amount <= 0n) return;
    await startCooldown(mode === "styfi" ? "stYFI" : "stYFI+", amount);
    setInput("");
  };

  return (
    <div className="space-y-4">
      {hasActiveCooldown && (
        <Banner variant="info" title="Cooldown active">
          You already have a cooldown running for this mode.
        </Banner>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-neutral-600">
          <span>Amount to move into cooldown</span>
          <div className="font-number text-neutral-500">
            Available: {formatTokenAmount(available)}{" "}
            {mode === "styfi" ? "stYFI" : "stYFI+"}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
          <span className="font-number">
            {formatTokenAmount(outputAmount)} {modeLabel(mode)}
          </span>
          <span className="text-lg">→</span>
          <span className="font-number">
            {formatTokenAmount(outputAmount)} YFI
          </span>
        </div>
      </div>

      <AmountInput
        value={input}
        onChange={setInput}
        onMaxClick={onMax}
        tokenSymbol={mode === "styfi" ? "stYFI" : "stYFI+"}
        error={insufficient ? "Exceeds available" : undefined}
        placeholder="0.00"
        disabled={
          isLoading || isSubmitting || hasActiveCooldown || data?.isBlacklisted
        }
      />

      <div className="flex flex-col items-end gap-2">
        <p className="text-xs text-neutral-600 text-right">
          Starts a 14-day cooldown. You can withdraw after the timer ends.
        </p>
        <Button
          variant="secondary"
          onClick={handleStart}
          disabled={isDisabled}
          isLoading={isSubmitting}
        >
          Start cooldown for {modeLabel(mode)}
        </Button>
      </div>
    </div>
  );
}
