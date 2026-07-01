import { describe, expect, it } from "vitest";
import feedExample from "@/docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json";
import { TeamsFeedSchema } from "@/lib/schemas/teams-feed";

describe("TeamsFeedSchema", () => {
  it("accepts valid v1 payloads", () => {
    const parsed = TeamsFeedSchema.safeParse(feedExample);
    expect(parsed.success).toBe(true);
  });

  it("rejects non-mainnet chain id", () => {
    const parsed = TeamsFeedSchema.safeParse({
      ...feedExample,
      chainId: 10,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects decimal token amount strings", () => {
    const parsed = TeamsFeedSchema.safeParse({
      ...feedExample,
      teams: [
        {
          ...feedExample.teams[0]!,
          periods: [
            {
              ...feedExample.teams[0]!.periods[0]!,
              financials: {
                ...feedExample.teams[0]!.periods[0]!.financials,
                revenueUsd: "1.5",
              },
            },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires deployment block metadata", () => {
    const parsed = TeamsFeedSchema.safeParse({
      ...feedExample,
      deployment: {
        ...feedExample.deployment,
        deployBlock: undefined,
      },
    });
    expect(parsed.success).toBe(false);
  });
});
