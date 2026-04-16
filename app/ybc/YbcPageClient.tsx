"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { YbcMockDataV1, YbcPrototypeScenarioId } from "@/lib/clients/ybc";
import { useYbcState } from "@/lib/hooks/useYbc";
import { ybcCopy as copy } from "./messages";
import { MembersTable, MembersTableSkeleton } from "./components/MembersTable";
import { YbcHero, YbcHeroSkeleton } from "./components/YbcHero";

const sectionStatusVariant = {
  Default: "brand",
  Mapped: "neutral",
  Conditional: "warning",
} as const;

type YbcPageClientProps = {
  scenarioOverride?: YbcPrototypeScenarioId;
};

type YbcPageContentProps = {
  data: YbcMockDataV1;
};

export function YbcPageClient({ scenarioOverride }: YbcPageClientProps = {}) {
  const { data, error, isError, isLoading, refetch } = useYbcState({
    scenarioOverride,
  });

  if (isError) {
    return (
      <YbcPageErrorState
        errorMessage={error instanceof Error ? error.message : null}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

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
        <div className="space-y-2 pb-6">
          <p className="text-sm font-bold uppercase text-text-tertiary">
            {copy.shell.title}
          </p>
          <p className="max-w-3xl text-sm leading-6 text-text-secondary">
            {copy.shell.body}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {copy.sections.slice(2).map((section) => (
            <Card
              key={section.id}
              id={section.id}
              className="flex min-h-[220px] flex-col justify-between gap-8"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">{section.title}</h2>
                  <Badge variant={sectionStatusVariant[section.status]}>
                    {section.status}
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-text-secondary">
                  {section.body}
                </p>
              </div>
              <p className="text-xs font-bold uppercase text-text-tertiary">
                {copy.shell.footerLabel}
              </p>
            </Card>
          ))}
        </div>
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

export function YbcPageErrorState({
  errorMessage,
  onRetry,
}: {
  errorMessage?: string | null;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-app text-text-primary">
      <section className="container mx-auto px-4 py-16 md:px-6 md:py-24">
        <Card className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-bold uppercase text-text-tertiary">
              {copy.page.errorTitle}
            </p>
            <h1 className="text-3xl font-bold">{copy.app.displayLabel}</h1>
            <p className="max-w-2xl text-sm leading-6 text-text-secondary">
              {copy.page.errorBody}
            </p>
            {errorMessage ? (
              <p className="font-number text-xs text-text-tertiary">
                {errorMessage}
              </p>
            ) : null}
          </div>
          {onRetry ? (
            <div>
              <Button type="button" variant="secondary" onClick={onRetry}>
                {copy.page.retryCta}
              </Button>
            </div>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
