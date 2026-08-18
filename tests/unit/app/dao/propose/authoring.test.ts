import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import {
  DAO_EXECUTOR_VALID_SCRIPT_VECTORS,
  DAO_EMPTY_SCRIPT_HASH,
} from "@/lib/clients/dao";
import {
  createDaoAuthoringReview,
  findFirstFullDaoCapacityEpoch,
} from "@/app/dao/propose/authoring";
import {
  publishMockDaoProposalContent,
  submitMockDaoProposal,
  validateMockDaoForumTopic,
} from "@/app/dao/propose/mock-services";

const ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" as Address;
const CREATED_AT = 1_723_420_800;

describe("DAO proposal authoring vectors", () => {
  it("normalizes a supported forum topic using its stable category ID", async () => {
    const result = await validateMockDaoForumTopic(
      "https://gov.yearn.fi/t/OLD-SLUG/1001/?utm_source=test#reply",
      0
    );

    expect(result).toEqual({
      state: "valid",
      topic: expect.objectContaining({
        topicId: 1001,
        normalizedUrl:
          "https://gov.yearn.fi/t/fund-protocol-research/1001",
        categoryId: 5,
        category: "Proposals",
      }),
    });
  });

  it.each([
    ["http://gov.yearn.fi/t/topic/1001", "INVALID_TOPIC_URL"],
    ["https://example.com/t/topic/1001", "INVALID_TOPIC_URL"],
    ["https://gov.yearn.fi/t/topic/404", "TOPIC_NOT_FOUND"],
    ["https://gov.yearn.fi/t/topic/2002", "WRONG_CATEGORY"],
    ["https://gov.yearn.fi/t/topic/503", "FORUM_UNAVAILABLE"],
  ])("returns %s as %s", async (url, expectedCode) => {
    const result = await validateMockDaoForumTopic(url, 0);
    expect(result).toEqual({
      state: "invalid",
      error: expect.objectContaining({ code: expectedCode }),
    });
  });

  it("builds an exact immutable Signal review with the empty script", async () => {
    const forum = await validTopic(1001);
    const result = createDaoAuthoringReview({
      address: ADDRESS,
      createdAt: CREATED_AT,
      topic: forum,
      draft: {
        title: "  Exact   title  ",
        summary: "Exact summary\nwith a second line.",
        specification: "1. Keep exact whitespace.\n2. Publish these bytes.",
        proposalType: "signal",
        executableScript: DAO_EXECUTOR_VALID_SCRIPT_VECTORS.oneCall.script,
      },
    });

    expect(result.state).toBe("valid");
    if (result.state !== "valid") return;
    expect(result.review.content.title).toBe("  Exact   title  ");
    expect(result.review.content.discussionUrl).toBe(forum.normalizedUrl);
    expect(result.review.content.createdBy).toBe(ADDRESS);
    expect(result.review.content.createdAt).toBe(
      new Date(CREATED_AT * 1_000).toISOString()
    );
    expect(result.review.scriptCheck).toMatchObject({
      state: "empty",
      script: "0x",
      scriptHash: DAO_EMPTY_SCRIPT_HASH,
      frames: [],
    });
  });

  it("keeps parser codes and byte offsets in executable form failures", async () => {
    const forum = await validTopic(1001);
    const result = createDaoAuthoringReview({
      address: ADDRESS,
      createdAt: CREATED_AT,
      topic: forum,
      draft: {
        title: "Executable proposal",
        summary: "A complete summary.",
        specification: "A complete specification.",
        proposalType: "executable",
        executableScript: `0x${"00".repeat(31)}`,
      },
    });

    expect(result).toEqual({
      state: "invalid",
      errors: expect.objectContaining({
        script: "The first Executor header is incomplete.",
      }),
      scriptCheck: expect.objectContaining({
        state: "invalid",
        error: expect.objectContaining({
          code: "TRUNCATED_HEADER",
          offset: 0,
        }),
      }),
    });
  });

  it("rejects missing immutable fields and an empty executable script", async () => {
    const result = createDaoAuthoringReview({
      address: ADDRESS,
      createdAt: CREATED_AT,
      topic: null,
      draft: {
        title: " ",
        summary: "",
        specification: "",
        proposalType: "executable",
        executableScript: "0x",
      },
    });

    expect(result.state).toBe("invalid");
    if (result.state !== "invalid") return;
    expect(result.errors).toEqual(
      expect.objectContaining({
        forum: expect.any(String),
        title: expect.any(String),
        summary: expect.any(String),
        specification: expect.any(String),
        script: "Executable proposals require at least one call.",
      })
    );
    expect(result.scriptCheck.error).toMatchObject({
      code: "EMPTY_EXECUTABLE_SCRIPT",
      offset: 0,
    });
  });

  it("finds the first full epoch in the shared rolling capacity window", () => {
    const epochs = Array.from({ length: 6 }, (_, index) => ({
      epoch: 201n + BigInt(index),
      currentProposalCount: index === 2 || index === 4 ? 64 : 12 + index,
      proposalLimit: 64,
    }));

    expect(findFirstFullDaoCapacityEpoch(epochs)?.epoch).toBe(203n);
  });
});

describe("DAO proposal authoring mock services", () => {
  it("keeps publication failure separate from the wallet service", async () => {
    const review = await validReview(1002);
    const publication = await publishMockDaoProposalContent(
      review,
      CREATED_AT,
      0
    );

    expect(publication).toEqual({
      state: "failed",
      error: expect.objectContaining({ code: "PUBLICATION_FAILED" }),
    });
  });

  it.each([
    [1003, "WALLET_REJECTED"],
    [1004, "PROPOSAL_REVERTED"],
  ])("returns proposal failure %s as %s", async (topicId, expectedCode) => {
    const review = await validReview(topicId);
    const publication = await publishMockDaoProposalContent(
      review,
      CREATED_AT,
      0
    );
    expect(publication.state).toBe("published");
    if (publication.state !== "published") return;

    const submission = await submitMockDaoProposal(
      review,
      publication.publication,
      0
    );
    expect(submission).toEqual({
      state: "failed",
      error: expect.objectContaining({ code: expectedCode }),
    });
  });

  it("submits a deterministic proposal after publication", async () => {
    const review = await validReview(1005);
    const publication = await publishMockDaoProposalContent(
      review,
      CREATED_AT,
      0
    );
    expect(publication.state).toBe("published");
    if (publication.state !== "published") return;

    const submission = await submitMockDaoProposal(
      review,
      publication.publication,
      0
    );
    expect(submission).toEqual({
      state: "submitted",
      transactionHash: expect.stringMatching(/^0x[0-9a-f]{64}$/),
    });
  });
});

async function validTopic(topicId: number) {
  const result = await validateMockDaoForumTopic(
    `https://gov.yearn.fi/t/topic/${topicId}`,
    0
  );
  if (result.state !== "valid") {
    throw new Error(`Expected topic ${topicId} to be valid.`);
  }
  return result.topic;
}

async function validReview(topicId: number) {
  const topic = await validTopic(topicId);
  const result = createDaoAuthoringReview({
    address: ADDRESS,
    createdAt: CREATED_AT,
    topic,
    draft: {
      title: "Executable proposal",
      summary: "A complete summary.",
      specification: "A complete specification.",
      proposalType: "executable",
      executableScript: DAO_EXECUTOR_VALID_SCRIPT_VECTORS.oneCall.script,
    },
  });
  if (result.state !== "valid") {
    throw new Error("Expected authoring review to be valid.");
  }
  return result.review;
}
