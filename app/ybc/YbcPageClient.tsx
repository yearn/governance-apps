"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatsBar } from "@/components/ui/StatsBar";
import { LogoYearnGlyph } from "@/components/icons/LogoYearnGlyph";
import { ybcCopy as copy } from "./messages";
import { ProposalBoard } from "./components/ProposalBoard";

const sectionStatusVariant = {
  Default: "brand",
  Mapped: "neutral",
  Conditional: "warning",
} as const;

export function YbcPageClient() {
  const shellSections = copy.sections.filter((section) => section.id !== "proposals");

  return (
    <div className="bg-app text-text-primary">
      <section className="border-b border-border bg-surface">
        <div className="container mx-auto grid min-h-[420px] items-center gap-10 px-4 py-12 md:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] md:px-6 md:py-16">
          <div className="max-w-3xl space-y-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">{copy.app.routeKey}</Badge>
              <Badge variant="warning">{copy.page.productionGate}</Badge>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-bold uppercase text-text-tertiary">
                {copy.page.eyebrow}
              </p>
              <h1 className="text-4xl font-bold md:text-6xl">{copy.page.title}</h1>
              <p className="max-w-2xl text-base leading-7 text-text-secondary md:text-lg">
                {copy.page.description}
              </p>
            </div>
            <nav
              aria-label="YBC sections"
              className="flex flex-wrap gap-2"
            >
              {copy.sections.map((section) => (
                <Link
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-box border border-border bg-app px-3 py-2 text-sm font-bold text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
                >
                  {section.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="relative overflow-hidden rounded-box border border-border bg-app p-6">
            <div className="absolute right-0 top-0 h-24 w-24 border-b border-l border-yearn-blue/20 bg-yearn-blue/10" />
            <div className="relative space-y-8">
              <div className="flex size-16 items-center justify-center rounded-box bg-yearn-blue text-white">
                <LogoYearnGlyph
                  className="size-9"
                  backClassName="text-yearn-blue"
                  frontClassName="text-white"
                />
              </div>
              <div className="space-y-4">
                <p className="text-sm font-bold uppercase text-text-tertiary">
                  {copy.page.defaultSection}
                </p>
                <h2 className="text-2xl font-bold">{copy.sections[0].title}</h2>
                <p className="text-sm leading-6 text-text-secondary">
                  {copy.sections[0].body}
                </p>
              </div>
              <div className="grid gap-3 text-sm">
                <RolloutRow
                  label={copy.rollout.beta.label}
                  value={copy.rollout.beta.value}
                  status={copy.rollout.beta.status}
                />
                <RolloutRow
                  label={copy.rollout.production.label}
                  value={copy.rollout.production.value}
                  status={copy.rollout.production.status}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <StatsBar items={[...copy.heroStats]} />

      <section className="container mx-auto space-y-6 px-4 py-10 md:px-6 md:py-14">
        <div className="grid gap-4 xl:grid-cols-2">
          {shellSections.slice(0, 2).map((section) => (
            <SectionShellCard key={section.id} {...section} />
          ))}
        </div>
        <ProposalBoard id="proposals" />
        <div className="grid gap-4 xl:grid-cols-2">
          {shellSections.slice(2).map((section) => (
            <SectionShellCard key={section.id} {...section} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionShellCard({
  id,
  label,
  status,
  title,
  body,
}: (typeof copy.sections)[number]) {
  return (
    <Card id={id} className="flex min-h-[220px] flex-col justify-between gap-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <Badge variant={sectionStatusVariant[status]}>{status}</Badge>
        </div>
        <p className="text-sm leading-6 text-text-secondary">{body}</p>
      </div>
      <p className="text-xs font-bold uppercase text-text-tertiary">{label}</p>
    </Card>
  );
}

function RolloutRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: string;
}) {
  return (
    <div className="grid gap-1 border-t border-border pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase text-text-tertiary">
          {label}
        </span>
        <span className="font-number text-sm font-bold text-text-primary">
          {value}
        </span>
      </div>
      <p className="text-xs text-text-secondary">{status}</p>
    </div>
  );
}
