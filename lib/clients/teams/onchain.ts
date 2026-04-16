import type { TeamsClient, TeamsScenarioCatalogEntry } from "./client";
import type { TeamsMockScenario, TeamsMockScenarioId } from "./types";

export class OnchainTeamsClient implements TeamsClient {
  async listScenarioCatalog(): Promise<TeamsScenarioCatalogEntry[]> {
    throw new Error("Teams onchain scenario catalog is not implemented.");
  }

  async getScenario(_id: TeamsMockScenarioId): Promise<TeamsMockScenario> {
    void _id;
    throw new Error("Teams onchain scenarios are not implemented.");
  }
}
