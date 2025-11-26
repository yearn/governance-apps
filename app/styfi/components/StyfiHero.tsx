"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { modeLabel, StyfiMode } from "./types";

type Props = {
  onSelectMode: (mode: StyfiMode) => void;
};

export function StyfiHero({ onSelectMode }: Props) {
  return (
    <main className="container mx-auto flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="space-y-3 text-center max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          Choose your path
        </p>
        <h1 className="text-4xl font-bold text-neutral-900">
          Stake with stYFI or stYFIx
        </h1>
        <p className="text-neutral-600 text-lg">
          stYFI earns standard rewards with a fixed cooldown. stYFIx gives you
          boosted exposure with shares-based accounting. Pick a mode to enter
          the cockpit.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <ModeCard
          title={modeLabel("styfi")}
          description="Fixed share price, straightforward staking and cooldown."
          ctaLabel={`Enter ${modeLabel("styfi")}`}
          variant="styfi"
          onClick={() => onSelectMode("styfi")}
        />

        <ModeCard
          title={modeLabel("x")}
          description="Shares-based vault with boosted rewards and flexible deposits."
          ctaLabel={`Enter ${modeLabel("x")}`}
          variant="veyfi"
          onClick={() => onSelectMode("x")}
        />
      </div>

      <footer className="text-xs text-neutral-500">
        Need veYFI?{" "}
        <Link className="underline" href="/veyfi">
          Go to veYFI
        </Link>
      </footer>
    </main>
  );
}

type ModeCardProps = {
  title: string;
  description: string;
  ctaLabel: string;
  variant: "styfi" | "veyfi";
  onClick: () => void;
};

function ModeCard({
  title,
  description,
  ctaLabel,
  variant,
  onClick,
}: ModeCardProps) {
  return (
    <Card className="w-72 space-y-3 border-neutral-300">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-neutral-600 text-sm">{description}</p>
      </div>
      <Button variant={variant} className="w-full" onClick={onClick}>
        {ctaLabel}
      </Button>
    </Card>
  );
}
