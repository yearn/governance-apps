"use client";

import { useEffect, useState } from "react";
import {
  useAccountModal,
  useChainModal,
  useConnectModal,
} from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { cn } from "@/lib/cn";
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

  if (!mounted) {
    return <div className="h-9 w-24 animate-pulse rounded-full bg-surface-secondary" />;
  }

  if (!isConnected || !address) {
    return (
      <button
        onClick={() => openConnectModal?.()}
        className="relative hidden h-8 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-text-primary px-3 text-xs font-normal text-surface transition-all hover:opacity-90 md:flex"
      >
        Connect wallet
      </button>
    );
  }

  const isWrongNetwork = !!chainId && chainId !== MAINNET_CHAIN_ID;

  if (isWrongNetwork) {
    return (
      <button
        onClick={() => (openChainModal ?? openConnectModal)?.()}
        className="flex h-9 items-center rounded-full bg-red-100 px-4 text-xs font-bold text-red-600 transition-colors hover:bg-red-200"
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
          "inline-flex items-center gap-2 rounded-lg bg-surface-secondary font-medium text-text-secondary text-sm px-3 py-1.5 hover:text-text-primary transition-colors",
        )}
      >
        <span>{formatAddress(address)}</span>
      </button>
    </div>
  );
}
