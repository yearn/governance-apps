import { describe, expect, it } from "vitest";
import feedExample from "@/docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json";
import { ybcKeys } from "@/lib/hooks/ybcKeys";
import { YbcFeedSchema } from "@/lib/schemas/ybc-feed";

const WALLET = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const feed = YbcFeedSchema.parse(feedExample);

describe("YBC query keys", () => {
  it("separates canonical authority when a block or proposal tuple changes", () => {
    const nextBlock = {
      ...feed,
      blockNumber: feed.blockNumber + 1,
      blockHash:
        "0x2222222222222222222222222222222222222222222222222222222222222222",
    };
    const changedProposal = {
      ...feed,
      proposals: [
        {
          ...feed.proposals[0]!,
          votes: "1",
          yea: "1",
          nay: "0",
        },
      ],
    };

    expect(ybcKeys.canonicalSnapshot(feed)).not.toEqual(
      ybcKeys.canonicalSnapshot(nextBlock)
    );
    expect(ybcKeys.canonicalSnapshot(feed)).not.toEqual(
      ybcKeys.canonicalSnapshot(changedProposal)
    );
    expect(ybcKeys.walletOverlay(WALLET, feed)).not.toEqual(
      ybcKeys.walletOverlay(WALLET, nextBlock)
    );
  });

  it("keeps address-only and canonical prefixes usable for invalidation", () => {
    const walletPrefix = ybcKeys.walletOverlay(WALLET);
    const walletSnapshotKey = ybcKeys.walletOverlay(WALLET, feed);
    const snapshotPrefix = ybcKeys.canonicalSnapshot();
    const snapshotKey = ybcKeys.canonicalSnapshot(feed);

    expect(walletPrefix).toEqual([
      "ybc",
      "wallet-overlay",
      WALLET.toLowerCase(),
    ]);
    expect(walletSnapshotKey.slice(0, walletPrefix.length)).toEqual(
      walletPrefix
    );
    expect(snapshotPrefix).toEqual(["ybc", "canonical-snapshot"]);
    expect(snapshotKey.slice(0, snapshotPrefix.length)).toEqual(
      snapshotPrefix
    );
  });
});
