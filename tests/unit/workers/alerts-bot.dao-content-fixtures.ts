import { sha256 } from "viem";
import { canonicalizeDaoProposalContent } from "@/lib/clients/dao/content";
import { createV2Example, v2Base64 } from "../../fixtures/dao-feed-v2";
import { DAO_VOTING } from "@/workers/alerts-bot/src/domains/dao/contracts";
import { ACCOUNT, proposal } from "./alerts-bot.dao-fixtures";

export const contentBytes = canonicalizeDaoProposalContent({
  schema: "yearn.dao.proposal.v1",
  markdown: "# Fund research\n\nAuthor: DAO contributors.\n\n## 1. Summary\n\nPublish the research results.\n\n## Specification\n\nApprove the budget.\n",
  discussionUrl: "https://gov.yearn.fi/t/research/123", proposalType: "executable", createdBy: ACCOUNT,
  createdAt: "2026-10-02T12:00:00.000Z", assets: [],
});
export const contentProposal = { ...proposal, digest: sha256(contentBytes) };

export function daoContentFeed() {
  const feed = createV2Example();
  feed.deployments = [{ ...feed.deployments[0]!, votingAddress: DAO_VOTING, proposalCount: "1" }];
  feed.proposals = [{ ...feed.proposals[0]!, votingAddress: DAO_VOTING,
    contentDigest: contentProposal.digest, contentBytes: v2Base64(contentBytes) }];
  return feed;
}

export class ContentStorage {
  readonly values = new Map<string, unknown>();
  async get<T>(key: string): Promise<T | undefined> { return structuredClone(this.values.get(key)) as T | undefined; }
  async put(key: string, value: unknown): Promise<void> { this.values.set(key, structuredClone(value)); }
}
