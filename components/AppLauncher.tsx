"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoYearn } from "@/components/icons/LogoYearn";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { cn } from "@/lib/cn";

const APPS = [
  { name: "v3 Vaults", href: "https://yearn.fi/v3" },
  { name: "v2 Vaults", href: "https://yearn.fi/vaults" },
  { name: "yCRV", href: "https://ycrv.yearn.fi" },
  { name: "yETH", href: "https://yeth.yearn.fi" },
  { name: "veYFI", href: "https://veyfi.yearn.fi" },
  { name: "Juiced", href: "https://juiced.yearn.fi" },
];

export function AppLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setIsOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-neutral-200 transition-colors"
      >
        <LogoYearn className="w-8 h-8 text-yearn-blue" />
      </button>

      {/* Dropdown */}
      <div
        className={cn(
          "absolute top-12 left-0 w-[280px] p-4 bg-white border border-neutral-300 rounded-box shadow-lg transition-all duration-200 origin-top-left z-50",
          isOpen
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        )}
      >
        <div className="grid grid-cols-2 gap-2">
          {APPS.map((app) => (
            <Link
              key={app.name}
              href={app.href}
              target="_blank"
              className="flex flex-col items-center justify-center p-4 rounded-md hover:bg-neutral-100 transition-colors text-center"
            >
              <span className="text-sm font-bold text-neutral-900">
                {app.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
