"use client";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { StatsBar } from "@/components/ui/StatsBar";
import { formatPercent } from "@/lib/format";
import { useStyfiApy } from "@/lib/hooks/useStyfi";
import { StyfiCockpit } from "./components/StyfiCockpit";
import { StyfiPositionCard } from "./components/StyfiPositionCard";
import { StyfiMode } from "./components/types";
import { styfiCopy as copy } from "./messages";
import { StyfiModeProvider } from "./state/StyfiModeProvider";
import { MockControls } from "./components/MockControls";
import { useProtocol } from "@/state/protocol";

export function StyfiPageClient({ initialMode }: { initialMode?: StyfiMode }) {
  const { usesMockBackend } = useProtocol();

  return (
    <StyfiModeProvider initialMode={initialMode}>
      <StyfiPageShell />
      {usesMockBackend && <MockControls />}
    </StyfiModeProvider>
  );
}

function StyfiPageShell() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { data: apy } = useStyfiApy();

  const totalSupplyAmount = copy.page.stats.totalSupply.amount;
  const stakedAmount = copy.page.stats.staked.amount;
  const stakedPercentage =
    totalSupplyAmount > 0
      ? ((stakedAmount / totalSupplyAmount) * 100).toFixed(1)
      : "0.0";

  // Convert BPS (e.g. 6800) to fractional (0.68) for the formatter
  const formattedApy = apy ? formatPercent(Number(apy) / 10000) : "--%";

  return (
    <div className="space-y-0">
      <StatsBar
        items={[
          {
            label: copy.page.stats.totalSupply.label,
            value: copy.page.stats.totalSupply.value,
          },
          {
            label: copy.page.stats.staked.label,
            value: `${copy.page.stats.staked.value} (${stakedPercentage}%)`,
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

      <main className="container mx-auto px-4 md:px-6 pt-8 space-y-6">
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

        <StyfiPositionCard />

        <StyfiCockpit />
      </main>
    </div>
  );
}
