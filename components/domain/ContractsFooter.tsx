import { IconChevron } from "@/components/icons/IconChevron";
import { ContractLink } from "@/components/ui/ContractLink";

type ContractItem = {
  label: string;
  address: string;
};

export function ContractsFooter({ contracts }: { contracts: ContractItem[] }) {
  return (
    <details className="group mx-auto mt-12 w-full max-w-2xl border-t border-border">
      <summary className="flex w-full cursor-pointer list-none items-center justify-center gap-2 rounded-md py-4 text-sm font-medium text-text-secondary transition-colors select-none hover:bg-surface-secondary/60 hover:text-text-primary">
        <span>Contracts</span>
        <IconChevron className="h-4 w-4 transition-transform group-open:rotate-180" />
      </summary>

      <div className="animate-in slide-in-from-top-2 pb-8">
        <ul className="mx-auto max-w-sm space-y-2 text-sm text-text-secondary">
          {contracts.map((contract) => (
            <li
              key={contract.label}
              className="flex items-center justify-between gap-4"
            >
              <span>{contract.label}</span>
              <ContractLink address={contract.address} />
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
