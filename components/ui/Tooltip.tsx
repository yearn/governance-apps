"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type TooltipProps = {
  content: string;
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

  const sideClasses =
    side === "top"
      ? "bottom-full left-1/2 -translate-x-1/2 -mb-2"
      : side === "bottom"
      ? "top-full left-1/2 -translate-x-1/2 mt-2"
      : side === "left"
      ? "right-full top-1/2 -translate-y-1/2 -mr-2"
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
          "pointer-events-none absolute z-40 whitespace-nowrap rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150",
          open && "opacity-100",
          sideClasses
        )}
      >
        {content}
      </span>
    </span>
  );
}
