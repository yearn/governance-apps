"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface RadioOption<T extends string> {
  value: T;
  label: string;
}

interface RadioGroupProps<T extends string> {
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  name?: string;
  className?: string;
}

export function RadioGroup<T extends string>({
  options,
  value,
  onChange,
  name,
  className,
}: RadioGroupProps<T>) {
  return (
    <div className={cn("flex gap-4", className)}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <label
            key={option.value}
            className="group flex min-h-10 cursor-pointer select-none items-center gap-2"
          >
            <div className="relative flex h-5 w-5 items-center justify-center">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="peer h-5 w-5 cursor-pointer appearance-none rounded-full border border-border transition-colors checked:border-disco-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app"
              />
              <div
                className={cn(
                  "pointer-events-none absolute h-2.5 w-2.5 scale-0 rounded-full bg-disco-600 transition-transform duration-200 ease-out peer-checked:scale-100"
                )}
              />
            </div>
            <span
              className={cn(
                "text-sm font-bold transition-colors",
                isSelected
                  ? "text-text-primary"
                  : "text-text-secondary group-hover:text-text-primary"
              )}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );
}
