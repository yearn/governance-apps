import {
  decodeEventLog,
  encodeAbiParameters,
  encodeEventTopics,
  isAddressEqual,
  keccak256,
  toBytes,
  type Address,
  type Hex,
} from "viem";
import type {
  DaoProposeReceiptDecodeResult,
  DaoProposeReceiptErrorCode,
  DaoProposeReceiptExpectation,
  DaoReceiptLog,
  DaoTransactionReceipt,
} from "./types";

export const DAO_PROPOSE_EVENT_ABI = [
  {
    type: "event",
    name: "Propose",
    inputs: [
      { name: "idx", type: "uint256", indexed: true },
      { name: "proposer", type: "address", indexed: true },
      { name: "epoch", type: "uint256", indexed: true },
      { name: "ipfs", type: "bytes32", indexed: false },
      { name: "script", type: "bytes", indexed: false },
    ],
  },
] as const;

const DAO_PROPOSE_EVENT_SELECTOR = keccak256(
  toBytes("Propose(uint256,address,uint256,bytes32,bytes)")
);

export function encodeDaoProposeLog({
  address,
  contentDigest,
  logIndex,
  proposalId,
  proposer,
  script,
  votingEpoch,
}: {
  address: Address;
  contentDigest: Hex;
  logIndex: number;
  proposalId: bigint;
  proposer: Address;
  script: Hex;
  votingEpoch: bigint;
}): DaoReceiptLog {
  const topics = encodeEventTopics({
    abi: DAO_PROPOSE_EVENT_ABI,
    eventName: "Propose",
    args: {
      idx: proposalId,
      proposer,
      epoch: votingEpoch,
    },
  }).map((topic) => {
    if (typeof topic !== "string") {
      throw new Error("The Propose event requires exact scalar topics.");
    }
    return topic;
  });
  return {
    address,
    topics,
    data: encodeAbiParameters(
      [
        { name: "ipfs", type: "bytes32" },
        { name: "script", type: "bytes" },
      ],
      [contentDigest, script]
    ),
    logIndex,
  };
}

export function decodeDaoProposeReceipt(
  receipt: DaoTransactionReceipt,
  expected: DaoProposeReceiptExpectation
): DaoProposeReceiptDecodeResult {
  if (
    !Number.isSafeInteger(expected.chainId) ||
    expected.chainId <= 0 ||
    expected.votingEpoch < 0n
  ) {
    return invalid(
      "INVALID_CHAIN_CONTEXT",
      "Receipt decoding requires a positive chain ID and voting epoch."
    );
  }
  if (!sameHex(receipt.transactionHash, expected.transactionHash)) {
    return invalid(
      "TRANSACTION_HASH_MISMATCH",
      "The confirmed receipt does not belong to the submitted transaction."
    );
  }
  if (receipt.status !== "success") {
    return invalid(
      "RECEIPT_REVERTED",
      "The proposal transaction reverted and cannot supply an identity."
    );
  }

  const proposeLogs = receipt.logs.filter((log) =>
    sameHex(log.topics[0] ?? "0x", DAO_PROPOSE_EVENT_SELECTOR)
  );
  const matchingContractLogs = proposeLogs.filter((log) =>
    isAddressEqual(log.address, expected.votingAddress)
  );
  if (matchingContractLogs.length === 0) {
    return proposeLogs.length > 0
      ? invalid(
          "PROPOSE_LOG_WRONG_CONTRACT",
          "A Propose event was emitted by a different Voting contract."
        )
      : invalid(
          "PROPOSE_LOG_MISSING",
          "The successful receipt does not contain the expected Propose event."
        );
  }
  if (matchingContractLogs.length !== 1) {
    return invalid(
      "PROPOSE_LOG_DUPLICATE",
      "The receipt contains more than one matching Propose event."
    );
  }

  const log = matchingContractLogs[0];
  if (!log) {
    return invalid("PROPOSE_LOG_MISSING", "The Propose event is unavailable.");
  }

  let args: {
    idx: bigint;
    proposer: Address;
    epoch: bigint;
    ipfs: Hex;
    script: Hex;
  };
  try {
    const decoded = decodeEventLog({
      abi: DAO_PROPOSE_EVENT_ABI,
      eventName: "Propose",
      data: log.data,
      topics: log.topics as [signature: Hex, ...args: Hex[]],
      strict: true,
    });
    args = decoded.args;
  } catch {
    return invalid(
      "PROPOSE_LOG_MALFORMED",
      "The matching Propose event could not be decoded exactly."
    );
  }

  if (!isAddressEqual(args.proposer, expected.proposer)) {
    return invalid(
      "PROPOSER_MISMATCH",
      "The Propose event proposer does not match the submitting account."
    );
  }
  if (args.epoch !== expected.votingEpoch) {
    return invalid(
      "VOTING_EPOCH_MISMATCH",
      "The Propose event voting epoch does not match the reviewed eligibility."
    );
  }
  if (!sameHex(args.ipfs, expected.contentDigest)) {
    return invalid(
      "CONTENT_DIGEST_MISMATCH",
      "The Propose event content digest does not match the published content."
    );
  }
  if (!sameHex(args.script, expected.script)) {
    return invalid(
      "SCRIPT_MISMATCH",
      "The Propose event script does not match the exact reviewed script."
    );
  }

  return {
    state: "decoded",
    identity: {
      ref: {
        chainId: expected.chainId,
        votingAddress: log.address,
        proposalId: args.idx,
      },
      proposer: args.proposer,
      votingEpoch: args.epoch,
      contentDigest: args.ipfs,
      script: args.script,
      blockTimestamp: receipt.blockTimestamp,
      log: {
        blockNumber: receipt.blockNumber,
        blockHash: receipt.blockHash,
        timestamp: receipt.blockTimestamp,
        transactionHash: receipt.transactionHash,
        transactionIndex: receipt.transactionIndex,
        logIndex: log.logIndex,
      },
    },
  };
}

function invalid(
  code: DaoProposeReceiptErrorCode,
  message: string
): DaoProposeReceiptDecodeResult {
  return { state: "invalid", error: { code, message } };
}

function sameHex(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}
