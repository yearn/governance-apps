"use client";

import { useRef, useState } from "react";
import { TypeMarkYearn } from "@/components/icons/TypeMarkYearn";
import { IconChevron } from "@/components/icons/IconChevron";
import { LauncherDropdown } from "@/components/launcher/LauncherDropdown";
import { cn } from "@/lib/cn";

export function AppLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseDown={(event) => event.stopPropagation()}
        className="flex items-center gap-2 transition-colors hover:opacity-80"
        aria-label="Open Yearn apps"
      >
        <TypeMarkYearn
          className="h-8 w-auto text-yearn-blue dark:text-text-primary"
          color="currentColor"
        />
        <IconChevron
          className={cn(
            "h-4 w-4 text-text-tertiary transition-transform",
            isOpen ? "rotate-180" : ""
          )}
        />
      </button>

      <LauncherDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
