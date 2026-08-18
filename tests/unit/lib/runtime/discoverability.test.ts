import { describe, expect, it } from "vitest";
import {
  buildGovernanceLlmsText,
  buildGovernanceRobots,
  buildGovernanceSitemap,
  createGovernanceAppMetadata,
  createGovernanceWebSiteJsonLd,
  getGovernanceAppCanonicalUrl,
  getIndexableGovernanceAppForHostname,
  isIndexableGovernanceHostname,
  serializeJsonLd,
} from "@/lib/runtime/discoverability";

describe("governance app discoverability", () => {
  it("uses yearn.fi canonical URLs for every app", () => {
    expect(getGovernanceAppCanonicalUrl("styfi")).toBe(
      "https://styfi.yearn.fi"
    );
    expect(getGovernanceAppCanonicalUrl("veyfi")).toBe(
      "https://veyfi.yearn.fi"
    );
    expect(getGovernanceAppCanonicalUrl("teams")).toBe(
      "https://teams.yearn.fi"
    );
    expect(getGovernanceAppCanonicalUrl("yeth")).toBe(
      "https://yeth.yearn.fi"
    );
    expect(getGovernanceAppCanonicalUrl("ybc")).toBe(
      "https://ybc.yearn.fi"
    );
  });

  it("adds canonical and Open Graph URLs without trusting request hosts", () => {
    const metadata = createGovernanceAppMetadata("styfi", {
      title: "stYFI",
      alternates: {
        languages: {
          en: "https://styfi.yearn.fi",
        },
      },
      openGraph: {
        title: "stYFI",
      },
    });

    expect(metadata).toMatchObject({
      metadataBase: new URL("https://styfi.yearn.fi"),
      alternates: {
        canonical: "https://styfi.yearn.fi",
        languages: {
          en: "https://styfi.yearn.fi",
        },
      },
      openGraph: {
        title: "stYFI",
        url: "https://styfi.yearn.fi",
      },
    });
  });

  it("indexes only the approved production hostnames", () => {
    expect(getIndexableGovernanceAppForHostname("styfi.yearn.fi:443")).toBe(
      "styfi"
    );
    expect(getIndexableGovernanceAppForHostname("VEYFI.YEARN.FI.")).toBe(
      "veyfi"
    );
    expect(isIndexableGovernanceHostname("teams.yearn.fi")).toBe(false);
    expect(isIndexableGovernanceHostname("yeth.yearn.fi")).toBe(false);
    expect(isIndexableGovernanceHostname("ybc.yearn.fi")).toBe(false);
    expect(isIndexableGovernanceHostname("dao.yearn.fi")).toBe(false);
    expect(isIndexableGovernanceHostname("app.dao-ops.com")).toBe(false);
    expect(isIndexableGovernanceHostname("styfi-beta.dao-ops.com")).toBe(false);
    expect(isIndexableGovernanceHostname("localhost:3000")).toBe(false);
  });

  it("publishes a host-scoped robots sitemap without blocking Next assets", () => {
    expect(buildGovernanceRobots("styfi.yearn.fi")).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/debug/"],
      },
      sitemap: "https://styfi.yearn.fi/sitemap.xml",
    });

    expect(buildGovernanceRobots("app.dao-ops.com")).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/debug/"],
      },
    });
  });

  it("publishes only the canonical URL owned by the request hostname", () => {
    expect(buildGovernanceSitemap("veyfi.yearn.fi")).toEqual([
      {
        url: "https://veyfi.yearn.fi",
        changeFrequency: "weekly",
        priority: 1,
      },
    ]);
    expect(buildGovernanceSitemap("styfi-beta.dao-ops.com")).toEqual([]);
    expect(buildGovernanceSitemap("teams.yearn.fi")).toEqual([]);
    expect(buildGovernanceSitemap("dao.yearn.fi")).toEqual([]);
  });

  it("publishes concise llms.txt content only for approved public hosts", () => {
    expect(buildGovernanceLlmsText("styfi.yearn.fi")).toBe(
      [
        "# stYFI",
        "",
        "> Stake YFI to earn yield and participate in Yearn Governance. Manage stYFI and stYFIx positions.",
        "",
        "This is the canonical public interface. Read live balances, rates, positions, and transaction state from the application rather than this summary.",
        "",
        "## Website",
        "",
        "- [Open stYFI](https://styfi.yearn.fi): Canonical Yearn stYFI interface.",
        "",
      ].join("\n")
    );
    expect(buildGovernanceLlmsText("veyfi.yearn.fi")).toContain(
      "[Open veYFI](https://veyfi.yearn.fi)"
    );
    expect(buildGovernanceLlmsText("app.dao-ops.com")).toBeNull();
    expect(buildGovernanceLlmsText("teams.yearn.fi")).toBeNull();
  });

  it("builds safe WebSite structured data for public app homepages", () => {
    expect(createGovernanceWebSiteJsonLd("styfi")).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": "https://styfi.yearn.fi/#website",
      url: "https://styfi.yearn.fi",
      name: "stYFI",
      alternateName: "Yearn stYFI",
      description:
        "Stake YFI to earn yield and participate in Yearn Governance. Manage stYFI and stYFIx positions.",
      inLanguage: "en",
    });

    expect(serializeJsonLd({ value: "</script>\u2028next" })).toBe(
      '{"value":"\\u003c/script>\\u2028next"}'
    );
  });
});
