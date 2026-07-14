"use client";

import Link from "next/link";
import { Banner } from "@/components/ui/Banner";
import { getButtonClassName } from "@/components/ui/Button";
import { IconLinkOut } from "@/components/icons/IconLinkOut";
import {
  getStyfiSnapshotProposalUrl,
  STYFI_SNAPSHOT_SPACE_URL,
  type StyfiSnapshotProposal,
} from "@/lib/clients/styfi/snapshot";
import { styfiCopy as copy } from "../messages";

type GovernanceBannerProps = {
  proposals: StyfiSnapshotProposal[];
};

const CLOSE_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

export function GovernanceBanner({ proposals }: GovernanceBannerProps) {
  if (proposals.length === 0) return null;

  const firstProposal = proposals[0];
  const hasMultipleProposals = proposals.length > 1;
  const title = hasMultipleProposals
    ? copy.governance.multipleTitle(proposals.length)
    : firstProposal.title;
  const href = hasMultipleProposals
    ? STYFI_SNAPSHOT_SPACE_URL
    : getStyfiSnapshotProposalUrl(firstProposal.id);
  const closeDate = new Date(firstProposal.end * 1000);

  return (
    <Banner variant="brand" className="animate-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full bg-sky-600"
              aria-hidden
            />
            <p className="text-xs font-bold uppercase tracking-wide text-sky-800">
              {copy.governance.activeLabel}
            </p>
          </div>
          <p className="break-words text-balance text-base font-bold text-sky-950">
            {title}
          </p>
          <p className="text-pretty text-sm text-sky-900">
            {hasMultipleProposals
              ? copy.governance.multipleBody
              : copy.governance.singleBody}{" "}
            {hasMultipleProposals
              ? copy.governance.multipleClosesLabel
              : copy.governance.singleClosesLabel}{" "}
            <time dateTime={closeDate.toISOString()} className="font-medium">
              {CLOSE_DATE_FORMATTER.format(closeDate)}
            </time>
            .
          </p>
        </div>

        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={getButtonClassName({
            variant: "secondary",
            size: "sm",
            className:
              "w-full shrink-0 border-sky-300 bg-white/90 text-sky-950 hover:bg-white focus:ring-sky-600 focus:ring-offset-sky-100 sm:w-auto",
          })}
        >
          <span className="inline-flex items-center gap-1.5">
            {copy.governance.ctaLabel}
            <IconLinkOut className="size-3.5" aria-hidden />
          </span>
        </Link>
      </div>
    </Banner>
  );
}
