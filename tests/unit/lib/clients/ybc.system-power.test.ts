import { describe, expect, it, vi } from "vitest";
import { parseUnits, type PublicClient } from "viem";
import example from "@/docs/apps/ybc/onchain-integration-plan/examples/ybc-feed.example.json";
import { YbcFeedSchema } from "@/lib/schemas/ybc-feed";
import { STYFI_GOVERNANCE } from "@/lib/clients/styfi/deployment";
import { STYFIX_ADDRESS, GENESIS, EPOCH_LENGTH } from "@/lib/constants";
import type { DaoVotingPowerSnapshot } from "@/lib/clients/dao/voting-power-snapshot";
import { getYbcSystemShares, readYbcSystemVotingPower } from "@/lib/clients/ybc/system-power";

function setup(options: { missing?: boolean; inactive?: boolean; poolMember?: boolean; reorg?: boolean; stale?: boolean; epoch?: boolean; missingIndexed?: boolean; mismatch?: boolean; wrongChain?: boolean } = {}) {
  const feed = YbcFeedSchema.parse(example);
  const account = options.poolMember ? feed.deployment.ybc : feed.members[0]!.address;
  // Deliberately differs from B; the feed's old weights/status are not inputs.
  feed.members = [{ ...feed.members[0]!, address: account, status: "removed", effectiveWeight: "0", upstreamStaked: "0" }];
  const timestamp = options.epoch ? Number(GENESIS) + 10 * Number(EPOCH_LENGTH) - 10 : feed.generatedAt;
  const blockNumber = BigInt(feed.blockNumber) + 100n;
  const hash = "0x" + "ab".repeat(32);
  const amount = (n: string) => parseUnits(n, 18).toString();
  const snapshot = {
    block: { number: blockNumber.toString(), hash, timestamp },
    deployment: { measure: STYFI_GOVERNANCE.weightMeasure, aggregator: feed.deployment.upstreamWeightAggregator, delegated: STYFIX_ADDRESS, ybc: feed.deployment.ybc },
    accounts: [
      { address: feed.deployment.ybc, directPower: amount("500") },
      ...options.poolMember || options.missingIndexed ? [] : [{ address: account, directPower: amount("100") }],
    ],
    totals: { delegatedPower: amount("1000"), totalPower: amount("4000") },
  } as DaoVotingPowerSnapshot;
  let blocks = 0;
  const client = {
    chain: { id: 1 }, getChainId: vi.fn(async () => options.wrongChain ? 10 : 1),
    getBlock: vi.fn(async ({ blockTag }: { blockTag?: string }) => ({
      hash: options.reorg && !blockTag && blocks++ > 0 ? "0x" + "ff".repeat(32) : hash,
      number: blockNumber + (blockTag ? 10n : 0n),
      timestamp: BigInt(timestamp + (blockTag ? options.stale ? 301 : 12 : 0)),
    })),
    readContract: vi.fn(async () => options.missing ? 2n : options.inactive ? 0n : 1n),
    multicall: vi.fn(async ({ contracts }: { contracts: { functionName: string; args?: string[] }[] }) => contracts.map(({ functionName: fn, args }) => {
      if (fn === "weight_measure") return STYFI_GOVERNANCE.weightMeasure;
      if (fn === "voter") return STYFI_GOVERNANCE.voter;
      if (fn === "weight_aggregator") return feed.deployment.upstreamWeightAggregator;
      if (fn === "delegated_staking") return STYFIX_ADDRESS;
      if (fn === "ybc") return feed.deployment.ybc;
      if (fn === "ybc_weight_aggregator") return feed.deployment.ybcWeightAggregator;
      if (fn === "members") return !options.inactive;
      if (fn === "weight") return parseUnits(args![0]!.toLowerCase() === STYFIX_ADDRESS.toLowerCase() ? "1000" : args![0]!.toLowerCase() === feed.deployment.ybc.toLowerCase() ? "500" : options.mismatch ? "200" : "100", 18);
      throw Error(fn);
    })),
  } as unknown as PublicClient;
  return { feed, client, snapshot, blockNumber };
}
describe("YBC share of DAO system voting power", () => {
  it("reads membership and every numerator at the DAO total block, independent of the roster block", async () => {
    const { client, feed, snapshot, blockNumber } = setup();
    const power = await readYbcSystemVotingPower(client, feed, snapshot);
    expect(power).toMatchObject({ ownPower: "100", collectivePower: "500", delegatedPower: "1000", totalPower: "1600", daoTotalPower: "4000" });
    for (const [call] of vi.mocked(client.multicall).mock.calls) expect(call).toHaveProperty("blockNumber", blockNumber);
    expect(client.readContract).toHaveBeenCalledWith(expect.objectContaining({ blockNumber }));
    expect(getYbcSystemShares(power)).toMatchObject({ own: "2.5%", steered: "37.5%", ybc: "40%", other: "60%" });
  });
  it("uses current membership and never counts pool addresses twice", async () => {
    for (const options of [{ inactive: true }, { poolMember: true }]) {
      const { client, feed, snapshot } = setup(options);
      expect((await readYbcSystemVotingPower(client, feed, snapshot)).totalPower).toBe("1500");
    }
  });
  it.each([
    [{ missing: true }, "incomplete"], [{ missingIndexed: true }, "differs"],
    [{ mismatch: true }, "differs"], [{ stale: true }, "fresh"],
    [{ epoch: true }, "fresh"], [{ reorg: true }, "changed"], [{ wrongChain: true }, "Mainnet"],
  ] as const)("rejects unverified system shares: %j", async (options, reason) => {
    const { client, feed, snapshot } = setup(options);
    await expect(readYbcSystemVotingPower(client, feed, snapshot)).rejects.toThrow(reason);
  });
  it("rejects a noncanonical hash or timestamp and a numerator exceeding the total", async () => {
    for (const field of ["hash", "timestamp", "total"] as const) {
      const { client, feed, snapshot } = setup();
      if (field === "hash") snapshot.block.hash = "0x" + "cc".repeat(32);
      if (field === "timestamp") snapshot.block.timestamp += 1;
      if (field === "total") snapshot.totals.totalPower = "1";
      await expect(readYbcSystemVotingPower(client, feed, snapshot)).rejects.toThrow(field === "total" ? "exceeds" : "canonical");
    }
  });
  it("leaves zero or inconsistent totals empty and preserves large-value/dust precision", () => {
    const power = { ownPower: "6180", collectivePower: "2000", delegatedPower: "8000", totalPower: "16180", daoTotalPower: "40000", timestamp: 1 };
    expect(getYbcSystemShares(power)).toMatchObject({ own: "15.45%", steered: "25%", ybc: "40.45%" });
    expect(getYbcSystemShares({ ...power, daoTotalPower: "0" })).toBeNull();
    expect(getYbcSystemShares({ ...power, daoTotalPower: "100" })).toBeNull();
    expect(getYbcSystemShares({ ...power, totalPower: "16181" })).toBeNull();
    const dust = getYbcSystemShares({ ...power, ownPower: "0.000000000000000001", delegatedPower: "0", collectivePower: "0", totalPower: "0.000000000000000001", daoTotalPower: "99999999999999999999999999999999999999" });
    expect(dust?.own).toBe("<0.01%");
    expect(dust?.segments.reduce((sum, segment) => sum + segment.widthPercent, 0)).toBe(100);
  });
});
