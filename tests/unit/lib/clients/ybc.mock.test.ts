import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { createMockYbcClient } from "@/lib/clients/ybc";

describe("MockYbcClient", () => {
  it("defaults to the observer scenario when no address is present", () => {
    const client = createMockYbcClient({ latencyMs: 0 });

    expect(client.resolveDefaultScenario(null)).toBe("observer");
  });

  it("maps a seeded member address to the matching member scenario", () => {
    const client = createMockYbcClient({ latencyMs: 0 });

    expect(
      client.resolveDefaultScenario(
        "0x2222222222222222222222222222222222222222" as Address
      )
    ).toBe("member-matured");
    expect(
      client.resolveDefaultScenario(
        "0x1111111111111111111111111111111111111111" as Address
      )
    ).toBe("member-ramping");
  });

  it("builds an empty state without seeded roster rows or active counts", async () => {
    const client = createMockYbcClient({ latencyMs: 0 });
    const state = await client.getPageState({ scenarioId: "empty" });

    expect(state.scenarioId).toBe("empty");
    expect(state.data.roster.members).toHaveLength(0);
    expect(state.data.hero.memberCount).toBe(0);
    expect(state.data.hero.internalWeight).toBe("0");
    expect(state.data.proposals.summary.activeCount).toBe(0);
  });
});
