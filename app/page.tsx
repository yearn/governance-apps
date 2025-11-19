// app/page.tsx
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-6">
      <div>
        <ConnectButton />
      </div>

      <h1 className="text-3xl font-semibold">Yearn Governance Apps</h1>

      <p className="text-sm text-slate-300 text-center max-w-md">
        This repo will host the stYFI and veYFI frontends (and later governance
        and dashboards). For now, choose a section:
      </p>

      <div className="flex gap-4">
        <Link
          href="/styfi"
          className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
        >
          stYFI (styfi.yearn.fi)
        </Link>
        <Link
          href="/veyfi"
          className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
        >
          veYFI / LLYFI (veyfi.yearn.fi)
        </Link>
      </div>
    </main>
  );
}
