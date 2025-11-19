// app/veyfi/page.tsx
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

export default function VeyfiPage() {
  const { address, isConnected } = useAccount();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4">
      <div>
        <ConnectButton />
      </div>

      <h1 className="text-3xl font-semibold">veyfi.yearn.fi (stub)</h1>

      <p className="text-sm text-slate-300 max-w-md text-center">
        This will become the veYFI migration, LLYFI staking, and redemption
        interface.
      </p>

      {isConnected ? (
        <p className="text-xs text-slate-400">
          Connected as <span className="font-mono">{address}</span>
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Connect your wallet to see your legacy positions.
        </p>
      )}
    </main>
  );
}
