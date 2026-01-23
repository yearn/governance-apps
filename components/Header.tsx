"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLauncher } from "@/components/AppLauncher";
import { WalletButton } from "@/components/WalletButton";
import { cn } from "@/lib/cn";
import { appCopy } from "@/app/_shared/messages";
import { useIdentity } from "@/state/identity";
import { useEffect, useMemo, useState } from "react";
import { nowSeconds } from "@/lib/mocks/time";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Header() {
  const pathname = usePathname();
  const { epoch } = useIdentity();

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
          <div className="hidden h-6 w-px bg-border md:block" />
          <nav className="hidden gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-semibold transition-colors",
                  item.variant === "primary"
                    ? "text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {epoch && <EpochCountdownBadge epoch={epoch} />}
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function EpochCountdownBadge({
  epoch,
}: {
  epoch: { currentEpoch: number; epochEnd: number };
}) {
  const [rem, setRem] = useState(0);
  useEffect(() => {
    const tick = () => setRem(Math.max(0, epoch.epochEnd - nowSeconds()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [epoch]);

  const d = Math.floor(rem / 86400);
  const h = Math.floor((rem % 86400) / 3600);

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-xs font-bold">
      <span className="text-text-secondary">Epoch {epoch.currentEpoch}</span>
      <span className="text-text-tertiary">&#183;</span>
      <span>
        {d}d {h}h left
      </span>
    </div>
  );
}
