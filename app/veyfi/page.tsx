// app/veyfi/page.tsx
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { veyfiCopy as copy } from "./messages";

export default function VeyfiPage() {
  const { address, isConnected } = useAccount();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4">
      <div>
        <ConnectButton />
      </div>

      <h1 className="text-3xl font-semibold">{copy.page.title}</h1>

      <p className="text-sm text-slate-300 max-w-md text-center">
        {copy.page.description}
      </p>

      {isConnected ? (
        <p className="text-xs text-slate-400">
          {copy.page.connectedLabel}{" "}
          <span className="font-mono">{address}</span>
        </p>
      ) : (
        <p className="text-xs text-slate-500">{copy.page.disconnected}</p>
      )}
    </main>
  );
}
