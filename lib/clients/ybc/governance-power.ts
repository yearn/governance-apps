import { formatUnits, parseAbi, type Address, type PublicClient } from "viem";
import { readGovernanceWeightSources } from "@/lib/clients/styfi/voting-power";
import { LIQUID_LOCKERS, STYFI_ADDRESS } from "@/lib/constants";
import type { YbcFeed } from "@/lib/schemas/ybc-feed";
import { verifyYbcSnapshotBlock } from "./canonical-block";
import { projectYbcWeight } from "./weight-schedule";
import type { YbcGovernancePower } from "./types";

const membershipAbi = parseAbi(["function members(address) view returns (bool)", "function num_members() view returns (uint256)"]);
const weightAbi = parseAbi(["function weight(address) view returns (uint256)", "function staked(address) view returns (uint256)", "function packed_weights(address) view returns (uint256)"]);
const streamAbi = parseAbi(["function streams(address) view returns (uint256,uint256,uint256)"]);

// Small sequential batches bound RPC work even for the largest supported roster.
async function batches<T, R>(items: T[], read: (items: T[]) => Promise<readonly R[]>): Promise<R[]> {
  const result: R[] = [];
  for (let i = 0; i < items.length; i += 16) result.push(...await read(items.slice(i, i + 16)));
  return result;
}

export async function readYbcGovernancePower(publicClient: PublicClient, feed: YbcFeed): Promise<YbcGovernancePower> {
  const snapshot = await verifyYbcSnapshotBlock(publicClient, feed);
  const blockNumber = snapshot.blockNumber;
  const { measure, delegatedStaking, ybc, memberAggregator } = await readGovernanceWeightSources(publicClient, blockNumber);
  if (ybc.toLowerCase() !== feed.deployment.ybc.toLowerCase() ||
      memberAggregator.toLowerCase() !== feed.deployment.ybcWeightAggregator.toLowerCase()) throw new Error("The YBC roster does not match the DAO voter.");
  const candidates = feed.members.map(member => member.address as Address);
  const memberships = await batches(candidates, addresses => publicClient.multicall({
    blockNumber, allowFailure: false,
    contracts: addresses.map(address => ({ address: ybc, abi: membershipAbi, functionName: "members" as const, args: [address] as const })),
  }));
  const members = candidates.filter((_, index) => memberships[index]);
  const [memberCount, delegated, collective] = await publicClient.multicall({
    blockNumber, allowFailure: false, contracts: [
      { address: ybc, abi: membershipAbi, functionName: "num_members" },
      { address: measure, abi: weightAbi, functionName: "weight", args: [delegatedStaking] },
      { address: measure, abi: weightAbi, functionName: "weight", args: [ybc] },
    ],
  });
  if (BigInt(members.length) !== memberCount ||
      members.some(address => !feed.members.some(m => m.address.toLowerCase() === address.toLowerCase() && m.status === "active")) ||
      feed.members.filter(m => m.status === "active").length !== members.length) throw new Error("The YBC member roster is incomplete.");

  const facts = await batches(members, addresses => publicClient.multicall({
    blockNumber, allowFailure: false,
    contracts: addresses.flatMap(address => [
      { address: measure, abi: weightAbi, functionName: "weight" as const, args: [address] as const },
      { address: memberAggregator, abi: weightAbi, functionName: "staked" as const, args: [address] as const },
      { address: memberAggregator, abi: weightAbi, functionName: "weight" as const, args: [address] as const },
      { address: memberAggregator, abi: weightAbi, functionName: "packed_weights" as const, args: [address] as const },
    ]),
  }));
  const streams = await batches(members, addresses => publicClient.multicall({
    blockNumber, allowFailure: true,
    contracts: addresses.flatMap(address => [STYFI_ADDRESS, ...LIQUID_LOCKERS.map(locker => locker.depositor)].map(contract => ({
      address: contract, abi: streamAbi, functionName: "streams" as const, args: [address] as const,
    }))),
  }));
  let own = 0n;
  const memberFacts: YbcGovernancePower["members"] = {};
  members.forEach((address, index) => {
    const [direct, staked, effective, packed] = facts.slice(index * 4, index * 4 + 4);
    const scheduled = projectYbcWeight(packed, staked, snapshot.blockTimestamp, feed.deployment.genesis);
    const record = feed.members.find(member => member.address.toLowerCase() === address.toLowerCase())!;
    if (scheduled.effective !== effective || BigInt(record.upstreamStaked) !== staked || BigInt(record.effectiveWeight) !== effective) throw new Error("YBC member weights differ from the snapshot.");
    const isPool = [ybc, delegatedStaking].some(pool => pool.toLowerCase() === address.toLowerCase());
    if (!isPool) own += direct;
    const accountStreams = streams.slice(index * 4, index * 4 + 4);
    const leaving = accountStreams.every(stream => stream.status === "success")
      ? accountStreams.reduce((sum, stream) => {
        if (stream.status !== "success") return sum;
        const [, total, claimed] = stream.result;
        if (claimed > total) throw new Error("Invalid withdrawal stream.");
        return sum + total - claimed;
      }, 0n) : null;
    memberFacts[address.toLowerCase()] = {
      directPower: formatUnits(direct, 18),
      exiting: leaving === null ? null : formatUnits(leaving, 18),
      maturesAt: scheduled.maturesAt,
    };
  });
  const canonical = await publicClient.getBlock({ blockNumber });
  if (canonical.hash?.toLowerCase() !== snapshot.blockHash.toLowerCase()) throw new Error("The voting power snapshot changed.");
  return {
    ownPower: formatUnits(own, 18), delegatedPower: formatUnits(delegated, 18),
    collectivePower: formatUnits(collective, 18), totalPower: formatUnits(own + delegated + collective, 18),
    timestamp: snapshot.blockTimestamp, members: memberFacts,
  };
}
