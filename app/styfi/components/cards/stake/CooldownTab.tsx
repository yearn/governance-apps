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
    !isValid ||
    amount <= 0n ||
    insufficient ||
    isLoading ||
    isSubmitting;

  const isTopUp = amount > 0n && hasActiveCooldown;
  const bannerVariant = isTopUp ? "warning" : "info";
  const bannerTitle = isTopUp
    ? "Warning: Timer Reset"
    : copy.cooldownTab.bannerTitle;
  const bannerBody = isTopUp
    ? "Adding to your cooldown will reset the 14-day timer for your entire cooldown balance."
    : copy.cooldownTab.bannerBody;

  const onMax = () => setInput(formatTokenAmount(available));

  const handleStart = async () => {
    if (!isValid || amount <= 0n) return;
    await startCooldown(mode === "styfi" ? "stYFI" : "stYFIx", amount);
    setInput("");
  };

  return (
    <div className="space-y-4">
      {hasActiveCooldown && (
        <Banner variant={bannerVariant} title={bannerTitle}>
          {bannerBody}
        </Banner>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-neutral-600">
          {copy.cooldownTab.amountLabel}
        </p>
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
        maxLabel={copy.cooldownTab.availableLabel(
          formatTokenAmount(available),
          modeLabel(mode)
        )}
        tokenSymbol={mode === "styfi" ? "stYFI" : "stYFIx"}
        error={insufficient ? copy.cooldownTab.errorExceeds : undefined}
        placeholder="0.00"
        disabled={isLoading || isSubmitting || data?.isBlacklisted}
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
