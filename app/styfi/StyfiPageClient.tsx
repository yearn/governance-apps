"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Banner } from "@/components/ui/Banner";
import { cn } from "@/lib/cn";

type Mode = "styfi" | "plus";
const LAST_MODE_KEY = "styfi-last-mode";

function modeLabel(mode: Mode) {
  return mode === "styfi" ? "stYFI" : "stYFI+";
}

export function StyfiPageClient({ initialMode }: { initialMode?: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resolvedMode, setResolvedMode] = useState<Mode | undefined>(
    initialMode
  );
  const [checkingStorage, setCheckingStorage] = useState(
    initialMode === undefined
  );

  // On mount, if no URL mode, try last-mode from localStorage.
  useEffect(() => {
    if (initialMode) return;

    const stored = window.localStorage.getItem(LAST_MODE_KEY);
    if (stored === "styfi" || stored === "plus") {
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

  const activeMode: Mode | undefined = useMemo(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "styfi" || modeParam === "plus") return modeParam;
    return resolvedMode;
  }, [resolvedMode, searchParams]);

  const handleSelectMode = (mode: Mode) => {
    setResolvedMode(mode);
    router.replace(`/styfi?mode=${mode}`);
  };

  if (checkingStorage) {
    return (
      <main className="container mx-auto flex min-h-[60vh] items-center justify-center">
        <p className="text-neutral-500 text-sm">Preparing stYFI dashboard…</p>
      </main>
    );
  }

  if (!activeMode) {
    return (
      <main className="container mx-auto flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 py-12">
        <div className="space-y-3 text-center max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            Choose your path
          </p>
          <h1 className="text-4xl font-bold text-neutral-900">
            Stake with stYFI or stYFI+
          </h1>
          <p className="text-neutral-600 text-lg">
            stYFI earns standard rewards with a fixed cooldown. stYFI+ gives you
            boosted exposure with shares-based accounting. Pick a mode to enter
            the cockpit.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <Card className="w-72 space-y-3 border-neutral-300">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">stYFI</h2>
              <p className="text-neutral-600 text-sm">
                Fixed share price, straightforward staking and cooldown.
              </p>
            </div>
            <Button variant="styfi" className="w-full" onClick={() => handleSelectMode("styfi")}>
              Enter stYFI
            </Button>
          </Card>

          <Card className="w-72 space-y-3 border-neutral-300">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">stYFI+</h2>
              <p className="text-neutral-600 text-sm">
                Shares-based vault with boosted rewards and flexible deposits.
              </p>
            </div>
            <Button variant="veyfi" className="w-full" onClick={() => handleSelectMode("plus")}>
              Enter stYFI+
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-10 space-y-8">
      <DomainToolbar activeMode={activeMode} onSelectMode={handleSelectMode} />

      <Banner variant="info" title="Mock mode">
        This dashboard is running against mock clients while contracts finalize.
      </Banner>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-6 space-y-4">
          <h2 className="text-xl font-bold">
            {modeLabel(activeMode)} Cockpit (coming soon)
          </h2>
          <p className="text-neutral-600">
            Phase 5 UI will render staking, cooldown, withdraw, and rewards
            panels here. Domain hooks and mock clients are already wired.
          </p>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-bold">Epoch</h3>
          <p className="text-neutral-600 text-sm">
            Countdown and epoch info will render here using `useEpochCountdown`.
          </p>
          <Tabs
            activeTab={activeMode}
            onChange={(tab) => handleSelectMode(tab as Mode)}
            tabs={[
              { id: "styfi", label: "stYFI" },
              { id: "plus", label: "stYFI+" },
            ]}
          />
        </Card>
      </div>

      <footer className="text-xs text-neutral-500">
        Need veYFI? <Link className="underline" href="/veyfi">Go to veYFI</Link>
      </footer>
    </main>
  );
}

function DomainToolbar({
  activeMode,
  onSelectMode,
}: {
  activeMode: Mode;
  onSelectMode: (mode: Mode) => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          stYFI Toolbar
        </p>
        <h1 className="text-3xl font-bold text-neutral-900">
          {modeLabel(activeMode)} Dashboard
        </h1>
      </div>
      <div className="flex flex-wrap gap-3">
        {(["styfi", "plus"] as Mode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onSelectMode(mode)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-bold transition-colors",
              activeMode === mode
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
            )}
            aria-pressed={activeMode === mode}
          >
            {modeLabel(mode)}
          </button>
        ))}
      </div>
    </div>
  );
}
