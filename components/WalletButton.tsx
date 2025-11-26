"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/Button";
import { IconWallet } from "@/components/icons/IconWallet";
import { IconChevron } from "@/components/icons/IconChevron";

export function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return (
            <Button variant="primary" size="sm" isLoading>
              Connect
            </Button>
          );
        }

        if (!connected) {
          return (
            <Button onClick={openConnectModal} variant="primary" size="sm">
              <IconWallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          );
        }

        if (chain.unsupported) {
          return (
            <Button
              onClick={openChainModal}
              variant="secondary"
              size="sm"
              className="text-red-500 border-red-500"
            >
              Wrong Network
            </Button>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <Button
              onClick={openChainModal}
              variant="ghost"
              size="sm"
              className="hidden sm:flex"
            >
              {chain.hasIcon && (
                <div
                  style={{ background: chain.iconBackground }}
                  className="w-5 h-5 rounded-full overflow-hidden mr-2"
                >
                  {chain.iconUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={chain.name ?? "Chain icon"}
                      src={chain.iconUrl}
                      className="w-5 h-5"
                    />
                  )}
                </div>
              )}
              {chain.name}
            </Button>

            <Button onClick={openAccountModal} variant="secondary" size="sm">
              {account.displayName}
              <IconChevron className="ml-2 h-4 w-4 text-neutral-400" />
            </Button>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
