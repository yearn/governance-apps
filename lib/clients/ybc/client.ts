import type { Address } from "viem";
import type { YbcMockDataV1, YbcScenarioId } from "./types";

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
}
