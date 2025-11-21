"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppLauncher } from "@/components/AppLauncher";
import { WalletButton } from "@/components/WalletButton";
import { cn } from "@/lib/cn";
import { IconMenu } from "@/components/icons/IconMenu";
import { IconClose } from "@/components/icons/IconClose";
import { useState } from "react";

const NAV_ITEMS = [
  { name: "stYFI", href: "/styfi" },
  { name: "veYFI", href: "/veyfi" },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-neutral-100/80 backdrop-blur-md">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 md:px-6">
        {/* Left: Launcher & Logo */}
        <div className="flex items-center gap-4">
          <AppLauncher />
          <div className="hidden h-6 w-px bg-neutral-300 md:block" />

          {/* Desktop Nav */}
          <nav className="hidden gap-6 md:flex">
            {NAV_ITEMS.map((item) => {
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
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Wallet & Mobile Toggle */}
        <div className="flex items-center gap-4">
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
            {NAV_ITEMS.map((item) => (
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
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
