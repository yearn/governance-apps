"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StyfiHero } from "./components/StyfiHero";
import { StyfiDomainToolbar } from "./components/StyfiDomainToolbar";
import { StyfiCockpit } from "./components/StyfiCockpit";
import { StyfiDashboardSkeleton } from "./components/StyfiDashboardSkeleton";
import { StyfiMode } from "./components/types";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Card } from "@/components/ui/Card";

const LAST_MODE_KEY = "styfi-last-mode";

export function StyfiPageClient({
  initialMode,
}: {
  initialMode?: StyfiMode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected, address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [resolvedMode, setResolvedMode] = useState<StyfiMode | undefined>(
    initialMode
  );
  const [checkingStorage, setCheckingStorage] = useState(
    initialMode === undefined
  );

  // On mount, if no URL mode, try last-mode from localStorage.
  useEffect(() => {
    if (initialMode) {
      setCheckingStorage(false);
      return;
    }

    const stored = window.localStorage.getItem(LAST_MODE_KEY);
    if (stored === "styfi" || stored === "x") {
      setResolvedMode(stored);
      router.replace(`/styfi?mode=${stored}`);
    } else {
      setResolvedMode(undefined);
    }
    setCheckingStorage(false);
  }, [initialMode, router]);

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

  if (checkingStorage) {
    return <StyfiDashboardSkeleton />;
  }

  if (!activeMode) {
    return <StyfiHero onSelectMode={handleSelectMode} />;
  }

  return (
    <div className="space-y-6">
      <main className="container mx-auto px-4 pt-10 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCallout label="Total Supply" value="36,666 YFI" />
          <StatCallout label="Staked" value="2,583 YFI" />
          <StatCallout label="APR paid as USDS" value="84.58%" />
        </div>

        {!isConnected && (
          <Banner variant="warning" title="Wallet not connected">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span>Connect your wallet to view and manage positions.</span>
              <Button
                size="sm"
                variant="primary"
                onClick={() => openConnectModal?.()}
              >
                Connect wallet
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
