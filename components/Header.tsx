"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLauncher } from "@/components/AppLauncher";
import { WalletButton } from "@/components/WalletButton";
import { cn } from "@/lib/cn";
import { appCopy } from "@/app/_shared/messages";
import { IconMenu } from "@/components/icons/IconMenu";
import { IconClose } from "@/components/icons/IconClose";
import { useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatTokenAmount } from "@/lib/format";
import { useWalletYfiBalance } from "@/lib/hooks/useWalletYfiBalance";
import { useStyfiEpoch } from "@/lib/hooks/useStyfi";
import { useEpochCountdown } from "@/lib/hooks/useEpochCountdown";
import { useAccount } from "wagmi";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isConnected } = useAccount();
  const {
    balance: yfiBalance,
    isLoading: yfiLoading,
  } = useWalletYfiBalance();
  const { data: epochData } = useStyfiEpoch();
  const { timeRemaining } = useEpochCountdown(epochData?.epochEnd, undefined);
  const displayEpoch = epochData?.currentEpoch ?? 0;

  const epochLabel = epochData
    ? appCopy.header.epoch.withNumber(displayEpoch)
    : appCopy.header.epoch.label;

  const epochRemaining = epochData
    ? `${timeRemaining ?? appCopy.header.epoch.fallbackRemaining} ${appCopy.header.epoch.remainingSuffix}`
    : undefined;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-neutral-100/80 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        {/* Left: Launcher & Logo */}
        <div className="flex items-center gap-4">
          <AppLauncher />
          <div className="hidden h-6 w-px bg-neutral-300 md:block" />

          {/* Desktop Nav */}
          <nav className="hidden gap-6 md:flex">
            {appCopy.nav.items.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm font-bold transition-colors hover:text-neutral-900",
                    isActive ? "text-neutral-900" : "text-neutral-500"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: YFI + Epoch + Wallet & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <HeaderPills
            isConnected={isConnected}
            yfiLoading={yfiLoading}
            yfiBalance={yfiBalance}
            epochLabel={epochLabel}
            timeRemaining={epochRemaining}
          />
          <WalletButton />

          <button
            className="md:hidden text-neutral-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <IconClose /> : <IconMenu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-neutral-200 bg-white p-4 md:hidden shadow-xl">
          <nav className="flex flex-col gap-4">
            {appCopy.nav.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "text-lg font-bold",
                  pathname.startsWith(item.href)
                    ? "text-neutral-900"
                    : "text-neutral-500"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function HeaderPills({
  isConnected,
  yfiLoading,
  yfiBalance,
  epochLabel,
  timeRemaining,
}: {
  isConnected: boolean;
  yfiLoading: boolean;
  yfiBalance: bigint;
  epochLabel: string;
  timeRemaining?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium">
        <span className="text-neutral-500">{epochLabel}</span>
        <span className="font-number font-bold">
          {timeRemaining ?? "--"}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium">
        <span className="text-neutral-500">{appCopy.header.yfi.symbol}</span>
        {yfiLoading ? (
          <Skeleton className="h-4 w-14" />
        ) : isConnected ? (
          <span className="font-number font-bold">
            {formatTokenAmount(yfiBalance, 18, 4)}
          </span>
        ) : (
          <span className="text-neutral-500">
            {appCopy.header.yfi.notConnected}
          </span>
        )}
      </div>
    </div>
  );
}
