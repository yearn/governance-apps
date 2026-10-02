import { describe, expect, it } from "vitest";
import {
  createDaoRouteMetadata,
  daoNotFoundMetadata,
} from "@/app/dao/metadata";

describe("DAO route metadata", () => {
  it("stays noindex and does not publish a production host", () => {
    const metadata = createDaoRouteMetadata(
      "DAO Governance | Yearn Finance"
    );

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.metadataBase).toBeUndefined();
    expect(metadata.alternates).toBeUndefined();
    expect(JSON.stringify(metadata)).not.toContain("dao.yearn.fi");
  });

  it("keeps gated metadata undiscoverable", () => {
    expect(daoNotFoundMetadata).toMatchObject({
      title: "Not Found",
      robots: { index: false, follow: false },
    });
    expect(daoNotFoundMetadata.openGraph).toBeUndefined();
    expect(daoNotFoundMetadata.twitter).toBeUndefined();
  });

  it("shares the DAO board with a large image and retains noindex", () => {
    const metadata = createDaoRouteMetadata("DAO Governance | Yearn Finance", { hostname: "dao.yearn.fi" });
    expect(metadata).toMatchObject({
      metadataBase: new URL("https://dao.yearn.fi"),
      alternates: { canonical: "https://dao.yearn.fi/" },
      robots: { index: false, follow: false },
      openGraph: {
        title: "DAO Governance | Yearn Finance",
        description: "Review proposals and take part in Yearn DAO decisions.",
        url: "https://dao.yearn.fi/",
        images: [{ url: "https://dao.yearn.fi/og-DAO.png", width: 1200, height: 630 }],
      },
      twitter: { card: "summary_large_image", images: ["https://dao.yearn.fi/og-DAO.png"] },
    });
  });

  it.each([
    ["dao-beta.dao-ops.com", "https://dao-beta.dao-ops.com/proposals/0?chain=1&voting=0xabc"],
    ["app.dao-ops.com", "https://app.dao-ops.com/dao/proposals/0?chain=1&voting=0xabc"],
    ["localhost:3000", "http://localhost:3000/dao/proposals/0?chain=1&voting=0xabc"],
    ["127.0.0.1:3000", "http://127.0.0.1:3000/dao/proposals/0?chain=1&voting=0xabc"],
  ])("keeps %s sharing on its current surface", (hostname, url) => {
    const metadata = createDaoRouteMetadata("A proposal | Yearn DAO", {
      hostname, path: "/proposals/0?chain=1&voting=0xabc", description: "Proposal summary.",
    });
    expect(metadata.openGraph).toMatchObject({ url, description: "Proposal summary." });
    expect(metadata.twitter).toMatchObject({ title: "A proposal | Yearn DAO", description: "Proposal summary." });
    expect(metadata.alternates).toBeUndefined();
    expect(JSON.stringify(metadata)).not.toContain("dao.yearn.fi");
  });

  it.each(["attacker.example", "dao.yearn.fi@attacker.example", "dao.yearn.fi/redirect", "dao.yearn.fi:444", "https://dao.yearn.fi"]) (
    "does not trust an unexpected request host: %s", (hostname) => {
      const metadata = createDaoRouteMetadata("DAO", { hostname });
      expect(metadata.metadataBase).toBeUndefined();
      expect(metadata.alternates).toBeUndefined();
      expect(metadata.openGraph).not.toHaveProperty("url");
    }
  );

  it("does not canonicalize an unresolved proposal", () => {
    const metadata = createDaoRouteMetadata("Proposal | DAO Governance", {
      hostname: "dao.yearn.fi", path: "/proposals/0?chain=1&voting=0xabc", canonical: false,
    });
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.openGraph).toHaveProperty("url", "https://dao.yearn.fi/proposals/0?chain=1&voting=0xabc");
  });
});
