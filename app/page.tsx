// app/page.tsx
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { homeCopy as copy } from "./messages";
import { isYethEnabled } from "@/lib/runtime/features";

export default function Home() {
  const showYeth = isYethEnabled();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-6">
      <div>
        <ConnectButton showBalance={false} />
      </div>

      <h1 className="text-3xl font-semibold">{copy.page.title}</h1>

      <p className="text-sm text-slate-300 text-center max-w-md">
        {copy.page.description}
      </p>

      <div className={`grid gap-3 ${showYeth ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
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
        {showYeth && (
          <Link
            href={copy.cta.yeth.href}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            {copy.cta.yeth.label}
          </Link>
        )}
      </div>
    </main>
  );
}
