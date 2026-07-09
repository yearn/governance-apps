"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
};

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const closeTimeoutRef = React.useRef<number | null>(null);

  const clearCloseTimeout = React.useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const showTooltip = React.useCallback(() => {
    clearCloseTimeout();
    setOpen(true);
  }, [clearCloseTimeout]);

  const scheduleHideTooltip = React.useCallback(() => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimeoutRef.current = null;
    }, 100);
  }, [clearCloseTimeout]);

  React.useEffect(() => {
    return () => {
      clearCloseTimeout();
    };
  }, [clearCloseTimeout]);

  // Position logic:
  // - "bottom-full" anchors the bottom of the tooltip to the top of the trigger.
  // - "mb-2" adds a gap so it doesn't touch.
  // - "left-1/2 -translate-x-1/2" centers it horizontally.
  const sideClasses =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 mb-2"
      : side === "bottom"
      ? "top-full left-1/2 -translate-x-1/2 mt-2"
      : side === "left"
      ? "right-full top-1/2 -translate-y-1/2 mr-2"
      : "left-full top-1/2 -translate-y-1/2 ml-2";

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={showTooltip}
      onMouseLeave={scheduleHideTooltip}
      onFocus={showTooltip}
      onBlur={scheduleHideTooltip}
    >
      {children}
      <span
        role="tooltip"
        onMouseEnter={showTooltip}
        onMouseLeave={scheduleHideTooltip}
        className={cn(
          // Layout
          "absolute z-50 w-max max-w-[280px]", // Increased max-width for tables
          sideClasses,

          // Visuals (Pop-over Card style)
          "rounded-md border border-border bg-surface p-3 shadow-xl", // Increased padding/shadow

          // Typography
          "text-xs font-normal text-text-secondary leading-relaxed",

          // Animation
          "origin-center transition-[opacity,scale,visibility] duration-200 ease-out",
          open
            ? "pointer-events-auto opacity-100 scale-100 visible"
            : "pointer-events-none opacity-0 scale-95 invisible"
        )}
      >
        {content}
      </span>
    </span>
  );
}
