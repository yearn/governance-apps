"use client";

import { Card } from "@/components/ui/Card";
import type { YbcMockDataV1, YbcPrototypeScenarioId } from "@/lib/clients/ybc";
import { useYbcState } from "@/lib/hooks/useYbc";
import { ybcCopy as copy } from "./messages";
import { MembersTable, MembersTableSkeleton } from "./components/MembersTable";
import { YbcHero, YbcHeroSkeleton } from "./components/YbcHero";

type YbcPageClientProps = {
  scenarioOverride?: YbcPrototypeScenarioId;
};

type YbcPageContentProps = {
  data: YbcMockDataV1;
};

export function YbcPageClient({ scenarioOverride }: YbcPageClientProps = {}) {
  const { data, isLoading } = useYbcState({ scenarioOverride });

  if (isLoading || !data) {
    return <YbcPageLoadingState />;
  }

  return <YbcPageContent data={data.data} />;
}

export function YbcPageContent({ data }: YbcPageContentProps) {
  return (
    <div className="bg-app text-text-primary">
      <YbcHero data={data} />
      <MembersTable roster={data.roster} currentAddress={data.me.address} />
      <section className="container mx-auto px-4 pb-16 md:px-6 md:pb-20">
        <Card className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-bold uppercase text-text-tertiary">
              {copy.roadmap.title}
            </p>
            <p className="max-w-3xl text-sm leading-6 text-text-secondary">
              {copy.roadmap.body}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {copy.roadmap.items.map((item) => (
              <span
                key={item}
                className="rounded-md bg-surface-secondary px-3 py-2 text-sm font-bold text-text-secondary"
              >
                {item}
              </span>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

export function YbcPageLoadingState() {
  return (
    <div className="bg-app text-text-primary" aria-busy="true">
      <section className="border-b border-border bg-surface">
        <div className="container mx-auto space-y-3 px-4 py-8 md:px-6">
          <p className="text-sm font-bold uppercase text-text-tertiary">
            {copy.page.loadingTitle}
          </p>
          <p className="max-w-2xl text-sm leading-6 text-text-secondary">
            {copy.page.loadingBody}
          </p>
        </div>
      </section>
      <YbcHeroSkeleton />
      <MembersTableSkeleton />
    </div>
  );
}
