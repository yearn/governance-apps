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
  });
});
