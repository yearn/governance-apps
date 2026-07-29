import { describe, expect, it } from "vitest";
import feedExample from "@/docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json";
import {
  getTeamsAuthorityFingerprint,
  teamsKeys,
} from "@/lib/hooks/teamsKeys";
import { TeamsFeedSchema } from "@/lib/schemas/teams-feed";

describe("Teams authority query keys", () => {
  const feed = TeamsFeedSchema.parse(feedExample);

  it("is stable for equivalent parsed feed content", () => {
    const clone = TeamsFeedSchema.parse(structuredClone(feedExample));

    expect(getTeamsAuthorityFingerprint(clone)).toBe(
      getTeamsAuthorityFingerprint(feed)
    );
    expect(
      teamsKeys.canonicalSnapshot(
        getTeamsAuthorityFingerprint(clone),
        1
      )
    ).toEqual(
      teamsKeys.canonicalSnapshot(
        getTeamsAuthorityFingerprint(feed),
        1
      )
    );
  });

  it.each([
    [
      "selected team binding",
      {
        ...feed,
        teams: [
          {
            ...feed.teams[0]!,
            owner: "0x9999999999999999999999999999999999999999",
          },
        ],
      },
    ],
    [
      "token binding",
      {
        ...feed,
        tokens: Object.fromEntries(
          Object.entries(feed.tokens).map(([key, token], index) => [
            key,
            index === 0
              ? {
                  ...token,
                  converter:
                    "0x9999999999999999999999999999999999999999",
                }
              : token,
          ])
        ),
      },
    ],
    [
      "funding binding",
      {
        ...feed,
        fundingApprovals: [
          {
            ...feed.fundingApprovals[0]!,
            amount: "999",
          },
        ],
      },
    ],
  ])("changes when same-block %s facts change", (_label, mutatedFeed) => {
    expect(getTeamsAuthorityFingerprint(mutatedFeed)).not.toBe(
      getTeamsAuthorityFingerprint(feed)
    );
    expect(
      teamsKeys.canonicalSnapshot(
        getTeamsAuthorityFingerprint(mutatedFeed),
        1
      )
    ).not.toEqual(
      teamsKeys.canonicalSnapshot(
        getTeamsAuthorityFingerprint(feed),
        1
      )
    );
  });

  it("uses a unique key for every successful feed activation", () => {
    const fingerprint = getTeamsAuthorityFingerprint(feed);

    expect(
      teamsKeys.canonicalSnapshot(fingerprint, 2)
    ).not.toEqual(teamsKeys.canonicalSnapshot(fingerprint, 1));
  });

  it("keeps the retained query-key authority value to one hash", () => {
    const fingerprint = getTeamsAuthorityFingerprint(feed);
    const key = teamsKeys.canonicalSnapshot(fingerprint, 1);

    expect(fingerprint).toMatch(/^0x[a-f0-9]{64}$/);
    expect(key).toEqual([
      "teams",
      "canonical-snapshot",
      fingerprint,
      1,
      "current",
    ]);
    expect(JSON.stringify(key).length).toBeLessThan(160);
  });
});
