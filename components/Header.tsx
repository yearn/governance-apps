"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLauncher } from "@/components/AppLauncher";
import { WalletButton } from "@/components/WalletButton";
import { cn } from "@/lib/cn";
import { appCopy } from "@/app/_shared/messages";
import { IconMenu } from "@/components/icons/IconMenu";
import { IconClose } from "@/components/icons/IconClose";
import { useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatTokenAmount } from "@/lib/format";
import { useWalletYfiBalance } from "@/lib/hooks/useWalletYfiBalance";
import { useStyfiEpoch } from "@/lib/hooks/useStyfi";
import { useAccount } from "wagmi";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isConnected } = useAccount();
  const { balance: yfiBalance, isLoading: yfiLoading } = useWalletYfiBalance();
  const { data: epochData } = useStyfiEpoch();
  const epochNumber = epochData?.currentEpoch;
  const epochEnd = epochData?.epochEnd;

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
              const isExternal = item.href.startsWith("http");
              const isActive = !isExternal && pathname.startsWith(item.href);
              const emphasis =
                item.variant === "primary"
                  ? isActive
                    ? "font-bold text-neutral-900"
                    : "font-bold text-neutral-500"
                  : "font-medium text-neutral-600";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer" : undefined}
                  className={cn(
                    "text-sm transition-colors hover:text-neutral-900",
                    emphasis
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: YFI + Epoch + Wallet & Mobile Toggle */}
        <div className="flex items-center gap-2">
          <HeaderPills
            isConnected={isConnected}
            yfiLoading={yfiLoading}
            yfiBalance={yfiBalance}
            epochNumber={epochNumber}
            epochEnd={epochEnd}
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
            {appCopy.nav.items.map((item) => {
              const isExternal = item.href.startsWith("http");
              const isActive = !isExternal && pathname.startsWith(item.href);
              const emphasis =
                item.variant === "primary"
                  ? isActive
                    ? "font-bold text-neutral-900"
                    : "font-bold text-neutral-500"
                  : "font-medium text-neutral-600";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn("text-lg transition-colors", emphasis)}
                >
                  {item.label}
                </Link>
              );
            })}
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
  epochNumber,
  epochEnd,
}: {
  isConnected: boolean;
  yfiLoading: boolean;
  yfiBalance: bigint;
  epochNumber?: number;
  epochEnd?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <EpochCountdownBadge epochNumber={epochNumber} epochEnd={epochEnd} />

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

function EpochCountdownBadge({
  epochNumber,
  epochEnd,
}: {
  epochNumber?: number;
  epochEnd?: number;
}) {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [useShortLabel, setUseShortLabel] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeSeconds =
    epochEnd && secondsRemaining !== null ? secondsRemaining : null;
  const intervalMs =
    activeSeconds !== null && activeSeconds < 3600 ? 1000 : 60_000;

  useEffect(() => {
    if (!epochEnd) return;

    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, epochEnd - now);
      setSecondsRemaining(remaining);
    };

    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [epochEnd, intervalMs]);

  const timeText = useMemo(() => {
    if (activeSeconds === null) return "--";
    if (activeSeconds <= 0) return "Ready";

    const d = Math.floor(activeSeconds / 86400);
    const h = Math.floor((activeSeconds % 86400) / 3600);
    const m = Math.floor((activeSeconds % 3600) / 60);
    const s = activeSeconds % 60;

    if (activeSeconds >= 7 * 86400) return `${d}d left`;
    if (activeSeconds >= 86400) return `${d}d ${h}h left`;
    if (activeSeconds >= 3600) return `${h}h ${m}m left`;
    return `${m}m ${s}s left`;
  }, [activeSeconds]);

  const epochLabel = useShortLabel
    ? `E${epochNumber ?? "--"}`
    : `Epoch ${epochNumber ?? "--"}`;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const checkOverflow = () => {
      const isOverflowing = el.scrollWidth - 1 > el.clientWidth;
      setUseShortLabel(isOverflowing);
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [timeText, epochNumber]);

  return (
    <div
      ref={containerRef}
      className="flex min-w-0 items-center gap-1 rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs"
      aria-label={`Epoch ${epochNumber ?? "--"} ${timeText}`}
    >
      <span className="truncate text-neutral-500">{epochLabel}</span>
      <span aria-hidden className="text-neutral-300">
        &#183;
      </span>
      <span className="font-number font-bold text-neutral-900 whitespace-nowrap">
        {timeText}
      </span>
    </div>
  );
}
