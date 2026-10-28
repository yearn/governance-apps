import { formatUnits, parseAbi, parseUnits, type Address, type PublicClient } from "viem";
import { assertVotingPowerSnapshotFresh, type DaoVotingPowerSnapshot } from "@/lib/clients/dao/voting-power-snapshot";
import { readGovernanceWeightSources } from "@/lib/clients/styfi/voting-power";
import type { YbcFeed } from "@/lib/schemas/ybc-feed";
import { assertYbcMainnetPublicClient } from "./canonical-block";
import { assertYbcMainnetDeployment } from "./deployment";
import type { YbcSystemVotingPower } from "./types";

const membershipAbi = parseAbi(["function members(address) view returns (bool)", "function num_members() view returns (uint256)"]);
const weightAbi = parseAbi(["function weight(address) view returns (uint256)"]);

// The roster supplies candidates only. Membership and every numerator are read
// at the DAO total's block, which can differ from the roster snapshot.
export async function readYbcSystemVotingPower(client: PublicClient, feed: YbcFeed, snapshot: DaoVotingPowerSnapshot): Promise<YbcSystemVotingPower> {
  assertYbcMainnetDeployment(feed);
  assertYbcMainnetPublicClient(client);
  if (await client.getChainId() !== 1) throw new Error("YBC voting power requires Ethereum Mainnet.");
  const blockNumber = BigInt(snapshot.block.number);
  const [block, latest] = await Promise.all([client.getBlock({ blockNumber }), client.getBlock({ blockTag: "latest" })]);
  if (block.hash?.toLowerCase() !== snapshot.block.hash.toLowerCase() || block.timestamp !== BigInt(snapshot.block.timestamp) || latest.number < blockNumber) throw new Error("The DAO voting-power snapshot is not canonical.");
  assertVotingPowerSnapshotFresh(snapshot, Number(latest.timestamp));
  const sources = await readGovernanceWeightSources(client, blockNumber);
  const { measure, delegatedStaking, ybc, memberAggregator } = sources;
  if (measure.toLowerCase() !== snapshot.deployment.measure.toLowerCase() ||
      sources.aggregator.toLowerCase() !== snapshot.deployment.aggregator.toLowerCase() ||
      delegatedStaking.toLowerCase() !== snapshot.deployment.delegated.toLowerCase() ||
      ybc.toLowerCase() !== snapshot.deployment.ybc.toLowerCase() ||
      ybc.toLowerCase() !== feed.deployment.ybc.toLowerCase() ||
      memberAggregator.toLowerCase() !== feed.deployment.ybcWeightAggregator.toLowerCase()) throw new Error("The DAO voting-power deployment changed.");
  const candidates = [...new Set(feed.members.map(member => member.address.toLowerCase()))] as Address[];
  const members: Address[] = [];
  for (let i = 0; i < candidates.length; i += 16) {
    const batch = candidates.slice(i, i + 16);
    const memberships = await client.multicall({ blockNumber, allowFailure: false,
      contracts: batch.map(address => ({ address: ybc, abi: membershipAbi, functionName: "members" as const, args: [address] as const })),
    });
    batch.forEach((address, index) => { if (memberships[index]) members.push(address); });
  }
  const count = await client.readContract({ blockNumber, address: ybc, abi: membershipAbi, functionName: "num_members" });
  if (count !== BigInt(members.length)) throw new Error("The YBC roster is incomplete at the DAO snapshot.");
  const directAccounts = new Map(snapshot.accounts.map(account => [account.address.toLowerCase(), BigInt(account.directPower)]));
  const ownMembers = members.filter(address => address !== ybc.toLowerCase() && address !== delegatedStaking.toLowerCase());
  const accounts = [...ownMembers, ybc, delegatedStaking];
  const weights: bigint[] = [];
  for (let i = 0; i < accounts.length; i += 16) {
    weights.push(...await client.multicall({ blockNumber, allowFailure: false,
      contracts: accounts.slice(i, i + 16).map(address => ({ address: measure, abi: weightAbi, functionName: "weight" as const, args: [address] as const })),
    }));
  }
  accounts.forEach((address, index) => {
    const indexed = address.toLowerCase() === delegatedStaking.toLowerCase()
      ? BigInt(snapshot.totals.delegatedPower) : directAccounts.get(address.toLowerCase()) ?? 0n;
    if (weights[index] !== indexed) throw new Error("YBC power differs from the DAO snapshot.");
  });
  const own = weights.slice(0, ownMembers.length).reduce((sum, weight) => sum + weight, 0n);
  const collective = weights[ownMembers.length]!;
  const delegated = weights[ownMembers.length + 1]!;
  const total = own + collective + delegated;
  const daoTotal = BigInt(snapshot.totals.totalPower);
  if (total > daoTotal) throw new Error("YBC power exceeds the DAO total.");
  const canonical = await client.getBlock({ blockNumber });
  if (canonical.hash?.toLowerCase() !== snapshot.block.hash.toLowerCase()) throw new Error("The DAO voting-power snapshot changed.");
  return {
    ownPower: formatUnits(own, 18), collectivePower: formatUnits(collective, 18),
    delegatedPower: formatUnits(delegated, 18), totalPower: formatUnits(total, 18),
    daoTotalPower: formatUnits(daoTotal, 18), timestamp: snapshot.block.timestamp,
  };
}

export function getYbcSystemShares(power: YbcSystemVotingPower) {
  const own = parseUnits(power.ownPower, 18);
  const steered = parseUnits(power.delegatedPower, 18) + parseUnits(power.collectivePower, 18);
  const dao = parseUnits(power.daoTotalPower, 18);
  if (dao <= 0n || own < 0n || steered < 0n || own + steered > dao || own + steered !== parseUnits(power.totalPower, 18)) return null;
  // Fixed-point boundaries keep the bar exactly 100% without losing precision
  // on large uint256 totals. Labels retain positive dust as <0.01%.
  const ownBoundary = Number(own * 1_000_000n / dao);
  const ybcBoundary = Number((own + steered) * 1_000_000n / dao);
  const percent = (value: bigint) => value > 0n && value * 10_000n < dao ? "<0.01%" : `${(Number(value * 10_000n / dao) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
  return {
    own: percent(own), steered: percent(steered), ybc: percent(own + steered), other: percent(dao - own - steered),
    steeredPower: formatUnits(steered, 18), otherPower: formatUnits(dao - own - steered, 18),
    segments: [
      { kind: "yea" as const, widthPercent: ownBoundary / 10_000 },
      { kind: "ybc-yea" as const, widthPercent: (ybcBoundary - ownBoundary) / 10_000 },
      { kind: "nay" as const, widthPercent: (1_000_000 - ybcBoundary) / 10_000 },
    ],
  };
}
