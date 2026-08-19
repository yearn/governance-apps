import type { DaoProposalType, DaoScriptErrorCode } from "./types";

const ZERO_TARGET = "00".repeat(20);
const MOCK_VOTING_TARGET = "11".repeat(20);

function header(calldataBytes: number, target = ZERO_TARGET): string {
  return `${target}${BigInt(calldataBytes).toString(16).padStart(24, "0")}`;
}

const EMPTY_CALL = header(0);
const FOUR_BYTE_CALL = `${header(4)}12345678`;
const VOTING_EPOCH_CALL = `${header(4, MOCK_VOTING_TARGET)}900cf0cf`;
const VOTING_THRESHOLD_CALL = `${header(4, MOCK_VOTING_TARGET)}42cde4e8`;

export const DAO_EXECUTOR_VALID_SCRIPT_VECTORS = {
  emptySignal: {
    script: "0x",
    proposalType: "signal" as const,
  },
  oneCall: {
    script: `0x${FOUR_BYTE_CALL}`,
    proposalType: "executable" as const,
  },
  twoCalls: {
    script: `0x${VOTING_EPOCH_CALL}${VOTING_THRESHOLD_CALL}`,
    proposalType: "executable" as const,
  },
} as const;

export type DaoExecutorScriptErrorVector = {
  script: string;
  proposalType?: DaoProposalType;
  expectedCode: DaoScriptErrorCode;
  expectedOffset: number | null;
};

export const DAO_EXECUTOR_SCRIPT_ERROR_VECTORS: readonly DaoExecutorScriptErrorVector[] = [
  {
    script: "not-hex",
    expectedCode: "INVALID_HEX",
    expectedOffset: null,
  },
  {
    script: "0x0",
    expectedCode: "ODD_HEX_LENGTH",
    expectedOffset: 0,
  },
  {
    script: `0x${header(2_017)}${"00".repeat(2_017)}`,
    expectedCode: "SCRIPT_TOO_LARGE",
    expectedOffset: 2_048,
  },
  {
    script: `0x${"00".repeat(31)}`,
    expectedCode: "TRUNCATED_HEADER",
    expectedOffset: 0,
  },
  {
    script: `0x${header(1)}`,
    expectedCode: "CALLDATA_OUT_OF_BOUNDS",
    expectedOffset: 32,
  },
  {
    script: `0x${EMPTY_CALL.repeat(65)}`,
    expectedCode: "TOO_MANY_CALLS",
    expectedOffset: 2_048,
  },
  {
    script: `0x${EMPTY_CALL}00`,
    expectedCode: "TRAILING_BYTES",
    expectedOffset: 32,
  },
  {
    script: "0x",
    proposalType: "executable",
    expectedCode: "EMPTY_EXECUTABLE_SCRIPT",
    expectedOffset: 0,
  },
  {
    script: `0x${FOUR_BYTE_CALL}`,
    proposalType: "signal",
    expectedCode: "NON_EMPTY_SIGNAL_SCRIPT",
    expectedOffset: 0,
  },
] as const;
