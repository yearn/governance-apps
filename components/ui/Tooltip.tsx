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
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <span
        role="tooltip"
        className={cn(
          // Layout
          "pointer-events-none absolute z-50 w-max max-w-[280px]", // Increased max-width for tables
          sideClasses,

          // Visuals (Pop-over Card style)
          "rounded-md border border-neutral-200 bg-white p-3 shadow-xl", // Increased padding/shadow

          // Typography
          "text-xs font-normal text-neutral-600 leading-relaxed",

          // Animation
          "transition-all duration-200 ease-out origin-center",
          open
            ? "opacity-100 scale-100 visible"
            : "opacity-0 scale-95 invisible"
        )}
      >
        {content}
      </span>
    </span>
  );
}
