import * as React from "react";
import { cn } from "@/lib/cn";

const PLACEHOLDER_COLORS = [
  "bg-sky-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-indigo-600",
];

function pickColorSeed(label: string) {
  return label
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

type IconPlaceholderTokenProps = {
  letters: string;
  className?: string;
};

export function IconPlaceholderToken({
  letters,
  className,
}: IconPlaceholderTokenProps) {
  const normalized = letters.trim().slice(0, 2).toUpperCase() || "??";
  const color =
    PLACEHOLDER_COLORS[pickColorSeed(normalized) % PLACEHOLDER_COLORS.length];

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full font-sans text-[11px] font-bold uppercase tracking-wide text-white",
        color,
        className
      )}
    >
      {normalized}
    </span>
  );
}
