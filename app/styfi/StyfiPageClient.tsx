"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StyfiHero } from "./components/StyfiHero";
import { StyfiDomainToolbar } from "./components/StyfiDomainToolbar";
import { StyfiCockpit } from "./components/StyfiCockpit";
import { StyfiMode } from "./components/types";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Card } from "@/components/ui/Card";
import { styfiCopy as copy } from "./messages";

const LAST_MODE_KEY = "styfi-last-mode";

function getStoredMode(): StyfiMode | undefined {
  if (typeof window === "undefined") return undefined;
  const stored = window.localStorage.getItem(LAST_MODE_KEY);
  return stored === "styfi" || stored === "x" ? stored : undefined;
}

export function StyfiPageClient({
  initialMode,
}: {
  initialMode?: StyfiMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const storedInitMode = initialMode ? undefined : getStoredMode();
  const [resolvedMode, setResolvedMode] = useState<StyfiMode | undefined>(
    initialMode ?? storedInitMode
  );

  // On mount, if we bootstrapped from localStorage and URL lacks mode, align URL.
  useEffect(() => {
    if (!initialMode && storedInitMode) {
      router.replace(`/styfi?mode=${storedInitMode}`);
    }
  }, [initialMode, router, storedInitMode]);

  // When a URL mode exists, persist it.
  useEffect(() => {
    if (resolvedMode) {
      window.localStorage.setItem(LAST_MODE_KEY, resolvedMode);
    }
  }, [resolvedMode]);

  const activeMode: StyfiMode | undefined = useMemo(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "styfi" || modeParam === "x") return modeParam;
    return resolvedMode;
  }, [resolvedMode, searchParams]);

  const handleSelectMode = (mode: StyfiMode) => {
    setResolvedMode(mode);
    router.replace(`/styfi?mode=${mode}`);
  };

  if (!activeMode) {
    return <StyfiHero onSelectMode={handleSelectMode} />;
  }

  return (
    <div className="space-y-6">
      <main className="container mx-auto px-4 pt-10 space-y-6">
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
            <div className="flex items-center justify-between gap-3 flex-wrap">
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
        <StyfiDomainToolbar
          activeMode={activeMode}
          onSelectMode={handleSelectMode}
        />
      </main>

      <StyfiCockpit mode={activeMode} />
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
