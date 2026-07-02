import type { Address } from "viem";
import type { PreparedTransaction } from "@/lib/tx/types";
import type {
  YbcMockDataV1,
  YbcProposalType,
  YbcScenarioId,
  YbcVoteChoice,
} from "./types";

export type YbcPrototypeScenarioId = YbcScenarioId | "empty";

export type YbcPageState = {
  scenarioId: YbcPrototypeScenarioId;
  label: string;
  data: YbcMockDataV1;
};

export interface YbcClient {
  getPageState(options?: {
    scenarioId?: YbcPrototypeScenarioId;
  }): Promise<YbcPageState>;
  resolveDefaultScenario(address?: Address | null): YbcScenarioId;
  preparePropose(
    type: YbcProposalType,
    target: Address
  ): Promise<PreparedTransaction>;
  prepareRetract(proposalId: bigint): Promise<PreparedTransaction>;
  prepareVote(
    proposalId: bigint,
    choice: YbcVoteChoice
  ): Promise<PreparedTransaction>;
  prepareExecute(proposalId: bigint): Promise<PreparedTransaction>;
}
