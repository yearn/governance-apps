import { isTreasuryMockRuntimeEnabled } from "@/lib/runtime/features";
import { createMockTreasuryClient, type TreasuryMockScenario } from "./mock";
import { createLiveTreasuryClient } from "./onchain";
import type { TreasuryClient } from "./types";

// One public source per browser runtime, retained across route remounts.
let liveClient: TreasuryClient | undefined;

export function createTreasuryClient(scenario: TreasuryMockScenario = "ready"): TreasuryClient {
  if (isTreasuryMockRuntimeEnabled()) return createMockTreasuryClient(scenario);
  liveClient ??= createLiveTreasuryClient();
  return liveClient;
}
