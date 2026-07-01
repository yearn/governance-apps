import { describe, expect, it } from "vitest";
import feedExample from "@/docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json";
import { YbcFeedSchema } from "@/lib/schemas/ybc-feed";

describe("YbcFeedSchema", () => {
  it("accepts valid v1 payloads", () => {
    const parsed = YbcFeedSchema.safeParse(feedExample);
    expect(parsed.success).toBe(true);
  });

  it("rejects non-mainnet chain id", () => {
    const parsed = YbcFeedSchema.safeParse({
      ...feedExample,
      chainId: 10,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects decimal token amount strings", () => {
    const parsed = YbcFeedSchema.safeParse({
      ...feedExample,
      members: [
        {
          ...feedExample.members[0]!,
          upstreamStaked: "1.5",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires deployment block metadata", () => {
    const parsed = YbcFeedSchema.safeParse({
      ...feedExample,
      deployment: {
        ...feedExample.deployment,
        deployBlock: undefined,
      },
    });
    expect(parsed.success).toBe(false);
  });
});
