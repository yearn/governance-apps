"use client";
import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui/Tooltip";

export function YbcHelp({ label, children, align = "start" }: { label: string; children: ReactNode; align?: "start" | "center" | "end" }) {
  return <Tooltip content={children} side="bottom" align={align} className="[&>[role=tooltip]]:max-w-[min(240px,calc(100vw-2rem))] lg:[&>[role=tooltip]]:max-w-[min(280px,calc(100vw-2rem))]">
    <button type="button" onClick={event => event.currentTarget.focus()} onKeyDown={event => { if (event.key === "Escape") event.currentTarget.blur(); }} aria-label={`About ${label}`} className="inline-flex min-h-10 items-center gap-1.5 rounded text-left text-xs font-medium text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary">
      <span className="cursor-help underline decoration-dotted decoration-text-tertiary underline-offset-4">{label}</span>
    </button>
  </Tooltip>;
}
