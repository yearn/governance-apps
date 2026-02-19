"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
  max?: number;
  variant?: "default" | "success" | "warning" | "styfi" | "veyfi" | "yeth";
}

export function ProgressBar({
  value,
  max = 100,
  className,
  variant = "default",
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    default: "bg-yearn-blue",
    success: "bg-green-500",
    warning: "bg-orange-500",
    styfi: "bg-sunset-600",
    veyfi: "bg-disco-700",
    yeth: "bg-tokyo-600",
  };

  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-neutral-200",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full transition-all duration-500 ease-in-out",
          colors[variant]
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
