"use client";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { VeyfiStatsBar } from "./components/VeyfiStatsBar";
import { VeyfiCockpit } from "./components/VeyfiCockpit";
import { veyfiCopy as copy } from "./messages";
import { useProtocol } from "@/state/protocol";
import { MockControls } from "./components/MockControls";

export function VeyfiPageClient() {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { usesMockBackend } = useProtocol();

  return (
    <div className="space-y-0">
      <VeyfiStatsBar />

      <main className="container mx-auto px-4 md:px-6 pt-8 space-y-8 pb-24">
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

        <VeyfiCockpit />
      </main>

      {usesMockBackend && <MockControls />}
    </div>
  );
}
