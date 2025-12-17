import * as React from "react";
import { cn } from "@/lib/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "neutral" | "success" | "warning" | "error" | "brand";
}

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  const variants = {
    neutral: "bg-neutral-100 text-neutral-900",
    success: "bg-green-100 text-green-900",
    warning: "bg-amber-100 text-amber-900",
    error: "bg-red-100 text-red-900",
    brand: "bg-yearn-blue/10 text-yearn-blue",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-bold font-number transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
