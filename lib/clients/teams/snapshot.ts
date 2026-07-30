import type { PublicClient } from "viem";
import { TeamRegistryAbi } from "@/lib/abis/TeamRegistry";
import type { TeamsFeed } from "@/lib/schemas/teams-feed";
import {
  assertSameTeamsAddress,
  assertTeamsMainnetDeployment,
  TEAMS_MAINNET_DEPLOYMENT,
} from "./deployment";
import {
  verifyTeamsSnapshotBlock,
  type TeamsVerifiedBlock,
} from "./canonical-block";

export const TEAMS_SNAPSHOT_MAX_REORG_ROLLBACK_BLOCKS = 2n;

export type TeamsCanonicalSnapshot = TeamsVerifiedBlock & {
  numTeams: bigint;
};

export async function readTeamsCanonicalSnapshot(
  publicClient: PublicClient,
  feed: TeamsFeed,
  previousSnapshot: TeamsCanonicalSnapshot | null = null
): Promise<TeamsCanonicalSnapshot> {
  assertTeamsMainnetDeployment(feed);
  const verifiedBlock = await verifyTeamsSnapshotBlock(
    publicClient,
    feed
  );
  const blockNumber = verifiedBlock.blockNumber;
  const [numTeams, implementation, revenueRecipient, fundingDistributor] =
    await Promise.all([
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
        abi: TeamRegistryAbi,
        functionName: "num_teams",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
        abi: TeamRegistryAbi,
        functionName: "implementation",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
        abi: TeamRegistryAbi,
        functionName: "revenue_recipient",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
        abi: TeamRegistryAbi,
        functionName: "funding_distributor",
        blockNumber,
      }),
    ]);

  if (numTeams !== BigInt(feed.events.teamCount)) {
    throw new Error(
      "The Teams registry count does not match the canonical snapshot."
    );
  }
  assertSameTeamsAddress(
    implementation,
    TEAMS_MAINNET_DEPLOYMENT.teamImplementation,
    "registry implementation"
  );
  assertSameTeamsAddress(
    revenueRecipient,
    TEAMS_MAINNET_DEPLOYMENT.revenueRecipient,
    "registry revenue recipient"
  );
  assertSameTeamsAddress(
    fundingDistributor,
    TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
    "registry funding distributor"
  );

  const finalVerifiedBlock = await verifyTeamsSnapshotBlock(
    publicClient,
    feed
  );
  const snapshot = {
    ...finalVerifiedBlock,
    numTeams,
  };
  assertTeamsSnapshotTransition(previousSnapshot, snapshot);
  return snapshot;
}

export function assertTeamsSnapshotTransition(
  previousSnapshot: TeamsCanonicalSnapshot | null,
  nextSnapshot: TeamsCanonicalSnapshot
): void {
  if (
    previousSnapshot &&
    nextSnapshot.blockNumber +
      TEAMS_SNAPSHOT_MAX_REORG_ROLLBACK_BLOCKS <
      previousSnapshot.blockNumber
  ) {
    throw new Error(
      "The Teams snapshot rolled back beyond the supported canonical reorg window. Actions are paused."
    );
  }
}
