import { readBoundedJson, withFeedRequest, type FeedTransportPolicy } from "@/lib/feed-transport";
import { parseTreasuryFeed, TREASURY_FEED_MAX_PAYLOAD_BYTES, TreasuryFeedError, type TreasuryFeed } from "@/lib/schemas/treasury-feed";

export { TreasuryFeedError, TREASURY_FEED_STALE_SECONDS } from "@/lib/schemas/treasury-feed";
export const TREASURY_FEED_POLICY: FeedTransportPolicy = {
  maximumPayloadBytes: TREASURY_FEED_MAX_PAYLOAD_BYTES,
  fatalUtf8: true,
  requestTimeoutMs: 10_000,
  // Workers rejects redirect: "error"; both callers reject non-OK responses.
  fetchOptions: { cache: "no-store", redirect: "manual" },
  createPayloadTooLargeError: () => new TreasuryFeedError("oversized", "Treasury feed exceeds the payload limit."),
  createTimeoutError: () => new TreasuryFeedError("timeout", "Treasury feed request timed out."),
  payloadTooLargeCancelReason: "Treasury payload limit",
  timeoutCancelReason: "Treasury request deadline",
};

export async function fetchTreasuryFeed(): Promise<TreasuryFeed> {
  return withFeedRequest("/api/treasury-data", TREASURY_FEED_POLICY, async (response, context) => {
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new TreasuryFeedError(response.status === 504 ? "timeout" : "unavailable", "Treasury feed is unavailable.");
    }
    const feed = parseTreasuryFeed(await readBoundedJson(response, context, TREASURY_FEED_POLICY));
    if (feed.mode !== "live") throw new TreasuryFeedError("invalid", "A live feed cannot contain example data.");
    return feed;
  });
}

/** Scoped to one client. Failed, delayed and conflicting publications cannot replace good data. */
export class TreasuryFeedReader {
  private sequence = 0;
  private lastGood: TreasuryFeed | null = null;
  constructor(private readonly fetchFeed: () => Promise<TreasuryFeed> = fetchTreasuryFeed) {}

  async refresh(): Promise<TreasuryFeed> {
    const sequence = ++this.sequence;
    const candidate = await this.fetchFeed();
    if (sequence !== this.sequence) {
      if (this.lastGood) return this.lastGood;
      throw new TreasuryFeedError("unavailable", "Treasury request was superseded.");
    }
    if (candidate.generatedAt > Math.floor(Date.now() / 1000) + 60) {
      throw new TreasuryFeedError("invalid", "Treasury observation time is in the future.");
    }
    if (this.lastGood) {
      if (candidate.blockNumber < this.lastGood.blockNumber || (candidate.blockNumber === this.lastGood.blockNumber && (candidate.blockHash !== this.lastGood.blockHash || candidate.blockTimestamp !== this.lastGood.blockTimestamp))) {
        throw new TreasuryFeedError("invalid", "Treasury block regressed or conflicts with the accepted block.");
      }
      if (candidate.generatedAt < this.lastGood.generatedAt) {
        throw new TreasuryFeedError("invalid", "An older treasury publication was received.");
      }
      if (candidate.generatedAt === this.lastGood.generatedAt && JSON.stringify(candidate) !== JSON.stringify(this.lastGood)) {
        throw new TreasuryFeedError("invalid", "Treasury publications disagree at the same observation time.");
      }
    }
    this.lastGood = candidate;
    return candidate;
  }

  current(): TreasuryFeed | null { return this.lastGood; }
}
