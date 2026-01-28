"use client";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useIdentity } from "@/state/identity";
import { StatsBar } from "@/components/ui/StatsBar";
import { formatPercent, formatTokenAmount } from "@/lib/format";
import {
  useStyfiAccount,
  useStyfiApy,
  useStyfiStats,
} from "@/lib/hooks/useStyfi";
import { StyfiCockpit } from "./components/StyfiCockpit";
import { AccountSummary } from "./components/AccountSummary";
import type { StyfiAsset } from "./components/types";
import { styfiCopy as copy } from "./messages";
import { MockControls } from "./components/MockControls";
import { useProtocol } from "@/state/protocol";
import { useCallback, useEffect, useRef, useState } from "react";

export function StyfiPageClient() {
  const { usesMockBackend } = useProtocol();

  return (
    <>
      <StyfiPageShell />
      {usesMockBackend && <MockControls />}
    </>
  );
}

function StyfiPageShell() {
  const { isConnected } = useIdentity();
  const { openConnectModal } = useConnectModal();
  const { data: apy } = useStyfiApy();
  const { data: stats } = useStyfiStats();
  const { data: account, isLoading: isAccountLoading } = useStyfiAccount();
  const [selectedAsset, setSelectedAsset] = useState<StyfiAsset>();
  const hasUserSelected = useRef(false);
  const hasResolvedDefault = useRef(false);
  const cockpitRef = useRef<HTMLDivElement>(null);

  const handleSelectAsset = useCallback((asset: StyfiAsset) => {
    hasUserSelected.current = true;
    setSelectedAsset(asset);
  }, []);

  const handleHeroSelect = useCallback((asset: StyfiAsset) => {
    hasUserSelected.current = true;
    setSelectedAsset(asset);
    setTimeout(() => {
      cockpitRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  }, []);

  useEffect(() => {
    if (hasUserSelected.current || hasResolvedDefault.current) return;

    if (!account) {
      setSelectedAsset("stYFIx");
      return;
    }

    const styfiBalance =
      account.styfiActive + account.styfiInCooldown + account.styfiUnlocked;
    const styfixBalance =
      account.styfiX.assetsActive +
      account.styfiX.assetsInCooldown +
      account.styfiX.assetsUnlocked;

    if (styfixBalance > styfiBalance) {
      setSelectedAsset("stYFIx");
    } else if (styfiBalance > styfixBalance) {
      setSelectedAsset("stYFI");
    } else {
      setSelectedAsset("stYFIx");
    }
    hasResolvedDefault.current = true;
  }, [account]);

  // Dynamic stats or loading placeholder
  const totalSupply = stats
    ? formatTokenAmount(stats.totalSupply, 18, 0) + " YFI"
    : "-- YFI";

  const totalStaked = stats
    ? formatTokenAmount(stats.totalStaked, 18, 0) + " YFI"
    : "-- YFI";

  // Calculate dynamic percentage
  let stakedPercentage = "0.0";
  if (stats && stats.totalSupply > 0n) {
    const ratio =
      Number((stats.totalStaked * 10000n) / stats.totalSupply) / 100;
    stakedPercentage = ratio.toFixed(1);
  }

  // Convert BPS (e.g. 6800) to fractional (0.68) for the formatter
  const formattedApy = apy ? formatPercent(Number(apy) / 10000) : "--%";
  const activeAsset = selectedAsset ?? "stYFIx";
  const balances = account
    ? {
        styfi: {
          active: account.styfiActive,
          unstaking: account.styfiInCooldown,
          withdrawable: account.styfiWithdrawable,
          total:
            account.styfiActive +
            account.styfiInCooldown +
            account.styfiUnlocked,
        },
        styfix: {
          active: account.styfiX.assetsActive,
          unstaking: account.styfiX.assetsInCooldown,
          withdrawable: account.styfiX.assetsWithdrawable,
          total:
            account.styfiX.assetsActive +
            account.styfiX.assetsInCooldown +
            account.styfiX.assetsUnlocked,
        },
      }
    : null;
  const totalBalance = balances
    ? balances.styfi.total + balances.styfix.total
    : 0n;
  const isNewUser = totalBalance === 0n;

  return (
    <div className="space-y-0">
      <StatsBar
        items={[
          {
            label: copy.page.stats.totalSupply.label,
            value: totalSupply,
          },
          {
            label: copy.page.stats.staked.label,
            value: stats
              ? `${totalStaked} (${stakedPercentage}%)`
              : totalStaked,
          },
          {
            label: copy.page.stats.apr.label,
            value: formattedApy,
          },
          {
            label: copy.page.stats.phase.label,
            value: copy.page.stats.phase.value,
          },
        ]}
      />

      <main className="container mx-auto px-4 md:px-6 pt-8 space-y-6 pb-24">
        {!isConnected && (
          <Banner variant="warning" title={copy.page.connectBanner.title}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{copy.page.connectBanner.body}</span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => openConnectModal?.()}
              >
                {copy.page.connectBanner.cta}
              </Button>
            </div>
          </Banner>
        )}

        <AccountSummary
          isNewUser={isNewUser}
          selectedAsset={activeAsset}
          onSelectAsset={handleHeroSelect}
          balances={balances}
          isLoading={isAccountLoading}
          isConnected={isConnected}
        />

        <div ref={cockpitRef} className="scroll-mt-8">
          <StyfiCockpit
            selectedAsset={activeAsset}
            onSelectAsset={handleSelectAsset}
            isNewUser={isNewUser}
          />
        </div>
      </main>
    </div>
  );
}
