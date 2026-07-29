import { IconChevron } from "@/components/icons/IconChevron";
import { AddressLink } from "@/components/ui/ExplorerLink";
import { cn } from "@/lib/cn";
import { teamsCopy } from "../messages";

type TeamOwnershipProps = {
  owner: string;
  pendingOwner: string | null;
  className?: string;
};

export function TeamOwnership({
  owner,
  pendingOwner,
  className,
}: TeamOwnershipProps) {
  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <AddressLink address={owner} variant="compact" />

      {pendingOwner ? (
        <details
          open
          className="group/transfer min-w-0 rounded-lg border border-amber-300 bg-amber-50 text-left"
        >
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold text-amber-950 transition-[background-color] duration-150 ease-out hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 [&::-webkit-details-marker]:hidden">
            <span>{teamsCopy.workspace.ownership.pendingTransfer}</span>
            <IconChevron
              className="size-4 shrink-0 transition-transform duration-150 ease-out group-open/transfer:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="min-w-0 border-t border-amber-200 px-3 py-2.5">
            <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-amber-800">
              {teamsCopy.workspace.fields.pendingOwner}
            </p>
            <AddressLink
              address={pendingOwner}
              variant="compact"
              className="mt-1"
            />
          </div>
        </details>
      ) : null}
    </div>
  );
}
