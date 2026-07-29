import { describe, expect, it } from "vitest";
import feedExample from "@/docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json";
import {
  YbcFeedSchema,
  YBC_FEED_MAX_EVENT_ID_LENGTH,
  YBC_FEED_MAX_MEMBERS,
  YBC_FEED_MAX_OPERATORS,
  YBC_FEED_MAX_PROPOSALS,
  YBC_FEED_MAX_REWARD_CLAIMERS,
  YBC_FEED_MAX_REWARD_CLAIMS,
  YBC_FEED_MAX_SOURCE_REF_LENGTH,
  YBC_FEED_MAX_VOTES,
} from "@/lib/schemas/ybc-feed";

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
    for (const malformed of ["1.5", "", "-1", "+1", "wat"]) {
      expect(() =>
        YbcFeedSchema.safeParse({
          ...feedExample,
          members: [
            {
              ...feedExample.members[0]!,
              upstreamStaked: malformed,
            },
          ],
        })
      ).not.toThrow();
      expect(
        YbcFeedSchema.safeParse({
          ...feedExample,
          members: [
            {
              ...feedExample.members[0]!,
              upstreamStaked: malformed,
            },
          ],
        }).success
      ).toBe(false);
    }
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

  it("rejects unsafe numeric IDs and values above uint256", () => {
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        proposals: [
          {
            ...feedExample.proposals[0]!,
            id: Number.MAX_SAFE_INTEGER + 1,
          },
        ],
      }).success
    ).toBe(false);
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        members: [
          {
            ...feedExample.members[0]!,
            upstreamStaked: String(1n << 256n),
          },
        ],
      }).success
    ).toBe(false);
  });

  it("bounds producer-controlled arrays, IDs, and source references", () => {
    const oversizedMembers = Array.from(
      { length: YBC_FEED_MAX_MEMBERS + 1 },
      (_, index) => ({
        ...feedExample.members[0]!,
        address: makeAddress(index + 1),
      })
    );
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        members: oversizedMembers,
        events: {
          ...feedExample.events,
          activeMemberCount: oversizedMembers.length,
        },
      }).success
    ).toBe(false);
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        votes: [
          {
            ...feedExample.votes[0]!,
            id: "v".repeat(YBC_FEED_MAX_EVENT_ID_LENGTH + 1),
          },
        ],
      }).success
    ).toBe(false);
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        deployment: {
          ...feedExample.deployment,
          source: {
            ...feedExample.deployment.source,
            ref: "r".repeat(YBC_FEED_MAX_SOURCE_REF_LENGTH + 1),
          },
        },
      }).success
    ).toBe(false);
  });

  it.each([
    {
      fieldName: "members",
      maximum: YBC_FEED_MAX_MEMBERS,
      buildPayload: (values: null[]) => ({
        ...feedExample,
        members: values,
      }),
    },
    {
      fieldName: "proposals",
      maximum: YBC_FEED_MAX_PROPOSALS,
      buildPayload: (values: null[]) => ({
        ...feedExample,
        proposals: values,
      }),
    },
    {
      fieldName: "votes",
      maximum: YBC_FEED_MAX_VOTES,
      buildPayload: (values: null[]) => ({
        ...feedExample,
        votes: values,
      }),
    },
    {
      fieldName: "operators",
      maximum: YBC_FEED_MAX_OPERATORS,
      buildPayload: (values: null[]) => ({
        ...feedExample,
        config: {
          ...feedExample.config,
          operators: values,
        },
      }),
    },
    {
      fieldName: "rewardClaimers",
      maximum: YBC_FEED_MAX_REWARD_CLAIMERS,
      buildPayload: (values: null[]) => ({
        ...feedExample,
        config: {
          ...feedExample.config,
          rewardClaimers: values,
        },
      }),
    },
    {
      fieldName: "rewards.claims",
      maximum: YBC_FEED_MAX_REWARD_CLAIMS,
      buildPayload: (values: null[]) => ({
        ...feedExample,
        rewards: {
          ...feedExample.rewards,
          claims: values,
        },
      }),
    },
  ])(
    "rejects oversized invalid $fieldName arrays before item validation",
    ({ maximum, buildPayload }) => {
      const parsed = YbcFeedSchema.safeParse(
        buildPayload(Array.from({ length: maximum + 1 }, () => null))
      );

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues).toHaveLength(1);
      }
    }
  );

  it("rejects case-insensitive duplicate members and operators", () => {
    const duplicateAddress =
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        members: [
          {
            ...feedExample.members[0]!,
            address: duplicateAddress,
          },
          {
            ...feedExample.members[0]!,
            address: duplicateAddress.toUpperCase().replace("0X", "0x"),
          },
        ],
        events: {
          ...feedExample.events,
          activeMemberCount: 2,
        },
      }).success
    ).toBe(false);
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        config: {
          ...feedExample.config,
          operators: [
            duplicateAddress,
            duplicateAddress.toUpperCase().replace("0X", "0x"),
          ],
        },
      }).success
    ).toBe(false);
  });

  it("requires a unique complete proposal ID set but accepts shuffled history", () => {
    const proposalZero = feedExample.proposals[0]!;
    const proposalOne = {
      ...proposalZero,
      id: 1,
      account: "0x3333333333333333333333333333333333333333",
    };
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        proposals: [proposalZero, proposalZero],
        events: {
          ...feedExample.events,
          proposalCount: 2,
        },
      }).success
    ).toBe(false);
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        proposals: [proposalOne, proposalZero],
        events: {
          ...feedExample.events,
          proposalCount: 2,
        },
      }).success
    ).toBe(true);
  });

  it("accepts the complete-history ceiling and rejects one proposal beyond it", () => {
    const proposalsAtLimit = Array.from(
      { length: YBC_FEED_MAX_PROPOSALS },
      (_, id) => ({
        ...feedExample.proposals[0]!,
        id,
      })
    );
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        proposals: proposalsAtLimit,
        events: {
          ...feedExample.events,
          proposalCount: proposalsAtLimit.length,
        },
      }).success
    ).toBe(true);

    const proposalsOverLimit = [
      ...proposalsAtLimit,
      {
        ...feedExample.proposals[0]!,
        id: YBC_FEED_MAX_PROPOSALS,
      },
    ];
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        proposals: proposalsOverLimit,
        events: {
          ...feedExample.events,
          proposalCount: proposalsOverLimit.length,
        },
      }).success
    ).toBe(false);
  });

  it("rejects duplicate normalized event IDs and log coordinates", () => {
    const vote = feedExample.votes[0]!;
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        votes: [
          vote,
          {
            ...vote,
            id: vote.id.toUpperCase(),
          },
        ],
        events: {
          ...feedExample.events,
          voteCount: 2,
        },
      }).success
    ).toBe(false);

    const claim = {
      id: "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc-1",
      account: feedExample.members[0]!.address,
      rewards: "1",
      txHash:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      blockNumber: feedExample.blockNumber,
      logIndex: 1,
      timestamp: feedExample.generatedAt,
    };
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        rewards: {
          ...feedExample.rewards,
          claims: [
            claim,
            {
              ...claim,
              id: claim.id.toUpperCase(),
            },
          ],
        },
        events: {
          ...feedExample.events,
          rewardClaimCount: 2,
        },
      }).success
    ).toBe(false);
  });

  it("rejects inconsistent producer counts", () => {
    expect(
      YbcFeedSchema.safeParse({
        ...feedExample,
        events: {
          ...feedExample.events,
          activeMemberCount: 2,
        },
      }).success
    ).toBe(false);
  });
});

function makeAddress(value: number): string {
  return `0x${value.toString(16).padStart(40, "0")}`;
}
