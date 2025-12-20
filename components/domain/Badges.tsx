import * as React from "react";
import { cn } from "@/lib/cn";

export function StreamingBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("flex items-center justify-center shrink-0", className)}
      title="Unstake in progress"
    >
      <span className="block h-2.5 w-2.5 rounded-full border-2 border-current bg-transparent" />
      <span className="sr-only">Unstake in progress</span>
    </span>
  );
}

export function ReadyBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn("flex items-center justify-center shrink-0", className)}
      title="Unstake ready"
    >
      <span className="block h-2.5 w-2.5 rounded-full bg-current" />
      <span className="sr-only">Unstake ready</span>
    </span>
  );
}
