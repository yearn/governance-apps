"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/cn";
import { formatAddress } from "@/lib/format";

export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        // 1. Loading State
        if (!ready) {
          return (
            <div className="h-9 w-24 animate-pulse rounded-full bg-surface-secondary" />
          );
        }

        // 2. Disconnected State
        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              className="relative hidden h-8 cursor-pointer items-center justify-center rounded-xl border border-transparent bg-text-primary px-3 text-xs font-normal text-surface transition-all hover:opacity-90 md:flex"
            >
              Connect wallet
            </button>
          );
        }

        // 3. Wrong Network State
        if (chain.unsupported) {
          return (
            <button
              onClick={openConnectModal}
              className="flex h-9 items-center rounded-full bg-red-100 px-4 text-xs font-bold text-red-600 transition-colors hover:bg-red-200"
            >
              Wrong Network
            </button>
          );
        }

        // 4. Connected State
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={openAccountModal}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg bg-surface-secondary font-medium text-text-secondary text-sm px-3 py-1.5 hover:text-text-primary transition-colors",
              )}
            >
              {/* Prioritize ENS, fallback to 0x1234...5678 */}
              <span>{account.ensName ?? formatAddress(account.address)}</span>
            </button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
