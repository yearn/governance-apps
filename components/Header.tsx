"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLauncher } from "@/components/AppLauncher";
import { WalletButton } from "@/components/WalletButton";
import { cn } from "@/lib/cn";
import { appCopy } from "@/app/_shared/messages";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useEpochClock } from "@/lib/hooks/useEpochClock";
import { Skeleton } from "@/components/ui/Skeleton";
import { useGlobalData } from "@/lib/hooks/useGlobalData";
import { useProtocol } from "@/state/protocol";

export function Header() {
  const pathname = usePathname();
  const clock = useEpochClock({ tickMs: 1000 });
  const { isLoading: isGlobalLoading } = useGlobalData();
  const { publicClient } = useProtocol();
  const showEpochPill = !!publicClient || !isGlobalLoading;

  const navItems = useMemo(() => {
    const isVeyfi = pathname?.startsWith("/veyfi");
    return [
      {
        label: isVeyfi ? "veYFI" : "stYFI",
        href: isVeyfi ? "/veyfi" : "/styfi",
        variant: "primary" as const,
      },
      ...appCopy.nav.items.filter((i) => i.variant !== "primary"),
    ];
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-app/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <AppLauncher />
          <nav className="hidden gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors",
                  item.variant === "primary"
                    ? "text-text-primary"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden h-6 w-px bg-border md:block" />
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
