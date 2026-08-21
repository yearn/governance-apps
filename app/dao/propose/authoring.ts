import type { Address } from "viem";
import {
  checkDaoExecutorScript,
  parseDaoProposalContent,
  type DaoParsedProposalContent,
  type DaoProposalContent,
  type DaoProposalType,
  type DaoScriptCheck,
} from "@/lib/clients/dao";
import type { DaoAuthoringReview, DaoForumTopic } from "./mock-services";
import { daoProposeCopy } from "./messages";

export const DAO_PROPOSAL_MARKDOWN_TEMPLATE = `# Proposal title

A concise paragraph summarizing the proposal.

## Specification

Describe the proposed decision here.
`;

export type DaoAuthoringDraft = {
  markdown: string;
  proposalType: DaoProposalType;
  executableScript: string;
};

export type DaoAuthoringField =
  | "forum"
  | "markdown"
  | "script";

export type DaoAuthoringErrors = Partial<Record<DaoAuthoringField, string>>;

export type DaoAuthoringReviewResult =
  | { state: "valid"; review: DaoAuthoringReview }
  | {
      state: "invalid";
      errors: DaoAuthoringErrors;
      scriptCheck: DaoScriptCheck;
      contentValidation: DaoParsedProposalContent;
    };

export function createDaoAuthoringReview({
  address,
  createdAt,
  draft,
  topic,
}: {
  address: Address;
  createdAt: number;
  draft: DaoAuthoringDraft;
  topic: DaoForumTopic | null;
}): DaoAuthoringReviewResult {
  const exactScript = draft.proposalType === "signal" ? "0x" : draft.executableScript;
  const scriptCheck = checkDaoExecutorScript(exactScript, draft.proposalType);
  const errors: DaoAuthoringErrors = {};

  const content: DaoProposalContent = {
    schema: "yearn.dao.proposal.v1",
    markdown: draft.markdown,
    discussionUrl: topic?.normalizedUrl ?? "https://gov.yearn.fi/t/pending/0",
    proposalType: draft.proposalType,
    createdBy: address,
    createdAt: new Date(createdAt * 1_000).toISOString(),
    assets: [],
  };
  const contentValidation = parseDaoProposalContent(content);

  if (!topic) errors.forum = daoProposeCopy.discussion.required;
  if (contentValidation.errors.length > 0) {
    errors.markdown = contentValidation.errors[0]?.message;
  }
  if (scriptCheck.state === "invalid") {
    errors.script = scriptCheck.error?.message ?? "Check the Executor script.";
  }

  if (Object.keys(errors).length > 0 || !topic) {
    return { state: "invalid", errors, scriptCheck, contentValidation };
  }
  content.discussionUrl = topic.normalizedUrl;

  return {
    state: "valid",
    review: { topic, content, parsedContent: contentValidation, scriptCheck },
  };
}

export function findFirstFullDaoCapacityEpoch(
  epochs: readonly {
    epoch: bigint;
    currentProposalCount: number;
    proposalLimit: number;
  }[]
) {
  return (
    epochs.find(
      (epoch) => epoch.currentProposalCount >= epoch.proposalLimit
    ) ?? null
  );
}
