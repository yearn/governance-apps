import { describe, expect, it } from "vitest";
import feedExample from "@/docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json";
import { mapYbcFeedToPageState } from "@/lib/clients/ybc";
import { YbcFeedSchema, type YbcFeed } from "@/lib/schemas/ybc-feed";

function parseFeed(value: unknown): YbcFeed {
  const parsed = YbcFeedSchema.parse(value);
  return parsed;
}

describe("YBC feed mapper", () => {
  it("maps a feed into the existing observer page state", () => {
    const pageState = mapYbcFeedToPageState(parseFeed(feedExample));

    expect(pageState.scenarioId).toBe("observer");
    expect(pageState.data.hero.collectiveAddress).toBe(feedExample.deployment.ybc);
    expect(pageState.data.hero.memberCount).toBe(1);
    expect(pageState.data.hero.internalWeight).toBe("50");
    expect(pageState.data.roster.totals.rawStaked).toBe("100");
    expect(pageState.data.roster.totals.effectiveWeight).toBe("50");
    expect(pageState.data.me.isMember).toBe(false);
    expect(pageState.data.me.canPropose).toBe(false);
    expect(pageState.data.rewards.claim.disabledReason).toMatch(/connect/i);
  });

  it("overlays the connected member perspective", () => {
    const pageState = mapYbcFeedToPageState(
      parseFeed(feedExample),
      "0x1111111111111111111111111111111111111111"
    );

    expect(pageState.scenarioId).toBe("member-ramping");
    expect(pageState.data.me.isMember).toBe(true);
    expect(pageState.data.me.weight.rawStaked).toBe("100");
    expect(pageState.data.me.weight.effectiveWeight).toBe("50");
    expect(pageState.data.me.weight.targetWeight).toBe("100");
    expect(pageState.data.me.pendingRewards).toBe("1.2");
    expect(pageState.data.me.canVote).toBe(true);
  });

  it("keeps feed-backed proposal writes disabled until fork smoke", () => {
    const pageState = mapYbcFeedToPageState(
      parseFeed(feedExample),
      "0x1111111111111111111111111111111111111111"
    );
    const proposal = pageState.data.proposals.items[0]!;

    expect(proposal.phase).toBe("voting");
    expect(proposal.votes.total).toBe("50");
    expect(proposal.actions).toEqual(
      expect.objectContaining({
        canRetract: false,
        canVote: false,
        canExecute: false,
        nextAction: "none",
      })
    );
    expect(proposal.actions.disabledReason).toMatch(/fork smoke/i);
  });

  it("marks active members with unmatured target weight as ramping", () => {
    const feed = parseFeed({
      ...feedExample,
      members: [
        {
          ...feedExample.members[0]!,
          effectiveWeight: "0",
          weightMaturityBps: 0,
          maturesAt: null,
        },
      ],
    });
    const pageState = mapYbcFeedToPageState(feed);

    expect(pageState.data.roster.members[0]?.status).toBe("ramping");
    expect(pageState.data.roster.totals.rampingMemberCount).toBe(1);

    const memberPageState = mapYbcFeedToPageState(
      feed,
      "0x1111111111111111111111111111111111111111"
    );
    expect(memberPageState.scenarioId).toBe("member-ramping");
  });
});
