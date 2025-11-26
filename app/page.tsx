// app/page.tsx
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { homeCopy as copy } from "./messages";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-6">
      <div>
        <ConnectButton />
      </div>

      <h1 className="text-3xl font-semibold">{copy.page.title}</h1>

      <p className="text-sm text-slate-300 text-center max-w-md">
        {copy.page.description}
      </p>

      <div className="flex gap-4">
        <Link
          href={copy.cta.styfi.href}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
        >
          {copy.cta.styfi.label}
        </Link>
        <Link
          href={copy.cta.veyfi.href}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
        >
          {copy.cta.veyfi.label}
        </Link>
      </div>
    </main>
  );
}
