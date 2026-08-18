import {
  createGovernanceWebSiteJsonLd,
  serializeJsonLd,
  type IndexableGovernanceApp,
} from "@/lib/runtime/discoverability";

type GovernanceWebSiteJsonLdProps = {
  app: IndexableGovernanceApp;
  nonce?: string | null;
};

export function GovernanceWebSiteJsonLd({
  app,
  nonce,
}: GovernanceWebSiteJsonLdProps) {
  return (
    <script
      nonce={nonce || undefined}
      suppressHydrationWarning
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(createGovernanceWebSiteJsonLd(app)),
      }}
    />
  );
}
