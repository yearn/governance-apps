"use client";

import Link from "next/link";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";
import { WalletButton } from "@/components/WalletButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useEpochClock } from "@/lib/hooks/useEpochClock";
import { Skeleton } from "@/components/ui/Skeleton";
import { useGlobalData } from "@/lib/hooks/useGlobalData";
import { useProtocol } from "@/state/protocol";
import { resolveHeaderPrimaryNav } from "@/lib/header-nav";
import { useEffect, useState } from "react";
import { TypeMarkYearn } from "@/components/icons/TypeMarkYearn";
import { HeaderNavMenu } from "@/components/header/HeaderNavMenu";

export function Header() {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();
  const segment = segments[0] ?? null;
  const clock = useEpochClock({ tickMs: 1000 });
  const { isLoading: isGlobalLoading } = useGlobalData();
  const { publicClient } = useProtocol();
  const showEpochPill = !!publicClient || !isGlobalLoading;

  // Resolve current app name (stYFI, veYFI, etc)
  const primaryNav = resolveHeaderPrimaryNav(pathname, segment);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-app/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <TypeMarkYearn
            className="h-8 w-auto text-yearn-blue dark:text-text-primary"
            color="currentColor"
          />
          <nav className="hidden gap-6 md:flex">
            <Link
              href={primaryNav.path}
              className="transition-colors text-text-primary"
            >
              {primaryNav.label}
            </Link>
          </nav>
          <div className="hidden h-6 w-px bg-border md:block" />
          <div className="hidden md:block">
            <HeaderNavMenu />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showEpochPill ? (
            <EpochCountdownBadge epoch={clock.epochInfo} now={clock.now} />
          ) : (
            <Skeleton className="h-7 w-36" />
          )}
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function EpochCountdownBadge({
  epoch,
  now,
}: {
  epoch: { currentEpoch: number; epochEnd: number };
  now: number;
}) {
  const [rem, setRem] = useState(0);
  useEffect(() => {
    setRem(Math.max(0, epoch.epochEnd - now));
  }, [epoch, now]);

  const d = Math.floor(rem / 86400);
  const h = Math.floor((rem % 86400) / 3600);

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface-secondary px-3 py-1.5 text-xs font-medium">
      <span className="text-text-secondary">Epoch {epoch.currentEpoch}</span>
      <span className="text-text-tertiary">&#183;</span>
      <span>
        {d}d {h}h left
      </span>
    </div>
  );
}
