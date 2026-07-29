import { IconAlertWarning } from "@/components/icons/ToastIcons";
import { AddressLink } from "@/components/ui/ExplorerLink";
import { Tooltip } from "@/components/ui/Tooltip";
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
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <AddressLink address={owner} variant="compact" />

      {pendingOwner ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-1 rounded-md bg-amber-50 pr-2 text-left text-xs font-medium text-amber-950">
          <Tooltip
            align="start"
            side="bottom"
            content={
              <span className="block max-w-64 text-pretty">
                {teamsCopy.workspace.ownership.pendingTransferHelp}
              </span>
            }
          >
            <button
              type="button"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-amber-700 transition-[background-color,color] duration-150 ease-out hover:bg-amber-100 hover:text-amber-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              aria-label={`${teamsCopy.workspace.ownership.pendingTransfer} ${pendingOwner}`}
            >
              <IconAlertWarning className="size-4" aria-hidden="true" />
            </button>
          </Tooltip>
          <span>{teamsCopy.workspace.ownership.pendingTransfer}</span>
          <span className="min-w-0 [&_a]:text-amber-950 [&_code]:text-amber-950">
            <AddressLink
              address={pendingOwner}
              variant="compact"
            />
          </span>
        </div>
      ) : null}
    </div>
  );
}
