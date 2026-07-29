"use client";

import { AddressLink } from "@/components/ui/ExplorerLink";

type ContractLinkProps = {
  address: string;
  className?: string;
};

export function ContractLink({ address, className }: ContractLinkProps) {
  return (
    <AddressLink
      address={address}
      className={className}
      copyLabel="Copy contract address"
      variant="contract"
    />
  );
}
