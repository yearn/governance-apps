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
import { styfiCopy as copy } from "../../../messages";

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
      : data?.styfiX.sharesActive ?? 0n;
  const outputAmount = isValid ? amount : 0n;

  const existingCooldown =
    mode === "styfi"
      ? data?.styfiCooldown?.amount ?? 0n
      : data?.styfiX.cooldown?.amount ?? 0n;

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
    await startCooldown(mode === "styfi" ? "stYFI" : "stYFIx", amount);
    setInput("");
  };

  return (
    <div className="space-y-4">
      {hasActiveCooldown && (
        <Banner variant="info" title={copy.cooldownTab.bannerTitle}>
          {copy.cooldownTab.bannerBody}
        </Banner>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-neutral-600">
          <span>{copy.cooldownTab.amountLabel}</span>
          <div className="font-number text-neutral-500">
            {copy.cooldownTab.availableLabel(
              formatTokenAmount(available),
              mode === "styfi" ? copy.toolbar.mode.styfiLabel : copy.toolbar.mode.xLabel
            )}
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
        tokenSymbol={mode === "styfi" ? "stYFI" : "stYFIx"}
        error={insufficient ? copy.cooldownTab.errorExceeds : undefined}
        placeholder="0.00"
        disabled={
          isLoading || isSubmitting || hasActiveCooldown || data?.isBlacklisted
        }
      />

      <div className="flex flex-col items-end gap-2">
        <p className="text-xs text-neutral-600 text-right">
          {copy.cooldownTab.helper}
        </p>
        <Button
          variant="secondary"
          onClick={handleStart}
          disabled={isDisabled}
          isLoading={isSubmitting}
        >
          {copy.cooldownTab.startCta(modeLabel(mode))}
        </Button>
      </div>
    </div>
  );
}
