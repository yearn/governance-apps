import type { Address } from "viem";
import type { YbcFeed } from "@/lib/schemas/ybc-feed";

export const YBC_MAINNET_DEPLOYMENT = {
  genesis: 1_770_249_600,
  epochLengthSeconds: 1_209_600,
  voteLengthSeconds: 604_800,
  decayLengthSeconds: 86_400,
  deployBlock: 25_228_044,
  ybc: "0xd6AFd78C05f0d425F2b46359746dD44991dCB315",
  ybcElection: "0xe16608758c11322d407745927d2D033f1BFB206C",
  ybcWeightAggregator: "0xADB7228a85fCD24E3Cfc8C58E2d4b9F03E1468D9",
  ybcRewardDistributor: "0x53100f8979D3655a2E95465f583b0f4A11c8bbe1",
  ybcBonusRecipient: "0xf03a919a59f8381bE220511eCf788b15FB039e4C",
  upstreamWeightAggregator:
    "0x6973CF85d479b9253E13E71F377E8CD2c2dfECd7",
  rewardToken: "0xBe53A109B494E5c9f97b9Cd39Fe969BE68BF6204",
  rewardClaimer: "0xA82454009E01Ae697012a73cB232d85e61B05e50",
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
} as const satisfies {
  genesis: number;
  epochLengthSeconds: number;
  voteLengthSeconds: number;
  decayLengthSeconds: number;
  deployBlock: number;
  ybc: Address;
  ybcElection: Address;
  ybcWeightAggregator: Address;
  ybcRewardDistributor: Address;
  ybcBonusRecipient: Address;
  upstreamWeightAggregator: Address;
  rewardToken: Address;
  rewardClaimer: Address;
  multicall3: Address;
};

const ADDRESS_FIELDS = [
  "ybc",
  "ybcElection",
  "ybcWeightAggregator",
  "ybcRewardDistributor",
  "ybcBonusRecipient",
  "upstreamWeightAggregator",
  "rewardToken",
  "rewardClaimer",
  "multicall3",
] as const;

export function assertYbcMainnetDeployment(feed: YbcFeed): void {
  if (feed.deployment.genesis !== YBC_MAINNET_DEPLOYMENT.genesis) {
    throw new Error("YBC feed deployment mismatch: genesis.");
  }

  if (feed.deployment.deployBlock !== YBC_MAINNET_DEPLOYMENT.deployBlock) {
    throw new Error("YBC feed deployment mismatch: deployBlock.");
  }

  if (
    feed.epoch.lengthSeconds !==
      YBC_MAINNET_DEPLOYMENT.epochLengthSeconds ||
    feed.epoch.voteLengthSeconds !==
      YBC_MAINNET_DEPLOYMENT.voteLengthSeconds ||
    feed.epoch.decayLengthSeconds !==
      YBC_MAINNET_DEPLOYMENT.decayLengthSeconds
  ) {
    throw new Error("YBC feed deployment mismatch: epoch constants.");
  }

  for (const field of ADDRESS_FIELDS) {
    if (
      feed.deployment[field].toLowerCase() !==
      YBC_MAINNET_DEPLOYMENT[field].toLowerCase()
    ) {
      throw new Error(`YBC feed deployment mismatch: ${field}.`);
    }
  }

  if (
    feed.rewards.token.toLowerCase() !==
    YBC_MAINNET_DEPLOYMENT.rewardToken.toLowerCase()
  ) {
    throw new Error("YBC feed deployment mismatch: rewards.token.");
  }

  if (
    feed.rewards.distributor.toLowerCase() !==
    YBC_MAINNET_DEPLOYMENT.ybcRewardDistributor.toLowerCase()
  ) {
    throw new Error("YBC feed deployment mismatch: rewards.distributor.");
  }
}
