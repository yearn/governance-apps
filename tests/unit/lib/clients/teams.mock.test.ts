import { describe, expect, it } from "vitest";
import {
  createMockTeamsClient,
  resolveSelectedTeam,
} from "@/lib/clients/teams";

describe("MockTeamsClient", () => {
  it("lists the stable scenario catalog order", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });

    const catalog = await client.listScenarioCatalog();

    expect(catalog.map((entry) => entry.id)).toEqual([
      "directory-observer",
      "team-owner-funding",
      "bonus-available",
      "finance-operator-revenue",
      "retired-read-only",
      "operator-admin",
    ]);
  });

  it("returns cloned scenario payloads so local UI state cannot mutate the source data", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });

    const firstScenario = await client.getScenario("directory-observer");
    firstScenario.data.teams[0].name = "Changed";

    const secondScenario = await client.getScenario("directory-observer");

    expect(secondScenario.data.teams[0].name).toBe("Platform");
  });

  it("resolves the selected team from scenario defaults or explicit team ids", async () => {
    const client = createMockTeamsClient({ latencyMs: 0 });
    const scenario = await client.getScenario("team-owner-funding");

    expect(resolveSelectedTeam(scenario.data)?.id).toBe("security");
    expect(resolveSelectedTeam(scenario.data, "security")?.name).toBe("Security");
    expect(resolveSelectedTeam(scenario.data, "does-not-exist")).toBeNull();
  });
});
