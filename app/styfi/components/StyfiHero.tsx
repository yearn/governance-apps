"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { modeLabel, StyfiMode } from "./types";
import { styfiCopy as copy } from "../messages";

type Props = {
  onSelectMode: (mode: StyfiMode) => void;
};

export function StyfiHero({ onSelectMode }: Props) {
  return (
    <main className="container mx-auto flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="space-y-3 text-center max-w-2xl">
        <p className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          {copy.hero.kicker}
        </p>
        <h1 className="text-4xl font-bold text-neutral-900">
          {copy.hero.title}
        </h1>
        <p className="text-neutral-600 text-lg">{copy.hero.body}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <ModeCard
          title={modeLabel("styfi")}
          description={copy.hero.cards.styfi.description}
          ctaLabel={copy.hero.cards.styfi.cta(modeLabel("styfi"))}
          variant="styfi"
          onClick={() => onSelectMode("styfi")}
        />

        <ModeCard
          title={modeLabel("x")}
          description={copy.hero.cards.x.description}
          ctaLabel={copy.hero.cards.x.cta(modeLabel("x"))}
          variant="veyfi"
          onClick={() => onSelectMode("x")}
        />
      </div>

      <footer className="text-xs text-neutral-500">
        {copy.hero.footer.text}{" "}
        <Link className="underline" href="/veyfi">
          {copy.hero.footer.linkLabel}
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
