import type { Address } from "viem";
import {
  checkDaoExecutorScript,
  type DaoProposalContentV1,
  type DaoProposalType,
  type DaoScriptCheck,
} from "@/lib/clients/dao";
import type { DaoAuthoringReview, DaoForumTopic } from "./mock-services";
import { daoProposeCopy } from "./messages";

export const DAO_AUTHORING_LIMITS = {
  title: 140,
  summary: 1_000,
  specification: 12_000,
} as const;

export type DaoAuthoringDraft = {
  title: string;
  summary: string;
  specification: string;
  proposalType: DaoProposalType;
  executableScript: string;
};

export type DaoAuthoringField =
  | "forum"
  | "title"
  | "summary"
  | "specification"
  | "script";

export type DaoAuthoringErrors = Partial<Record<DaoAuthoringField, string>>;

export type DaoAuthoringReviewResult =
  | { state: "valid"; review: DaoAuthoringReview }
  | { state: "invalid"; errors: DaoAuthoringErrors; scriptCheck: DaoScriptCheck };

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
  const title = draft.title;
  const summary = draft.summary;
  const specification = draft.specification;

  if (!topic) errors.forum = daoProposeCopy.discussion.required;
  if (!title.trim()) errors.title = daoProposeCopy.content.titleRequired;
  else if (title.length > DAO_AUTHORING_LIMITS.title) {
    errors.title = daoProposeCopy.content.titleTooLong(DAO_AUTHORING_LIMITS.title);
  }
  if (!summary.trim()) errors.summary = daoProposeCopy.content.summaryRequired;
  else if (summary.length > DAO_AUTHORING_LIMITS.summary) {
    errors.summary = daoProposeCopy.content.summaryTooLong(
      DAO_AUTHORING_LIMITS.summary
    );
  }
  if (!specification.trim()) {
    errors.specification = daoProposeCopy.content.specificationRequired;
  } else if (specification.length > DAO_AUTHORING_LIMITS.specification) {
    errors.specification = daoProposeCopy.content.specificationTooLong(
      DAO_AUTHORING_LIMITS.specification
    );
  }
  if (scriptCheck.state === "invalid") {
    errors.script = scriptCheck.error?.message ?? "Check the Executor script.";
  }

  if (Object.keys(errors).length > 0 || !topic) {
    return { state: "invalid", errors, scriptCheck };
  }

  const content: DaoProposalContentV1 = {
    schema: "yearn.dao.proposal.v1",
    title,
    summary,
    specification,
    discussionUrl: topic.normalizedUrl,
    proposalType: draft.proposalType,
    createdBy: address,
    createdAt: new Date(createdAt * 1_000).toISOString(),
    links: [],
  };

  return {
    state: "valid",
    review: { topic, content, scriptCheck },
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
