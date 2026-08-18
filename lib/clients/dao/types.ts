import type { Address, Hex } from "viem";

export type DaoUnixSeconds = number;
export type DaoProposalType = "signal" | "executable";
export type DaoVoteDirection = "yea" | "nay";

export type DaoProposalRef = {
  chainId: number;
  votingAddress: Address;
  proposalId: bigint;
};

export type DaoProtocolStatus =
  | "proposed"
  | "retracted"
  | "voting"
  | "passed"
  | "failed"
  | "executed"
  | "expired"
  | "invalid"
  | "flagged"
  | "vetoed";

export type DaoDisplayStatus =
  | "discussion"
  | "voting"
  | "approved"
  | "rejected"
  | "executed"
  | "expired"
  | "retracted"
  | "flagged"
  | "vetoed"
  | "not_found";

export type DaoDisplayGroup = "active" | "upcoming" | "closed";
export type DaoVotePurpose = "decision" | "participation_only";
export type DaoExecutionGuard = "guarded" | "permissionless";

export type DaoCapabilities = {
  canVote: boolean;
  votePurpose: DaoVotePurpose | null;
  voteBlockedReason: string | null;
  canRetract: boolean;
  retractBlockedReason: string | null;
  canFlag: boolean;
  flagBlockedReason: string | null;
  canVeto: boolean;
  vetoBlockedReason: string | null;
  canExecute: boolean;
  executeBlockedReason: string | null;
};

export type DaoProposalContentV1 = {
  schema: "yearn.dao.proposal.v1";
  title: string;
  summary: string;
  specification: string;
  discussionUrl: string;
  proposalType: DaoProposalType;
  createdBy: Address;
  createdAt: string;
  links: Array<{ label: string; url: string }>;
};

export type DaoScriptFrame = {
  index: number;
  offset: number;
  target: Address;
  calldata: Hex;
  calldataBytes: number;
  selector: Hex | null;
};

export type DaoScriptErrorCode =
  | "INVALID_HEX"
  | "ODD_HEX_LENGTH"
  | "SCRIPT_TOO_LARGE"
  | "TRUNCATED_HEADER"
  | "CALLDATA_OUT_OF_BOUNDS"
  | "TOO_MANY_CALLS"
  | "TRAILING_BYTES"
  | "EMPTY_EXECUTABLE_SCRIPT"
  | "NON_EMPTY_SIGNAL_SCRIPT";

export type DaoScriptError = {
  code: DaoScriptErrorCode;
  message: string;
  offset: number | null;
};

/**
 * Raw author input remains a string until syntax validation succeeds. Byte count
 * and hash are therefore unavailable for malformed or odd-length input.
 */
export type DaoScriptCheck = {
  state: "empty" | "valid" | "invalid";
  script: string;
  scriptBytes: number | null;
  scriptHash: Hex | null;
  frames: DaoScriptFrame[];
  error: DaoScriptError | null;
};

export type DaoDecodedCall = DaoScriptFrame & {
  decodeStatus: "verified" | "unknown" | "failed";
  contractName: string | null;
  functionSignature: string | null;
  arguments: Array<{ name: string; type: string; value: string }>;
  abiSource: string | null;
};

export type DaoSimulation = {
  state: "pending" | "succeeded" | "failed" | "unavailable";
  method: "atomic_script_at_state" | null;
  engine: string | null;
  blockNumber: bigint | null;
  blockHash: Hex | null;
  simulatedAt: string | null;
  stateTimestamp: number | null;
  timestampMode: "block" | "override" | null;
  timestampOverride: number | null;
  caller: Address | null;
  stateOverrides: string | null;
  error: string | null;
};

export type DaoAnalysis = {
  state: "pending" | "complete" | "partial" | "failed" | "unavailable";
  generatedAt: string | null;
  registryVersion: string | null;
  calls: DaoDecodedCall[];
  proposalSimulation: DaoSimulation;
  error: string | null;
};

export type DaoExecutionPreflight = {
  state: "idle" | "simulating" | "succeeded" | "failed";
  scriptHash: Hex;
  blockNumber: bigint | null;
  simulatedAt: string | null;
  error: string | null;
};

export type DaoLogRef = {
  blockNumber: bigint;
  blockHash: Hex;
  transactionHash: Hex;
  transactionIndex: number;
  logIndex: number;
};

export type DaoProposalEvent = {
  type: "propose" | "vote" | "retract" | "flag" | "veto" | "execute";
  log: DaoLogRef;
  actor: Address;
  voteActorKind: "human" | "ybc_aggregate" | "styfix_aggregate" | null;
  yeaBps: number | null;
  direction: DaoVoteDirection | null;
  weight: bigint | null;
  reason: string | null;
};

export type DaoProposal = {
  ref: DaoProposalRef;
  proposer: Address;
  votingEpoch: bigint;
  createdAt: DaoUnixSeconds;
  voteStartsAt: DaoUnixSeconds;
  voteEndsAt: DaoUnixSeconds;
  executionStartsAt: DaoUnixSeconds | null;
  executionEndsAt: DaoUnixSeconds | null;
  thresholdBps: number;
  totalWeight: bigint;
  yeaWeight: bigint;
  nayWeight: bigint;
  protocolStatus: DaoProtocolStatus;
  displayStatus: DaoDisplayStatus;
  displayGroup: DaoDisplayGroup;
  type: DaoProposalType;
  content: {
    state: "available" | "unavailable" | "invalid";
    cid: string | null;
    digest: Hex;
    value: DaoProposalContentV1 | null;
    error: string | null;
  };
  discussion: {
    state: "verified" | "unverified" | "unavailable";
    url: string | null;
    title: string | null;
    categoryId: number | null;
    category: string | null;
    categorySlugPath: string[];
  };
  script: {
    bytes: Hex | null;
    hash: Hex;
    hashVerified: boolean | null;
  };
  analysis: DaoAnalysis;
  events: DaoProposalEvent[];
  moderation: {
    flagReason: string | null;
    vetoReason: string | null;
  };
};

export type DaoAccountProposalFacts = {
  address: Address;
  connected: boolean;
  correctChain: boolean;
  votingWeight: bigint;
  effectiveVotingWeight: bigint;
  decayBps: number;
  hasVoted: boolean;
  voteDirection: DaoVoteDirection | null;
  isProposer: boolean;
  isOperator: boolean;
  isGuardian: boolean;
  executionPreflight: DaoExecutionPreflight;
};

export type DaoAccountProposalState = DaoAccountProposalFacts & {
  capabilities: DaoCapabilities;
};

export type DaoAffectedBoostEpoch = {
  epoch: bigint;
  currentProposalCount: number;
  proposalLimit: 64;
};

export type DaoProposerEligibilityInput = {
  address: Address;
  connected: boolean;
  correctChain: boolean;
  now: DaoUnixSeconds;
  currentWeight: bigint;
  minimumWeight: bigint;
  blacklisted: boolean;
  lastProposedAt: DaoUnixSeconds | null;
  cooldownSeconds: number;
  expectedVotingEpoch: bigint;
  affectedBoostEpochs: DaoAffectedBoostEpoch[];
};

export type DaoProposerState = {
  address: Address;
  connected: boolean;
  correctChain: boolean;
  canPropose: boolean;
  proposeBlockedReason: string | null;
  currentWeight: bigint;
  minimumWeight: bigint;
  blacklisted: boolean;
  lastProposedAt: DaoUnixSeconds | null;
  nextEligibleAt: DaoUnixSeconds;
  expectedVotingEpoch: bigint;
  affectedBoostEpochs: DaoAffectedBoostEpoch[];
};

export type DaoFeedContract = {
  votingAddress: Address;
  voterAddress: Address;
  executorAddress: Address;
  deploymentBlock: bigint;
  active: boolean;
};

export type DaoFeedV1 = {
  schemaVersion: 1;
  chainId: number;
  generatedAt: string;
  canonicalBlock: {
    number: bigint;
    hash: Hex;
    timestamp: DaoUnixSeconds;
  };
  contracts: DaoFeedContract[];
  proposals: DaoProposal[];
};

export type DaoProposalLookup =
  | { state: "found"; proposal: DaoProposal }
  | {
      state: "not_found";
      ref: DaoProposalRef;
      protocolStatus: "invalid";
      displayStatus: "not_found";
    };

/** Base-10 unsigned integer used only at a JSON boundary. */
export type DaoBigIntJson = `${bigint}`;

export type DaoSimulationJson = Omit<DaoSimulation, "blockNumber"> & {
  blockNumber: DaoBigIntJson | null;
};

export type DaoAnalysisJson = Omit<DaoAnalysis, "proposalSimulation"> & {
  proposalSimulation: DaoSimulationJson;
};

export type DaoProposalEventJson = Omit<DaoProposalEvent, "log" | "weight"> & {
  log: Omit<DaoLogRef, "blockNumber"> & { blockNumber: DaoBigIntJson };
  weight: DaoBigIntJson | null;
};

export type DaoProposalJson = Omit<
  DaoProposal,
  | "ref"
  | "votingEpoch"
  | "totalWeight"
  | "yeaWeight"
  | "nayWeight"
  | "analysis"
  | "events"
> & {
  ref: Omit<DaoProposalRef, "proposalId"> & {
    proposalId: DaoBigIntJson;
  };
  votingEpoch: DaoBigIntJson;
  totalWeight: DaoBigIntJson;
  yeaWeight: DaoBigIntJson;
  nayWeight: DaoBigIntJson;
  analysis: DaoAnalysisJson;
  events: DaoProposalEventJson[];
};

export type DaoFeedV1Json = Omit<
  DaoFeedV1,
  "canonicalBlock" | "contracts" | "proposals"
> & {
  canonicalBlock: Omit<DaoFeedV1["canonicalBlock"], "number"> & {
    number: DaoBigIntJson;
  };
  contracts: Array<
    Omit<DaoFeedContract, "deploymentBlock"> & {
      deploymentBlock: DaoBigIntJson;
    }
  >;
  proposals: DaoProposalJson[];
};

export type DaoProposalLifecycleInput = {
  exists: boolean;
  now: DaoUnixSeconds;
  voteStartsAt: DaoUnixSeconds;
  voteEndsAt: DaoUnixSeconds;
  postVoteEpochEndsAt: DaoUnixSeconds;
  type: DaoProposalType;
  thresholdBps: number;
  totalWeight: bigint;
  yeaWeight: bigint;
  retracted: boolean;
  executed: boolean;
  flagged: boolean;
  vetoed: boolean;
};

export type DaoProposalTimingInput = {
  genesis: DaoUnixSeconds;
  createdAt: DaoUnixSeconds;
  epochLengthSeconds: number;
  voteStartOffsetSeconds: number;
  executionDelaySeconds: number;
};

export type DaoProposalTiming = {
  votingEpoch: bigint;
  voteStartsAt: DaoUnixSeconds;
  voteEndsAt: DaoUnixSeconds;
  executionStartsAt: DaoUnixSeconds;
  executionEndsAt: DaoUnixSeconds;
};

export type DaoVotingWeightInput = {
  votingWeight: bigint;
  now: DaoUnixSeconds;
  voteEndsAt: DaoUnixSeconds;
  decayLengthSeconds: number;
};

export type DaoVotingWeight = {
  votingWeight: bigint;
  effectiveVotingWeight: bigint;
  decayBps: number;
};

export type DaoCapabilityInput = {
  proposal: DaoProposal;
  account: DaoAccountProposalFacts;
  now: DaoUnixSeconds;
  vetoEndsAt: DaoUnixSeconds;
  executionGuard: DaoExecutionGuard;
};

export type DaoMockFixtureId =
  | "discussion"
  | "voting"
  | "late-voting"
  | "approved-signal"
  | "approved-executable"
  | "executed"
  | "rejected"
  | "no-votes"
  | "expired"
  | "retracted"
  | "flagged"
  | "early-veto"
  | "post-vote-veto"
  | "content-unavailable"
  | "content-invalid"
  | "analysis-pending"
  | "partial-decode"
  | "simulation-failed"
  | "hash-mismatch"
  | "direct-proposal"
  | "guarded-execution"
  | "permissionless-execution"
  | "proposal-capacity-full";

export type DaoMockFixture = {
  id: DaoMockFixtureId;
  label: string;
  now: DaoUnixSeconds;
  vetoEndsAt: DaoUnixSeconds;
  proposalRef: DaoProposalRef;
  account: DaoAccountProposalFacts;
  proposer: DaoProposerEligibilityInput;
  executionGuard: DaoExecutionGuard;
};
