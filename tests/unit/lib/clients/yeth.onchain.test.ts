import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccount, simulateContract, writeContract } from "wagmi/actions";
import { OnchainYethClient } from "@/lib/clients/yeth/onchain";
import {
  YETH_CLAIM,
  YETH_RECOVERY_VAULT,
  YETH_YIELD_VAULT,
} from "@/lib/clients/yeth/deployment";
import { MAINNET_CHAIN_ID } from "@/lib/tx/network";

vi.mock("wagmi/actions", () => ({
  getAccount: vi.fn(),
  simulateContract: vi.fn(),
  writeContract: vi.fn(),
}));

const USER = "0x1111111111111111111111111111111111111111" as const;
const ONE = 10n ** 18n;

function createFeed(generatedAt = 1_772_126_400) {
  return {
    version: 1 as const,
    chainId: 1 as const,
    generatedAt,
    blockNumber: 24_700_000,
    claim: { closesAt: 1_774_804_800 },
    yieldVault: {
      tvlEth: "2134200000000000000000",
      pps: "1073056603773584905",
      totalShares: "1989000000000000000000",
    },
    recoveryVault: {
      pps: "1143200000000000000",
      totalAssetsEth: "512700000000000000000",
      totalShares: "448500000000000000000",
    },
  };
}

describe("OnchainYethClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAccount).mockReturnValue({
      address: USER,
      chainId: MAINNET_CHAIN_ID,
    } as unknown as ReturnType<typeof getAccount>);
    vi.mocked(writeContract).mockResolvedValue(
      "0xmockhash" as Awaited<ReturnType<typeof writeContract>>
    );
  });

  it("builds global state from yETH feed while disconnected", async () => {
    const client = new OnchainYethClient(null, createFeed());

    const state = await client.getGlobalState();

    expect(state.claimWindow.closesAt).toBe(1_774_804_800);
    expect(state.contracts.claimContract).toBe(YETH_CLAIM);
    expect(state.contracts.recoveryVault).toBe(YETH_RECOVERY_VAULT);
    expect(state.contracts.yieldVault).toBe(YETH_YIELD_VAULT);
    expect(state.yieldVault.tvlEth).toBe(2_134_200_000_000_000_000_000n);
    expect(state.yieldVault.pps).toBe(1_073_056_603_773_584_905n);
    expect(state.yieldVault.totalShares).toBe(1_989_000_000_000_000_000_000n);
  });

  it("overlays deadline and vault metrics from chain when available", async () => {
    const publicClient = {
      readContract: vi.fn(),
      multicall: vi
        .fn()
        .mockResolvedValue([
          1_800_000_000n,
          1_200_000_000_000_000_000n,
          600n * ONE,
          500n * ONE,
          1_030_000_000_000_000_000n,
          3_000n * ONE,
          2_900n * ONE,
        ]),
    } as const;
    const client = new OnchainYethClient(publicClient as never, createFeed());

    const state = await client.getGlobalState();

    expect(state.claimWindow.closesAt).toBe(1_800_000_000);
    expect(state.recoveryVault.pps).toBe(1_200_000_000_000_000_000n);
    expect(state.recoveryVault.totalAssetsEth).toBe(600n * ONE);
    expect(state.recoveryVault.totalShares).toBe(500n * ONE);
    expect(state.yieldVault.tvlEth).toBe(3_000n * ONE);
    expect(state.yieldVault.pps).toBe(1_030_000_000_000_000_000n);
    expect(state.yieldVault.totalShares).toBe(2_900n * ONE);
    expect(publicClient.multicall).toHaveBeenCalledWith(
      expect.objectContaining({
        allowFailure: false,
      })
    );
  });

  it("computes account claimable amount from claimable and recovery_rate", async () => {
    const publicClient = {
      readContract: vi.fn(),
      multicall: vi
        .fn()
        .mockResolvedValue([10n * ONE, 800_000_000_000_000_000n, 2n * ONE]),
    } as const;
    const client = new OnchainYethClient(publicClient as never, createFeed());

    const state = await client.getAccountState(USER);

    expect(state.snapshotLossEth).toBe(10n * ONE);
    expect(state.claimableNowEth).toBe(8n * ONE);
    expect(state.recoveryVaultShares).toBe(2n * ONE);
  });

  it("returns safe account fallback when account reads fail", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const publicClient = {
      readContract: vi.fn(),
      multicall: vi.fn().mockRejectedValue(new Error("rpc down")),
    } as const;
    const client = new OnchainYethClient(publicClient as never, createFeed());

    const state = await client.getAccountState(USER);

    expect(state).toEqual({
      address: USER,
      snapshotLossEth: 0n,
      claimableNowEth: 0n,
      recoveryVaultShares: 0n,
    });
  });

  it("prepares claim-and-exit with claim(true)", async () => {
    const request = { address: YETH_CLAIM, functionName: "claim" };
    vi.mocked(simulateContract).mockResolvedValue({
      request,
      result: undefined,
    } as unknown as Awaited<ReturnType<typeof simulateContract>>);

    const client = new OnchainYethClient(null, createFeed());
    const prepare = await client.prepareClaimAndExit();
    await prepare();

    expect(simulateContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        address: YETH_CLAIM,
        functionName: "claim",
        args: [true],
        chainId: MAINNET_CHAIN_ID,
        account: USER,
      })
    );
    expect(writeContract).toHaveBeenCalledWith(expect.anything(), request);
  });

  it("prepares claim-and-stay with claim(false)", async () => {
    const request = { address: YETH_CLAIM, functionName: "claim" };
    vi.mocked(simulateContract).mockResolvedValue({
      request,
      result: undefined,
    } as unknown as Awaited<ReturnType<typeof simulateContract>>);

    const client = new OnchainYethClient(null, createFeed());
    const prepare = await client.prepareClaimAndStay();
    await prepare();

    expect(simulateContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        address: YETH_CLAIM,
        functionName: "claim",
        args: [false],
        chainId: MAINNET_CHAIN_ID,
        account: USER,
      })
    );
    expect(writeContract).toHaveBeenCalledWith(expect.anything(), request);
  });

  it("prepares redeem with all wallet shares and owner/receiver set to account", async () => {
    const publicClient = {
      readContract: vi.fn().mockResolvedValue(3n * ONE),
      multicall: vi.fn(),
    } as const;
    const request = { address: YETH_RECOVERY_VAULT, functionName: "redeem" };
    vi.mocked(simulateContract).mockResolvedValue({
      request,
      result: 0n,
    } as unknown as Awaited<ReturnType<typeof simulateContract>>);

    const client = new OnchainYethClient(publicClient as never, createFeed());
    const prepare = await client.prepareRedeemToEth();
    await prepare();

    expect(publicClient.readContract).toHaveBeenCalledWith(
      expect.objectContaining({
        address: YETH_RECOVERY_VAULT,
        functionName: "balanceOf",
        args: [USER],
      })
    );
    expect(simulateContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        address: YETH_RECOVERY_VAULT,
        functionName: "redeem",
        args: [3n * ONE, USER, USER],
      })
    );
    expect(writeContract).toHaveBeenCalledWith(expect.anything(), request);
  });
});
