import type { Hex } from "viem";
import { parseDaoProposalContent } from "../../../../../lib/clients/dao/content";
import { readDaoContentBytes } from "../../../../../lib/clients/dao/content-bytes";
import { getDaoProposalSummary } from "../../../../../lib/clients/dao/content-summary";
import { DAO_FEED_TRANSPORT_POLICY } from "../../../../../lib/clients/dao/feed";
import { getDaoDiscussionUrl } from "../../../../../lib/clients/dao/read-display";
import { readBoundedJson, withFeedRequest } from "../../../../../lib/feed-transport";
import { parseDaoFeed, type DaoFeedWire } from "../../../../../lib/schemas/dao-feed";
import { DAO_VOTING } from "./contracts";
import type { DaoAlertProposal } from "./types";

export interface DaoAlertContent {
  readonly title: string | null;
  readonly summary: string | null;
  readonly discussionUrl: string | null;
}

export interface DaoAlertContentStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
}

export const DAO_CONTENT_RETRY_MS = 10 * 60 * 1_000;
export const DAO_APP_FEED_URL = "https://dao.yearn.fi/api/dao-data";

type ContentFailure = "dao_content_feed_unavailable" | "dao_content_identity_mismatch"
  | "dao_content_missing" | "dao_content_invalid";

export class DaoAlertContentError extends Error {
  constructor(readonly code: ContentFailure | "dao_content_service_missing") {
    super(code);
    this.name = "DaoAlertContentError";
  }
}

/** One reader per cron run. Only verified immutable text is cached across runs. */
export class DaoAlertContentReader {
  private feed: Promise<DaoFeedWire> | null = null;

  constructor(
    private readonly app: Pick<Fetcher, "fetch"> | undefined,
    private readonly storage: DaoAlertContentStorage,
  ) {}

  private async loadFeed(): Promise<DaoFeedWire> {
    if (!this.app) throw new DaoAlertContentError("dao_content_service_missing");
    const app = this.app;
    const policy = { ...DAO_FEED_TRANSPORT_POLICY,
      fetchOptions: { ...DAO_FEED_TRANSPORT_POLICY.fetchOptions, redirect: "error" as const } };
    return withFeedRequest(DAO_APP_FEED_URL, policy, async (response, context) => {
      if (!response.ok) {
        await response.body?.cancel();
        throw new DaoAlertContentError("dao_content_feed_unavailable");
      }
      return parseDaoFeed(await readBoundedJson(response, context, DAO_FEED_TRANSPORT_POLICY));
    }, (url, init) => app.fetch(url, init));
  }

  private async unavailable(
    proposal: DaoAlertProposal, key: string, reason: ContentFailure,
  ): Promise<null> {
    const waitKey = `${key}:waiting`;
    const firstAttempt = await this.storage.get<number>(waitKey);
    if (firstAttempt === undefined) await this.storage.put(waitKey, Date.now());
    if (firstAttempt === undefined || Date.now() - firstAttempt < DAO_CONTENT_RETRY_MS) {
      // Keep the event unconsumed and retry next cron, allowing the producer to catch up.
      throw new DaoAlertContentError(reason);
    }
    // Permanently unavailable content must not stop all DAO governance alerts.
    console.warn(JSON.stringify({ event: "dao_content_unavailable", proposalId: proposal.id, reason }));
    return null;
  }

  async read(proposal: DaoAlertProposal): Promise<DaoAlertContent | null> {
    const key = `dao-content:v1:1:${DAO_VOTING}:${proposal.id}:${proposal.digest}`;
    const cached = await this.storage.get<DaoAlertContent>(key);
    if (cached) return cached;

    let feed: DaoFeedWire;
    try {
      this.feed ??= this.loadFeed();
      feed = await this.feed;
    } catch (error) {
      if (error instanceof DaoAlertContentError && error.code === "dao_content_service_missing") throw error;
      return this.unavailable(proposal, key, "dao_content_feed_unavailable");
    }
    if (feed.chainId !== 1 || !feed.deployments.some(d => d.votingAddress === DAO_VOTING)) {
      return this.unavailable(proposal, key, "dao_content_identity_mismatch");
    }
    const entry = feed.proposals.find(p => p.votingAddress === DAO_VOTING && p.id === proposal.id);
    if (!entry) return this.unavailable(proposal, key, "dao_content_missing");
    if (entry.contentDigest !== proposal.digest) {
      return this.unavailable(proposal, key, "dao_content_identity_mismatch");
    }
    // The chain commitment, not any feed status or vote total, authenticates the bytes.
    const content = readDaoContentBytes(entry.contentBytes, proposal.digest as Hex);
    if (content.state !== "available" || !content.value) {
      return this.unavailable(proposal, key, content.state === "invalid" ? "dao_content_invalid" : "dao_content_missing");
    }
    const parsed = parseDaoProposalContent(content.value);
    const result: DaoAlertContent = {
      title: parsed.title,
      // The message shows at most 300 escaped characters. Bound the stored excerpt too.
      summary: getDaoProposalSummary(parsed)?.slice(0, 2_000) ?? null,
      discussionUrl: getDaoDiscussionUrl(content.value.discussionUrl),
    };
    await this.storage.put(key, result);
    return result;
  }
}
