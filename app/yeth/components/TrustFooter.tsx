import type { ReactNode } from "react";
import { IconChevron } from "@/components/icons/IconChevron";
import { ContractLink } from "@/components/ui/ContractLink";
import { formatTokenAmount } from "@/lib/format";
import type { YethGlobalState } from "@/lib/clients/yeth";

export function TrustFooter({ global }: { global: YethGlobalState }) {
  return (
    <details className="group w-full max-w-2xl mx-auto mt-12 border-t border-neutral-200">
      <summary className="flex items-center justify-center gap-2 w-full py-4 rounded-md text-sm font-medium text-neutral-500 hover:text-tokyo-600 hover:bg-surface-secondary/60 cursor-pointer list-none transition-colors select-none">
        <span>View Contracts, Risks & Sources</span>
        <IconChevron className="w-4 h-4 transition-transform group-open:rotate-180" />
      </summary>

      <div className="pb-8 space-y-6 text-sm text-text-secondary animate-in slide-in-from-top-2">
        <section className="space-y-2">
          <h3 className="font-bold text-text-primary">Contracts</h3>
          <ul className="w-full space-y-2 text-sm text-text-secondary">
            <li className="flex items-center justify-between gap-4">
              <span>Claim Contract</span>
              <ContractLink address={global.contracts.claimContract} />
            </li>
            <li className="flex items-center justify-between gap-4">
              <span>Recovery Vault</span>
              <ContractLink address={global.contracts.recoveryVault} />
            </li>
            <li className="flex items-center justify-between gap-4">
              <span>Yield Vault</span>
              <ContractLink address={global.contracts.yieldVault} />
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-text-primary">Vault Metrics</h3>
          <FlatList
            items={[
              `TVL: ${formatTokenAmount(global.yieldVault.tvlEth, 18, 4)} ETH`,
              `PPS: ${formatTokenAmount(global.recoveryVault.pps, 18, 4)} ETH/share`,
              `Performance fee: ${(global.yieldVault.performanceFeeBps / 100).toFixed(0)}%`,
            ]}
          />
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-text-primary">Yield Sources</h3>
          <FlatList items={global.yieldSources} />
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-text-primary">Risk Disclosures</h3>
          <FlatList items={global.risks} />
          <p className="text-text-secondary">
            There is no recovery of the recovery. Staying in the Recovery Vault
            means ongoing smart-contract and strategy risk.
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold text-text-primary">Manual Late Claim</h3>
          <a
            href={global.manualLateClaimUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex underline underline-offset-4"
          >
            Open manual settlement instructions
          </a>
        </section>
      </div>
    </details>
  );
}

function FlatList({ items }: { items: readonly ReactNode[] }) {
  return (
    <ul className="space-y-1 text-text-secondary list-disc pl-4">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
