"use client";

import { useEffect, useState } from "react";
import {
  useAccountModal,
  useChainModal,
  useConnectModal,
} from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { cn } from "@/lib/cn";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";
import { formatAddress } from "@/lib/format";
import { MAINNET_CHAIN_ID } from "@/lib/tx/network";

export function WalletButton() {
  const { address, chainId, isConnected } = useAccount();
  const { openAccountModal } = useAccountModal();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const usesE2EFallback =
    process.env.NEXT_PUBLIC_E2E === "true" && address === undefined;
  const effectiveAddress =
    address ?? (usesE2EFallback ? E2E_MOCK_ADDRESS : undefined);
  const hasConnectedAccount = isConnected || usesE2EFallback;

  if (!mounted) {
    return <div className="h-9 w-24 animate-pulse rounded-full bg-surface-secondary" />;
  }

  if (!hasConnectedAccount || !effectiveAddress) {
    return (
      <button
        onClick={() => openConnectModal?.()}
        className="relative hidden h-10 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-text-primary px-3 text-xs font-normal text-surface transition-[opacity] hover:opacity-90 md:flex"
      >
        Connect wallet
      </button>
    );
  }

  const isWrongNetwork =
    !usesE2EFallback && !!chainId && chainId !== MAINNET_CHAIN_ID;

  if (isWrongNetwork) {
    return (
      <button
        onClick={() => (openChainModal ?? openConnectModal)?.()}
        className="flex h-10 items-center rounded-full bg-red-100 px-4 text-xs font-bold text-red-600 transition-colors hover:bg-red-200"
      >
        Wrong Network
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => openAccountModal?.()}
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-lg bg-surface-secondary px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary",
        )}
      >
        <span>{formatAddress(effectiveAddress)}</span>
      </button>
    </div>
  );
}
