"use client";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { StyfiCockpit } from "./components/StyfiCockpit";
import { StyfiPositionCard } from "./components/StyfiPositionCard";
import { StyfiMode } from "./components/types";
import { styfiCopy as copy } from "./messages";
import { StyfiModeProvider } from "./state/StyfiModeProvider";

export function StyfiPageClient({
  initialMode,
}: {
  initialMode?: StyfiMode;
}) {
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
    <div className="space-y-6">
      <main className="container mx-auto px-4 pt-10 space-y-6">
        <StyfiPositionCard />

        <div className="grid gap-4 md:grid-cols-3">
          <StatCallout
            label={copy.page.stats.totalSupply.label}
            value={copy.page.stats.totalSupply.value}
          />
          <StatCallout
            label={copy.page.stats.staked.label}
            value={copy.page.stats.staked.value}
          />
          <StatCallout
            label={copy.page.stats.apr.label}
            value={copy.page.stats.apr.value}
          />
        </div>

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
      </main>

      <StyfiCockpit />
    </div>
  );
}

function StatCallout({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="text-2xl font-number font-bold text-neutral-900">{value}</p>
    </Card>
  );
}
