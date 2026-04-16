import mockExampleScenariosJson from "@/docs/apps/teams/examples/mock-data.example.json";
import {
  createTeamsScenarioCatalog,
  type TeamsClient,
} from "./client";
import type {
  TeamsMockExampleScenariosV1,
  TeamsMockScenario,
  TeamsMockScenarioId,
} from "./types";

type MockTeamsClientOptions = {
  latencyMs?: number;
};

const mockExampleScenarios = mockExampleScenariosJson as TeamsMockExampleScenariosV1;

function cloneScenario(scenario: TeamsMockScenario): TeamsMockScenario {
  if (typeof structuredClone === "function") {
    return structuredClone(scenario);
  }

  return JSON.parse(JSON.stringify(scenario)) as TeamsMockScenario;
}

function sleep(latencyMs: number) {
  if (latencyMs <= 0) return Promise.resolve();

  return new Promise<void>((resolve) => {
    setTimeout(resolve, latencyMs);
  });
}

export class MockTeamsClient implements TeamsClient {
  private readonly latencyMs: number;

  constructor({ latencyMs = 300 }: MockTeamsClientOptions = {}) {
    this.latencyMs = latencyMs;
  }

  async listScenarioCatalog() {
    await sleep(this.latencyMs);
    return createTeamsScenarioCatalog(mockExampleScenarios.scenarios);
  }

  async getScenario(id: TeamsMockScenarioId) {
    await sleep(this.latencyMs);

    const scenario = mockExampleScenarios.scenarios.find(
      (candidate) => candidate.id === id
    );

    if (!scenario) {
      throw new Error(`Unknown Teams mock scenario: ${id}`);
    }

    return cloneScenario(scenario);
  }
}

export function createMockTeamsClient(options: MockTeamsClientOptions = {}) {
  return new MockTeamsClient(options);
}
