import type { Address } from "viem";
import type { TeamsFeed } from "@/lib/schemas/teams-feed";
import { MAINNET_CHAIN_ID } from "@/lib/tx/network";

export const TEAMS_MAINNET_DEPLOYMENT = {
  budgetGenesis: 1_762_992_000,
  budgetPeriodLengthSeconds: 7_257_600,
  deployBlock: 25_244_861,
  teamRegistry: "0x9da431b8A5b5962ebFF1d1876DdB0f336a372F29",
  teamImplementation: "0xa59B34c87f97Bdf95Ab3E532FD9b7D1Fcd23BF43",
  teamAccountant: "0x1c221980AAb2E52Ccc02180E0c171Ca5E5ffDFD6",
  revenueRecipient: "0x5B5AB518F532Ce260A5d2795E1eEc544FC159587",
  revenuePriceOracle: "0xC1f9b548afcBe850f2BEbA8a50E55d86f4ABaE2E",
  fundingDistributor: "0xbCc932e4750C3E465A7E54A06A34F9EdF8f6116b",
  // Mainnet getters at block 25,612,604; provenance is recorded in the Teams README.
  fundingVestingFactory: "0x200C92Dd85730872Ab6A1e7d5E40A067066257cF",
  fundingVestingOwner: "0xFeb4ACf3df3cDEA7399794D0869ef76A6EfAff52",
  bonusDistributor: "0xA66002E9ab0BABf46882D0E0cd274f46CEb13116",
  bonusPriceOracle: "0x7e417e19fe3f72798E1094E8dF185378370cb416",
  ybcBonusRecipient: "0xf03a919a59f8381bE220511eCf788b15FB039e4C",
  yfi: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
} as const satisfies {
  budgetGenesis: number;
  budgetPeriodLengthSeconds: number;
  deployBlock: number;
  teamRegistry: Address;
  teamImplementation: Address;
  teamAccountant: Address;
  revenueRecipient: Address;
  revenuePriceOracle: Address;
  fundingDistributor: Address;
  fundingVestingFactory: Address;
  fundingVestingOwner: Address;
  bonusDistributor: Address;
  bonusPriceOracle: Address;
  ybcBonusRecipient: Address;
  yfi: Address;
  multicall3: Address;
};

const ADDRESS_FIELDS = [
  "teamRegistry",
  "teamImplementation",
  "teamAccountant",
  "revenueRecipient",
  "revenuePriceOracle",
  "fundingDistributor",
  "bonusDistributor",
  "bonusPriceOracle",
  "ybcBonusRecipient",
  "yfi",
  "multicall3",
] as const;

export function assertTeamsMainnetDeployment(feed: TeamsFeed): void {
  if (feed.chainId !== MAINNET_CHAIN_ID) {
    throw new Error("Teams feed must target Ethereum Mainnet.");
  }

  if (
    feed.deployment.budgetGenesis !==
    TEAMS_MAINNET_DEPLOYMENT.budgetGenesis
  ) {
    throw new Error("Teams feed deployment mismatch: budgetGenesis.");
  }

  if (
    feed.deployment.deployBlock !== TEAMS_MAINNET_DEPLOYMENT.deployBlock
  ) {
    throw new Error("Teams feed deployment mismatch: deployBlock.");
  }

  if (
    feed.periods.lengthSeconds !==
    TEAMS_MAINNET_DEPLOYMENT.budgetPeriodLengthSeconds
  ) {
    throw new Error("Teams feed deployment mismatch: periods.lengthSeconds.");
  }

  for (const field of ADDRESS_FIELDS) {
    assertSameTeamsAddress(
      feed.deployment[field],
      TEAMS_MAINNET_DEPLOYMENT[field],
      `deployment.${field}`
    );
  }

  assertSameTeamsAddress(
    feed.revenueRecipient.address,
    TEAMS_MAINNET_DEPLOYMENT.revenueRecipient,
    "revenueRecipient.address"
  );
  assertSameTeamsAddress(
    feed.bonus.token,
    TEAMS_MAINNET_DEPLOYMENT.yfi,
    "bonus.token"
  );
}

export function assertSameTeamsAddress(
  actual: string,
  expected: string,
  label: string
): void {
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`Teams feed deployment mismatch: ${label}.`);
  }
}
