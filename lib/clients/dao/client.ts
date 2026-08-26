import type { Address } from "viem";
import type { PreparedTransaction } from "@/lib/tx/types";
import type {
  DaoAccountProposalState,
  DaoAnalysis,
  DaoAnalysisJson,
  DaoBigIntJson,
  DaoFeedV1,
  DaoFeedV1Json,
  DaoProposal,
  DaoProposalEvent,
  DaoProposalEventJson,
  DaoProposalJson,
  DaoProposalLookup,
  DaoProposalRef,
  DaoProposerState,
  DaoVoteDirection,
} from "./types";
import { validateDaoVerifiedSource } from "./content";

export interface DaoClient {
  getFeed(): Promise<DaoFeedV1>;
  getProposal(ref: DaoProposalRef): Promise<DaoProposalLookup>;
  getAccountProposalState(
    ref: DaoProposalRef,
    address: Address
  ): Promise<DaoAccountProposalState>;
  getProposerState(address: Address): Promise<DaoProposerState>;
  prepareVote(
    ref: DaoProposalRef,
    address: Address,
    direction: DaoVoteDirection
  ): Promise<PreparedTransaction>;
  prepareRetract(
    ref: DaoProposalRef,
    address: Address
  ): Promise<PreparedTransaction>;
  prepareFlag(
    ref: DaoProposalRef,
    address: Address,
    reason: string
  ): Promise<PreparedTransaction>;
  prepareVeto(
    ref: DaoProposalRef,
    address: Address,
    reason: string
  ): Promise<PreparedTransaction>;
  prepareExecute(
    ref: DaoProposalRef,
    address: Address
  ): Promise<PreparedTransaction>;
}

export function parseDaoFeedJson(feed: DaoFeedV1Json): DaoFeedV1 {
  return {
    schemaVersion: feed.schemaVersion,
    chainId: feed.chainId,
    generatedAt: feed.generatedAt,
    canonicalBlock: {
      ...feed.canonicalBlock,
      number: parseDaoBigInt(feed.canonicalBlock.number),
    },
    contracts: feed.contracts.map((contract) => ({
      ...contract,
      deploymentBlock: parseDaoBigInt(contract.deploymentBlock),
    })),
    proposals: feed.proposals.map(parseDaoProposalJson),
  };
}

export function serializeDaoFeedJson(feed: DaoFeedV1): DaoFeedV1Json {
  return {
    schemaVersion: feed.schemaVersion,
    chainId: feed.chainId,
    generatedAt: feed.generatedAt,
    canonicalBlock: {
      ...feed.canonicalBlock,
      number: serializeDaoBigInt(feed.canonicalBlock.number),
    },
    contracts: feed.contracts.map((contract) => ({
      ...contract,
      deploymentBlock: serializeDaoBigInt(contract.deploymentBlock),
    })),
    proposals: feed.proposals.map(serializeDaoProposalJson),
  };
}

export function parseDaoBigInt(value: string): bigint {
  if (!/^(0|[1-9]\d*)$/.test(value)) {
    throw new Error(`DAO bigint JSON values must be canonical unsigned decimals: ${value}`);
  }
  return BigInt(value);
}

export function serializeDaoBigInt(value: bigint): DaoBigIntJson {
  if (value < 0n) {
    throw new Error("DAO bigint JSON values cannot be negative.");
  }
  return value.toString() as DaoBigIntJson;
}

export function parseDaoProposalJson(proposal: DaoProposalJson): DaoProposal {
  return {
    ...proposal,
    ref: {
      ...proposal.ref,
      proposalId: parseDaoBigInt(proposal.ref.proposalId),
    },
    votingEpoch: parseDaoBigInt(proposal.votingEpoch),
    totalWeight: parseDaoBigInt(proposal.totalWeight),
    yeaWeight: parseDaoBigInt(proposal.yeaWeight),
    nayWeight: parseDaoBigInt(proposal.nayWeight),
    content: {
      ...proposal.content,
      value:
        proposal.content.value === null
          ? null
          : {
              ...proposal.content.value,
              assets: proposal.content.value.assets.map((asset) => ({ ...asset })),
            },
    },
    discussion: {
      ...proposal.discussion,
      categorySlugPath: [...proposal.discussion.categorySlugPath],
    },
    script: { ...proposal.script },
    analysis: parseDaoAnalysisJson(proposal.analysis),
    events: proposal.events.map(parseDaoProposalEventJson),
    moderation: { ...proposal.moderation },
    rules: {
      ...proposal.rules,
      votingSource: {
        ...validateDaoVerifiedSource(proposal.rules.votingSource),
      },
      observationBlockNumber: parseDaoBigInt(
        proposal.rules.observationBlockNumber
      ),
    },
  };
}

export function serializeDaoProposalJson(proposal: DaoProposal): DaoProposalJson {
  return {
    ...proposal,
    ref: {
      ...proposal.ref,
      proposalId: serializeDaoBigInt(proposal.ref.proposalId),
    },
    votingEpoch: serializeDaoBigInt(proposal.votingEpoch),
    totalWeight: serializeDaoBigInt(proposal.totalWeight),
    yeaWeight: serializeDaoBigInt(proposal.yeaWeight),
    nayWeight: serializeDaoBigInt(proposal.nayWeight),
    content: {
      ...proposal.content,
      value:
        proposal.content.value === null
          ? null
          : {
              ...proposal.content.value,
              assets: proposal.content.value.assets.map((asset) => ({ ...asset })),
            },
    },
    discussion: {
      ...proposal.discussion,
      categorySlugPath: [...proposal.discussion.categorySlugPath],
    },
    script: { ...proposal.script },
    analysis: serializeDaoAnalysisJson(proposal.analysis),
    events: proposal.events.map(serializeDaoProposalEventJson),
    moderation: { ...proposal.moderation },
    rules: {
      ...proposal.rules,
      votingSource: { ...proposal.rules.votingSource },
      observationBlockNumber: serializeDaoBigInt(
        proposal.rules.observationBlockNumber
      ),
    },
  };
}

function parseDaoAnalysisJson(analysis: DaoAnalysisJson): DaoAnalysis {
  return {
    ...analysis,
    calls: analysis.calls.map((call) => ({
      ...call,
      arguments: call.arguments.map((argument) => ({ ...argument })),
      verifiedSource:
        call.verifiedSource === null
          ? null
          : { ...validateDaoVerifiedSource(call.verifiedSource) },
    })),
    proposalSimulation: {
      ...analysis.proposalSimulation,
      blockNumber:
        analysis.proposalSimulation.blockNumber === null
          ? null
          : parseDaoBigInt(analysis.proposalSimulation.blockNumber),
    },
  };
}

function serializeDaoAnalysisJson(analysis: DaoAnalysis): DaoAnalysisJson {
  return {
    ...analysis,
    calls: analysis.calls.map((call) => ({
      ...call,
      arguments: call.arguments.map((argument) => ({ ...argument })),
      verifiedSource:
        call.verifiedSource === null ? null : { ...call.verifiedSource },
    })),
    proposalSimulation: {
      ...analysis.proposalSimulation,
      blockNumber:
        analysis.proposalSimulation.blockNumber === null
          ? null
          : serializeDaoBigInt(analysis.proposalSimulation.blockNumber),
    },
  };
}

function parseDaoProposalEventJson(
  event: DaoProposalEventJson
): DaoProposalEvent {
  return {
    ...event,
    log: {
      ...event.log,
      blockNumber: parseDaoBigInt(event.log.blockNumber),
    },
    weight: event.weight === null ? null : parseDaoBigInt(event.weight),
  };
}

function serializeDaoProposalEventJson(
  event: DaoProposalEvent
): DaoProposalEventJson {
  return {
    ...event,
    log: {
      ...event.log,
      blockNumber: serializeDaoBigInt(event.log.blockNumber),
    },
    weight: event.weight === null ? null : serializeDaoBigInt(event.weight),
  };
}
