"use client";

import Link from "next/link";
import { Banner } from "@/components/ui/Banner";
import { getButtonClassName } from "@/components/ui/Button";
import { IconClose } from "@/components/icons/IconClose";
import { IconLinkOut } from "@/components/icons/IconLinkOut";
import { IconStar } from "@/components/icons/IconStar";
import { cn } from "@/lib/cn";
import type { CrossAppNudge as CrossAppNudgeData } from "@/lib/hooks/useCrossChainNudge";

type CrossAppNudgeProps = {
  nudge: CrossAppNudgeData | null;
  onDismiss: (nudgeId: string) => void;
  className?: string;
};

export function CrossAppNudge({
  nudge,
  onDismiss,
  className,
}: CrossAppNudgeProps) {
  const isOpen = !!nudge;

  return (
    <div
      className={cn(
        "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300",
        isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        className
      )}
    >
      <div className="overflow-hidden">
        {nudge && (
          <Banner
            variant="brand"
            className="relative animate-in slide-in-from-top-2 duration-500 pr-12"
          >
            <button
              type="button"
              aria-label="Dismiss nudge"
              onClick={() => onDismiss(nudge.id)}
              className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-md text-sky-700 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
            >
              <IconClose className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3">
              <IconStar className="h-5 w-5 shrink-0 text-sky-600 mt-0.5" />
              <div className="space-y-2">
                <div className="space-y-0.5">
                  <p className="font-bold">{nudge.title}</p>
                  <p>{nudge.body}</p>
                </div>

                <Link
                  href={nudge.href}
                  className={getButtonClassName({
                    variant: "secondary",
                    size: "sm",
                    className: "border-sky-300 bg-white/80 hover:bg-white",
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {nudge.ctaLabel}
                    <IconLinkOut className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </Link>
              </div>
            </div>
          </Banner>
        )}
      </div>
    </div>
  );
}
