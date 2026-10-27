"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Tooltip } from "./Tooltip";
import { cn } from "@/lib/cn";

type VoteSegmentKind = "yea" | "nay" | "ybc-yea" | "ybc-nay";

const SEGMENT_COLORS: Record<VoteSegmentKind, string> = {
  yea: "bg-yearn-blue dark:bg-blue-400",
  "ybc-yea": "bg-blue-800 dark:bg-blue-200",
  "ybc-nay": "bg-neutral-800 dark:bg-neutral-300",
  nay: "bg-neutral-500",
};
const YBC_PATTERN = "bg-[repeating-linear-gradient(135deg,transparent,transparent_3px,rgba(255,255,255,0.45)_3px,rgba(255,255,255,0.45)_5px)] dark:bg-[repeating-linear-gradient(135deg,transparent,transparent_3px,rgba(0,0,0,0.35)_3px,rgba(0,0,0,0.35)_5px)]";

export function voteSegmentClassName(kind: VoteSegmentKind) {
  return cn(SEGMENT_COLORS[kind], kind.startsWith("ybc-") && YBC_PATTERN);
}

type VoteResultsBarProps = HTMLAttributes<HTMLDivElement> & {
  segments: { kind: VoteSegmentKind; widthPercent: number; tooltip?: ReactNode }[];
  thresholdPercent?: number;
};

// Domain clients supply the percentages. Accessible totals stay beside this
// decorative bar; optional tooltips must repeat, not replace, visible facts.
export function VoteResultsBar({ segments, thresholdPercent, className, ...props }: VoteResultsBarProps) {
  const visible = segments.filter((segment) => segment.widthPercent > 0);
  return (
    <div aria-hidden="true" className={cn("relative flex h-3 w-full rounded-full bg-neutral-200 dark:bg-neutral-800", className)} {...props}>
      {visible.map((segment, index) => {
        const center = visible.slice(0, index).reduce((sum, part) => sum + part.widthPercent, 0) + segment.widthPercent / 2;
        const fill = <span className={cn("block h-full w-full", voteSegmentClassName(segment.kind), index === 0 && "rounded-l-full", index === visible.length - 1 && "rounded-r-full")} />;
        return (
          <span key={segment.kind} data-vote-segment={segment.kind} className="h-full" style={{ width: `${segment.widthPercent}%` }}>
            {segment.tooltip ? <Tooltip className="h-full w-full align-top" align={center < 33 ? "start" : center > 67 ? "end" : "center"} content={segment.tooltip}>{fill}</Tooltip> : fill}
          </span>
        );
      })}
      {thresholdPercent !== undefined ? <span className="pointer-events-none absolute -top-0.5 h-[calc(100%+4px)] w-0.5 -translate-x-1/2 bg-text-primary" style={{ left: `${Math.min(100, Math.max(0, thresholdPercent))}%` }} /> : null}
    </div>
  );
}
