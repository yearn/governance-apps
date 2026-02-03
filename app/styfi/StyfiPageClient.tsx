"use client";

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
import type { StyfiAccountState } from "@/lib/clients/styfi/types";

function deriveBalances(account: StyfiAccountState) {
  const styfiActive = account.styfiActive;
  const styfiUnstaking = account.styfiInCooldown;
  const styfiWithdrawable = account.styfiWithdrawable;
  const styfiTotalRaw = styfiActive + styfiUnstaking + account.styfiUnlocked;
  const styfiTotal = styfiTotalRaw > 0n ? styfiTotalRaw : styfiWithdrawable;

  const styfixActive =
    account.styfiX.assetsActive > 0n
      ? account.styfiX.assetsActive
      : account.styfiX.sharesActive;
  const styfixUnstaking =
    account.styfiX.assetsInCooldown > 0n
      ? account.styfiX.assetsInCooldown
      : account.styfiX.sharesInCooldown;
  const styfixWithdrawable = account.styfiX.assetsWithdrawable;
  const styfixTotalRaw =
    styfixActive + styfixUnstaking + account.styfiX.assetsUnlocked;
  const styfixTotal = styfixTotalRaw > 0n ? styfixTotalRaw : styfixWithdrawable;

  return {
    styfi: {
      active: styfiActive,
      unstaking: styfiUnstaking,
      withdrawable: styfiWithdrawable,
      total: styfiTotal,
    },
    styfix: {
      active: styfixActive,
      unstaking: styfixUnstaking,
      withdrawable: styfixWithdrawable,
      total: styfixTotal,
    },
  };
}

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
  const { globalData } = useProtocol();
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

    const derived = deriveBalances(account);
    const styfiBalance = derived.styfi.total;
    const styfixBalance = derived.styfix.total;

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

  const projectedApyBps = globalData?.styfi?.projected?.aprBps;
  const showProjectedApy =
    globalData?.meta?.epoch === 0 && projectedApyBps !== undefined;
  const statsApyBps = showProjectedApy
    ? Number(projectedApyBps)
    : apy !== undefined
      ? Number(apy)
      : undefined;
  const formattedApy =
    statsApyBps !== undefined ? formatPercent(statsApyBps / 10000) : "--%";
  const aprLabel = showProjectedApy
    ? copy.page.stats.aprEpoch1.label
    : copy.page.stats.apr.label;
  const activeAsset = selectedAsset ?? "stYFIx";
  const balances = account ? deriveBalances(account) : null;
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
            label: aprLabel,
            value: formattedApy,
          },
          {
            label: copy.page.stats.phase.label,
            value: copy.page.stats.phase.value,
          },
        ]}
      />

      <main className="container mx-auto px-4 md:px-6 pt-8 space-y-6 pb-24">
        <AccountSummary
          isNewUser={isNewUser}
          selectedAsset={activeAsset}
          onSelectAsset={handleHeroSelect}
          balances={balances}
          isLoading={isAccountLoading}
          isConnected={isConnected}
          onConnect={openConnectModal}
          connectLabel={copy.page.connectBanner.cta}
          connectBody={copy.page.connectBanner.body}
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
