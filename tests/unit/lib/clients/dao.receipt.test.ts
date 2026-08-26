import { describe, expect, it } from "vitest";
import type { Address, Hex } from "viem";
import {
  decodeDaoProposeReceipt,
  encodeDaoProposeLog,
  type DaoProposeReceiptExpectation,
  type DaoTransactionReceipt,
} from "@/lib/clients/dao";

const VOTING = "0x1111111111111111111111111111111111111111" as Address;
const WRONG_VOTING = "0x9999999999999999999999999999999999999999" as Address;
const PROPOSER = "0x4444444444444444444444444444444444444444" as Address;
const TRANSACTION_HASH = `0x${"ab".repeat(32)}` as Hex;
const BLOCK_HASH = `0x${"cd".repeat(32)}` as Hex;
const DIGEST = `0x${"12".repeat(32)}` as Hex;
const SCRIPT = "0x" as Hex;
const PROPOSAL_ID = 4_201n;
const VOTING_EPOCH = 205n;

function receipt(
  patch: Partial<DaoTransactionReceipt> = {}
): DaoTransactionReceipt {
  return {
    status: "success",
    transactionHash: TRANSACTION_HASH,
    blockNumber: 24_000_001n,
    blockHash: BLOCK_HASH,
    blockTimestamp: 1_787_054_412,
    transactionIndex: 3,
    logs: [
      encodeDaoProposeLog({
        address: VOTING,
        proposalId: PROPOSAL_ID,
        proposer: PROPOSER,
        votingEpoch: VOTING_EPOCH,
        contentDigest: DIGEST,
        script: SCRIPT,
        logIndex: 7,
      }),
    ],
    ...patch,
  };
}

function expectation(
  patch: Partial<DaoProposeReceiptExpectation> = {}
): DaoProposeReceiptExpectation {
  return {
    chainId: 1,
    votingAddress: VOTING,
    transactionHash: TRANSACTION_HASH,
    proposer: PROPOSER,
    votingEpoch: VOTING_EPOCH,
    contentDigest: DIGEST,
    script: SCRIPT,
    ...patch,
  };
}

describe("DAO Propose receipt decoding", () => {
  it("derives the complete proposal reference only from one bound event", () => {
    const result = decodeDaoProposeReceipt(receipt(), expectation());

    expect(result).toEqual({
      state: "decoded",
      identity: {
        ref: {
          chainId: 1,
          votingAddress: VOTING,
          proposalId: PROPOSAL_ID,
        },
        proposer: PROPOSER,
        votingEpoch: VOTING_EPOCH,
        contentDigest: DIGEST,
        script: SCRIPT,
        blockTimestamp: 1_787_054_412,
        log: {
          blockNumber: 24_000_001n,
          blockHash: BLOCK_HASH,
          timestamp: 1_787_054_412,
          transactionHash: TRANSACTION_HASH,
          transactionIndex: 3,
          logIndex: 7,
        },
      },
    });
  });

  it.each([
    [
      "transaction hash",
      receipt(),
      expectation({ transactionHash: `0x${"ef".repeat(32)}` as Hex }),
      "TRANSACTION_HASH_MISMATCH",
    ],
    [
      "reverted receipt",
      receipt({ status: "reverted" }),
      expectation(),
      "RECEIPT_REVERTED",
    ],
    [
      "missing event",
      receipt({ logs: [] }),
      expectation(),
      "PROPOSE_LOG_MISSING",
    ],
    [
      "wrong Voting contract",
      receipt({
        logs: [
          encodeDaoProposeLog({
            address: WRONG_VOTING,
            proposalId: PROPOSAL_ID,
            proposer: PROPOSER,
            votingEpoch: VOTING_EPOCH,
            contentDigest: DIGEST,
            script: SCRIPT,
            logIndex: 7,
          }),
        ],
      }),
      expectation(),
      "PROPOSE_LOG_WRONG_CONTRACT",
    ],
    [
      "proposer",
      receipt(),
      expectation({
        proposer: "0x5555555555555555555555555555555555555555",
      }),
      "PROPOSER_MISMATCH",
    ],
    [
      "voting epoch",
      receipt(),
      expectation({ votingEpoch: VOTING_EPOCH + 1n }),
      "VOTING_EPOCH_MISMATCH",
    ],
    [
      "content digest",
      receipt(),
      expectation({ contentDigest: `0x${"34".repeat(32)}` as Hex }),
      "CONTENT_DIGEST_MISMATCH",
    ],
    [
      "script",
      receipt(),
      expectation({ script: "0x00" }),
      "SCRIPT_MISMATCH",
    ],
  ] as const)("rejects a mismatched %s", (_label, value, expected, code) => {
    expect(decodeDaoProposeReceipt(value, expected)).toMatchObject({
      state: "invalid",
      error: { code },
    });
  });

  it("rejects duplicate matching Propose logs", () => {
    const first = receipt().logs[0];
    expect(first).toBeDefined();
    const result = decodeDaoProposeReceipt(
      receipt({
        logs: [
          first!,
          {
            ...first!,
            logIndex: first!.logIndex + 1,
          },
        ],
      }),
      expectation()
    );

    expect(result).toMatchObject({
      state: "invalid",
      error: { code: "PROPOSE_LOG_DUPLICATE" },
    });
  });

  it("rejects a malformed matching log", () => {
    const log = receipt().logs[0];
    expect(log).toBeDefined();
    const result = decodeDaoProposeReceipt(
      receipt({ logs: [{ ...log!, data: "0x" }] }),
      expectation()
    );

    expect(result).toMatchObject({
      state: "invalid",
      error: { code: "PROPOSE_LOG_MALFORMED" },
    });
  });

  it.each([
    [
      "a fifth topic",
      () => {
        const log = receipt().logs[0]!;
        return {
          log: {
            ...log,
            topics: [...log.topics, `0x${"00".repeat(32)}` as Hex],
          },
          expected: expectation(),
        };
      },
    ],
    [
      "noncanonical indexed-address padding",
      () => {
        const log = receipt().logs[0]!;
        const topics = [...log.topics];
        topics[2] = `0x01${"00".repeat(11)}${PROPOSER.slice(2)}` as Hex;
        return { log: { ...log, topics }, expected: expectation() };
      },
    ],
    [
      "a trailing ABI word",
      () => {
        const log = receipt().logs[0]!;
        return {
          log: {
            ...log,
            data: `${log.data}${"00".repeat(32)}` as Hex,
          },
          expected: expectation(),
        };
      },
    ],
    [
      "a noncanonical dynamic offset",
      () => {
        const log = receipt().logs[0]!;
        const word = (value: string) => value.padStart(64, "0");
        return {
          log: {
            ...log,
            data: `0x${DIGEST.slice(2)}${word("60")}${word("0")}${word("0")}` as Hex,
          },
          expected: expectation(),
        };
      },
    ],
    [
      "nonzero dynamic padding",
      () => {
        const log = encodeDaoProposeLog({
          address: VOTING,
          proposalId: PROPOSAL_ID,
          proposer: PROPOSER,
          votingEpoch: VOTING_EPOCH,
          contentDigest: DIGEST,
          script: "0x01",
          logIndex: 7,
        });
        return {
          log: {
            ...log,
            data: `${log.data.slice(0, -2)}01` as Hex,
          },
          expected: expectation({ script: "0x01" }),
        };
      },
    ],
  ] as const)("rejects %s as a noncanonical log", (_label, makeVector) => {
    const { log, expected } = makeVector();
    const result = decodeDaoProposeReceipt(receipt({ logs: [log] }), expected);

    expect(result).toEqual({
      state: "invalid",
      error: {
        code: "PROPOSE_LOG_MALFORMED",
        message: "The matching Propose event could not be decoded exactly.",
      },
    });
    expect(result).not.toHaveProperty("identity");
  });
});
