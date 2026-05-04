"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export type ViewToggleValue = "visual" | "audit";

export type ViewToggleOption<TValue extends string = ViewToggleValue> = {
  value: TValue;
  label: string;
  description?: string;
  icon?: React.ReactNode;
};

type ViewToggleProps<TValue extends string = ViewToggleValue> = {
  value: TValue;
  onChange: (value: TValue) => void;
  options?: ReadonlyArray<ViewToggleOption<TValue>>;
  "aria-label": string;
  className?: string;
};

const DEFAULT_VIEW_TOGGLE_OPTIONS: ReadonlyArray<ViewToggleOption<ViewToggleValue>> = [
  {
    value: "visual",
    label: "Visual",
    description: "Card view",
    icon: <VisualIcon />,
  },
  {
    value: "audit",
    label: "Audit",
    description: "Table view",
    icon: <AuditIcon />,
  },
];

export function ViewToggle<TValue extends string = ViewToggleValue>({
  value,
  onChange,
  options = DEFAULT_VIEW_TOGGLE_OPTIONS as ReadonlyArray<ViewToggleOption<TValue>>,
  "aria-label": ariaLabel,
  className,
}: ViewToggleProps<TValue>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-lg bg-surface-secondary/70 p-1",
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex min-h-9 min-w-[6.75rem] items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-2 focus:ring-offset-app",
              isActive
                ? "bg-surface text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <span className="shrink-0" aria-hidden="true">
              {option.icon ?? <DefaultOptionIcon />}
            </span>
            <span>{option.label}</span>
            {option.description ? (
              <span className="sr-only">, {option.description}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function VisualIcon() {
  return (
    <span className="grid size-4 grid-cols-2 gap-0.5">
      <span className="rounded-[2px] bg-current" />
      <span className="rounded-[2px] bg-current opacity-60" />
      <span className="rounded-[2px] bg-current opacity-60" />
      <span className="rounded-[2px] bg-current" />
    </span>
  );
}

function AuditIcon() {
  return (
    <span className="grid size-4 gap-0.5">
      <span className="h-0.5 rounded-full bg-current" />
      <span className="h-0.5 rounded-full bg-current opacity-70" />
      <span className="h-0.5 rounded-full bg-current opacity-70" />
      <span className="h-0.5 rounded-full bg-current" />
    </span>
  );
}

function DefaultOptionIcon() {
  return <span className="block size-2 rounded-full bg-current" />;
}
