"use client";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { StatsBar } from "@/components/ui/StatsBar";
import { StyfiCockpit } from "./components/StyfiCockpit";
import { StyfiPositionCard } from "./components/StyfiPositionCard";
import { StyfiMode } from "./components/types";
import { styfiCopy as copy } from "./messages";
import { StyfiModeProvider } from "./state/StyfiModeProvider";

export function StyfiPageClient({ initialMode }: { initialMode?: StyfiMode }) {
  return (
    <StyfiModeProvider initialMode={initialMode}>
      <StyfiPageShell />
    </StyfiModeProvider>
  );
}

function StyfiPageShell() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

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
            value: copy.page.stats.staked.value,
          },
        ]}
      />

      {/* Added md:px-6 to match Header alignment */}
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
