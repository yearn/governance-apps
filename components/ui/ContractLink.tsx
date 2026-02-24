import { formatAddress } from "@/lib/format";
import { IconLinkOut } from "@/components/icons/IconLinkOut";
import { cn } from "@/lib/cn";

type ContractLinkProps = {
  address: string;
  className?: string;
};

export function ContractLink({ address, className }: ContractLinkProps) {
  return (
    <a
      href={`https://etherscan.io/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-1.5 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary",
        className,
      )}
      title="View on Etherscan"
    >
      <code className="rounded border border-border bg-surface-secondary px-1.5 py-0.5 font-number text-[11px] font-medium tracking-wide text-text-secondary transition-colors group-hover:border-text-tertiary group-hover:text-text-primary">
        {formatAddress(address)}
      </code>
      <IconLinkOut
        className="size-3 -ml-0.5 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden="true"
      />
    </a>
  );
}
