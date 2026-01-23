import * as React from "react";
import { cn } from "@/lib/cn";

export interface StatItem {
  label: string;
  value: string;
}

interface StatsBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: StatItem[];
}

export function StatsBar({ items, className, ...props }: StatsBarProps) {
  return (
    <div
      className={cn(
        "w-full border-b border-border bg-app py-2",
        className
      )}
      {...props}
    >
      <div className="container mx-auto px-4 md:px-6 flex flex-wrap gap-x-8 gap-y-2 items-center justify-center sm:justify-start">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span className="font-bold uppercase tracking-wide text-text-tertiary">
              {item.label}:
            </span>
            <span className="font-number font-bold text-text-primary">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
