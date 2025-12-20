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
            className="flex items-center gap-2 cursor-pointer group select-none"
          >
            <div className="relative flex items-center justify-center w-4 h-4">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="peer appearance-none w-4 h-4 rounded-full border border-neutral-300 checked:border-disco-600 transition-colors cursor-pointer"
              />
              <div
                className={cn(
                  "absolute w-2 h-2 rounded-full bg-disco-600 pointer-events-none transition-transform duration-200 ease-out scale-0 peer-checked:scale-100"
                )}
              />
            </div>
            <span
              className={cn(
                "text-sm font-bold transition-colors",
                isSelected
                  ? "text-neutral-900"
                  : "text-neutral-500 group-hover:text-neutral-700"
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
