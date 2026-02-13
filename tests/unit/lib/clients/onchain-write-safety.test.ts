import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccount, simulateContract, writeContract } from "wagmi/actions";
import { OnchainStyfiClient } from "@/lib/clients/styfi/onchain";
import { OnchainVeyfiClient } from "@/lib/clients/veyfi/onchain";
import { LIQUID_LOCKERS, STYFI_ADDRESS } from "@/lib/constants";
import { MAINNET_CHAIN_ID } from "@/lib/tx/network";

vi.mock("wagmi/actions", () => ({
  getAccount: vi.fn(),
  simulateContract: vi.fn(),
  writeContract: vi.fn(),
}));

const USER = "0x1111111111111111111111111111111111111111" as const;

describe("On-chain write safety", () => {
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

  it("pre-simulates stYFI stake writes on mainnet", async () => {
    const request = {
      address: STYFI_ADDRESS,
      functionName: "deposit",
      args: [42n, USER],
      chainId: MAINNET_CHAIN_ID,
      account: USER,
    };

    vi.mocked(simulateContract).mockResolvedValue({
      request,
      result: 0n,
    } as unknown as Awaited<ReturnType<typeof simulateContract>>);

    const client = new OnchainStyfiClient(null, null);
    const prepare = await client.prepareStake("stYFI", 42n);
    await prepare();

    expect(simulateContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        functionName: "deposit",
        chainId: MAINNET_CHAIN_ID,
        account: USER,
      })
    );
    expect(writeContract).toHaveBeenCalledWith(expect.anything(), request);
  });

  it("pre-simulates veYFI staking writes on mainnet", async () => {
    const request = {
      address: LIQUID_LOCKERS[0].depositor,
      functionName: "dummy",
    };

    vi.mocked(simulateContract).mockResolvedValue({
      request,
      result: 0n,
    } as unknown as Awaited<ReturnType<typeof simulateContract>>);

    const client = new OnchainVeyfiClient(null, null);
    const prepare = await client.prepareStakeLlyfi(LIQUID_LOCKERS[0].symbol, 1n);
    await prepare();

    expect(simulateContract).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        functionName: "deposit",
        chainId: MAINNET_CHAIN_ID,
        account: USER,
      })
    );
    expect(writeContract).toHaveBeenCalledWith(expect.anything(), request);
  });

  it("blocks writes on non-mainnet accounts", async () => {
    vi.mocked(getAccount).mockReturnValue({
      address: USER,
      chainId: 137,
    } as unknown as ReturnType<typeof getAccount>);

    const client = new OnchainVeyfiClient(null, null);
    const prepare = await client.prepareMigrateVeYfi();

    await expect(prepare()).rejects.toThrow(
      "Wrong network. Please switch to Ethereum Mainnet."
    );
    expect(simulateContract).not.toHaveBeenCalled();
    expect(writeContract).not.toHaveBeenCalled();
  });
});
