"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { formatTokenAmount } from "@/lib/format";
import { useStyfiAccount, useStyfiWithdraw } from "@/lib/hooks/useStyfi";
import { useEpochCountdown } from "@/lib/hooks/useEpochCountdown";
import { StyfiMode, modeLabel } from "../../types";

type Props = {
  mode: StyfiMode;
};

export function WithdrawTab({ mode }: Props) {
  const { isConnected } = useAccount();
  const { data, isLoading } = useStyfiAccount();
  const { write: withdraw, state } = useStyfiWithdraw();

  const cooldown = mode === "styfi" ? data?.styfiCooldown : data?.styfiX.cooldown;
  const readyAmount =
    mode === "styfi"
      ? data?.styfiInCooldown ?? 0n
      : data?.styfiX.assetsInCooldown ?? 0n;

  const { timeRemaining, isComplete } = useEpochCountdown(
    cooldown?.endsAt,
    undefined
  );

  const canWithdraw =
    isConnected &&
    data &&
    !data.isBlacklisted &&
    readyAmount > 0n &&
    isComplete;

  const isSubmitting =
    state.status === "signing" ||
    state.status === "submitted" ||
    state.status === "mining";

  const handleWithdraw = async () => {
    await withdraw(mode === "styfi" ? "stYFI" : "stYFIx");
  };

  const emptyState = useMemo(() => readyAmount === 0n, [readyAmount]);

  return (
    <div className="space-y-4">
      {data?.isBlacklisted && (
        <Banner variant="error" title="Blacklisted">
          This address is restricted from using this interface.
        </Banner>
      )}

      {isLoading ? (
        <p className="text-sm text-neutral-600">Loading cooldown data…</p>
      ) : !data ? (
        <p className="text-sm text-neutral-600">
          Connect your wallet to see withdrawable amounts.
        </p>
      ) : emptyState ? (
        <p className="text-sm text-neutral-600">
          Nothing in cooldown right now. Start a cooldown first.
        </p>
      ) : (
        <>
          <div className="space-y-1">
            <p className="text-sm text-neutral-500">Available to withdraw</p>
            <p className="text-2xl font-number font-bold">
              {formatTokenAmount(readyAmount)}{" "}
              {mode === "styfi" ? "YFI" : "YFI"}
            </p>
            {cooldown?.endsAt && !isComplete && (
              <p className="text-xs text-neutral-500">
                Ready in {timeRemaining}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={handleWithdraw}
              disabled={!canWithdraw || isSubmitting}
              isLoading={isSubmitting}
            >
              Withdraw {modeLabel(mode)}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
