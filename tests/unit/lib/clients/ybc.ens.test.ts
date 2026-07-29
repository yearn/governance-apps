import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Address, PublicClient } from "viem";
import {
  clearYbcEnsIdentityCache,
  normalizeYbcEnsDisplayName,
  resolveVerifiedMainnetEnsIdentities,
  YBC_ENS_MAX_ADDRESSES_PER_QUERY,
  YBC_ENS_MAX_NAME_LENGTH,
} from "@/lib/clients/ybc";

const ALICE_ADDRESS =
  "0x1111111111111111111111111111111111111111" as Address;
const BOB_ADDRESS =
  "0x2222222222222222222222222222222222222222" as Address;

type EnsClientOverrides = {
  chainId?: number;
  getEnsAddress?: (name: string) => Promise<Address | null>;
  getEnsName?: (address: Address) => Promise<string | null>;
};

describe("YBC verified ENS resolver", () => {
  beforeEach(() => {
    clearYbcEnsIdentityCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a reverse name only when forward resolution matches", async () => {
    const getEnsName = vi.fn(async () => "alice.eth");
    const getEnsAddress = vi.fn(async () => ALICE_ADDRESS);
    const client = createEnsClient({ getEnsAddress, getEnsName });

    await expect(
      resolveVerifiedMainnetEnsIdentities(client, [ALICE_ADDRESS])
    ).resolves.toEqual({
      [ALICE_ADDRESS.toLowerCase()]: "alice.eth",
    });
    expect(getEnsName).toHaveBeenCalledWith(ALICE_ADDRESS);
    expect(getEnsAddress).toHaveBeenCalledWith("alice.eth");
  });

  it("normalizes a safe reverse name before verification and display", async () => {
    const getEnsName = vi.fn(async () => "Alice.ETH");
    const getEnsAddress = vi.fn(async () => ALICE_ADDRESS);
    const client = createEnsClient({ getEnsAddress, getEnsName });

    await expect(
      resolveVerifiedMainnetEnsIdentities(client, [ALICE_ADDRESS])
    ).resolves.toEqual({
      [ALICE_ADDRESS.toLowerCase()]: "alice.eth",
    });
    expect(getEnsAddress).toHaveBeenCalledWith("alice.eth");
  });

  it.each([
    { caseName: "zero-width", reverseName: "alice\u200b.eth" },
    { caseName: "bidirectional control", reverseName: "alice\u202e.eth" },
    { caseName: "mixed-script spoof", reverseName: "\u0430lice.eth" },
  ])("rejects $caseName reverse names before forward resolution", async ({
    reverseName,
  }) => {
    const getEnsAddress = vi.fn(async () => ALICE_ADDRESS);
    const client = createEnsClient({
      getEnsAddress,
      getEnsName: async () => reverseName,
    });

    await expect(
      resolveVerifiedMainnetEnsIdentities(client, [ALICE_ADDRESS])
    ).resolves.toEqual({});
    expect(getEnsAddress).not.toHaveBeenCalled();
  });

  it("rejects oversized display names before forward resolution", async () => {
    const getEnsAddress = vi.fn(async () => ALICE_ADDRESS);
    const client = createEnsClient({
      getEnsAddress,
      getEnsName: async () =>
        `${"a".repeat(YBC_ENS_MAX_NAME_LENGTH)}.eth`,
    });

    await expect(
      resolveVerifiedMainnetEnsIdentities(client, [ALICE_ADDRESS])
    ).resolves.toEqual({});
    expect(getEnsAddress).not.toHaveBeenCalled();
  });

  it("applies ENSIP-15 normalization without preserving hidden characters", () => {
    expect(normalizeYbcEnsDisplayName("ａｌｉｃｅ.eth")).toBe("alice.eth");
    expect(normalizeYbcEnsDisplayName("alice\u200b.eth")).toBeNull();
  });

  it.each([
    ["soft hyphen", "\u00ad"],
    ["Hangul choseong filler", "\u115f"],
    ["Hangul jungseong filler", "\u1160"],
    ["Braille blank", "\u2800"],
    ["Hangul filler", "\u3164"],
    ["halfwidth Hangul filler", "\uffa0"],
    ["variation selector", "\ufe0f"],
    ["supplementary variation selector", "\u{e0100}"],
    ["Unicode tag", "\u{e0061}"],
    ["unassigned directional isolate", "\u2065"],
    ["ideographic space", "\u3000"],
  ])("rejects the %s character in an ENS display name", (_caseName, character) => {
    expect(normalizeYbcEnsDisplayName(`alice${character}.eth`)).toBeNull();
  });

  it("rejects mismatched forward records and reverse-only names", async () => {
    const mismatchedClient = createEnsClient({
      getEnsName: async () => "alice.eth",
      getEnsAddress: async () => BOB_ADDRESS,
    });

    await expect(
      resolveVerifiedMainnetEnsIdentities(mismatchedClient, [ALICE_ADDRESS])
    ).resolves.toEqual({});

    clearYbcEnsIdentityCache();
    const getEnsAddress = vi.fn(async () => ALICE_ADDRESS);
    const missingReverseClient = createEnsClient({
      getEnsName: async () => null,
      getEnsAddress,
    });

    await expect(
      resolveVerifiedMainnetEnsIdentities(missingReverseClient, [
        ALICE_ADDRESS,
      ])
    ).resolves.toEqual({});
    expect(getEnsAddress).not.toHaveBeenCalled();
  });

  it("falls back without throwing when RPC resolution fails", async () => {
    const client = createEnsClient({
      getEnsName: async () => {
        throw new Error("RPC unavailable");
      },
    });

    await expect(
      resolveVerifiedMainnetEnsIdentities(client, [ALICE_ADDRESS])
    ).resolves.toEqual({});
  });

  it("does not resolve through a missing or non-mainnet client", async () => {
    const getEnsName = vi.fn(async () => "alice.eth");
    const client = createEnsClient({ chainId: 10, getEnsName });

    await expect(
      resolveVerifiedMainnetEnsIdentities(null, [ALICE_ADDRESS])
    ).resolves.toEqual({});
    await expect(
      resolveVerifiedMainnetEnsIdentities(client, [ALICE_ADDRESS])
    ).resolves.toEqual({});
    expect(getEnsName).not.toHaveBeenCalled();
  });

  it("reuses verified cache entries across batches", async () => {
    const getEnsName = vi.fn(async () => "alice.eth");
    const getEnsAddress = vi.fn(async () => ALICE_ADDRESS);
    const client = createEnsClient({ getEnsAddress, getEnsName });

    await resolveVerifiedMainnetEnsIdentities(client, [ALICE_ADDRESS]);
    await resolveVerifiedMainnetEnsIdentities(client, [ALICE_ADDRESS]);

    expect(getEnsName).toHaveBeenCalledTimes(1);
    expect(getEnsAddress).toHaveBeenCalledTimes(1);
  });

  it("bounds concurrent address resolution", async () => {
    let activeResolutions = 0;
    let peakResolutions = 0;
    const getEnsName = vi.fn(async () => {
      activeResolutions += 1;
      peakResolutions = Math.max(peakResolutions, activeResolutions);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 5);
      });
      activeResolutions -= 1;
      return null;
    });
    const client = createEnsClient({ getEnsName });
    const addresses = createAddresses(12);

    await resolveVerifiedMainnetEnsIdentities(client, addresses, {
      addressTimeoutMs: 200,
      concurrency: 3,
      totalDeadlineMs: 1_000,
    });

    expect(getEnsName).toHaveBeenCalledTimes(12);
    expect(peakResolutions).toBe(3);
  });

  it("caps each batch before scheduling RPC work", async () => {
    const getEnsName = vi.fn(async () => null);
    const client = createEnsClient({ getEnsName });

    await resolveVerifiedMainnetEnsIdentities(
      client,
      createAddresses(YBC_ENS_MAX_ADDRESSES_PER_QUERY + 20)
    );

    expect(getEnsName).toHaveBeenCalledTimes(
      YBC_ENS_MAX_ADDRESSES_PER_QUERY
    );
  });

  it("stops the batch at its deadline and handles late RPC rejection", async () => {
    vi.useFakeTimers();
    const rejectRequests: Array<(error: Error) => void> = [];
    const getEnsName = vi.fn(
      () =>
        new Promise<string | null>((_resolve, reject) => {
          rejectRequests.push(reject);
        })
    );
    const client = createEnsClient({ getEnsName });
    const resolution = resolveVerifiedMainnetEnsIdentities(
      client,
      createAddresses(20),
      {
        addressTimeoutMs: 1_000,
        concurrency: 4,
        totalDeadlineMs: 50,
      }
    );

    await vi.advanceTimersByTimeAsync(50);
    await expect(resolution).resolves.toEqual({});
    expect(getEnsName).toHaveBeenCalledTimes(4);

    for (const rejectRequest of rejectRequests) {
      rejectRequest(new Error("late transport rejection"));
    }
    await Promise.resolve();
  });

  it("retains raw worker slots when RPC calls never settle", async () => {
    vi.useFakeTimers();
    let activeRawCalls = 0;
    let peakRawCalls = 0;
    const getEnsName = vi.fn(
      () =>
        new Promise<string | null>(() => {
          activeRawCalls += 1;
          peakRawCalls = Math.max(peakRawCalls, activeRawCalls);
        })
    );
    const client = createEnsClient({ getEnsName });
    const addresses = createAddresses(12);
    const firstResolution = resolveVerifiedMainnetEnsIdentities(
      client,
      addresses,
      {
        addressTimeoutMs: 10,
        concurrency: 2,
        totalDeadlineMs: 50,
      }
    );
    const overlappingResolution = resolveVerifiedMainnetEnsIdentities(
      client,
      addresses,
      {
        addressTimeoutMs: 10,
        concurrency: 2,
        totalDeadlineMs: 50,
      }
    );

    await vi.advanceTimersByTimeAsync(50);

    await expect(firstResolution).resolves.toEqual({});
    await expect(overlappingResolution).resolves.toEqual({});
    expect(getEnsName).toHaveBeenCalledTimes(2);
    expect(activeRawCalls).toBe(2);
    expect(peakRawCalls).toBe(2);
  });

  it("does not render or cache a reverse result that settles after the batch deadline", async () => {
    vi.useFakeTimers();
    let resolveLateReverse: ((name: string | null) => void) | undefined;
    const getEnsName = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<string | null>((resolve) => {
            resolveLateReverse = resolve;
          })
      )
      .mockResolvedValue("alice.eth");
    const getEnsAddress = vi.fn(async () => ALICE_ADDRESS);
    const client = createEnsClient({ getEnsAddress, getEnsName });
    const firstResolution = resolveVerifiedMainnetEnsIdentities(
      client,
      [ALICE_ADDRESS],
      {
        concurrency: 1,
        totalDeadlineMs: 50,
      }
    );

    await vi.advanceTimersByTimeAsync(50);
    await expect(firstResolution).resolves.toEqual({});

    resolveLateReverse?.("alice.eth");
    await vi.advanceTimersByTimeAsync(0);
    expect(getEnsAddress).not.toHaveBeenCalled();

    await expect(
      resolveVerifiedMainnetEnsIdentities(client, [ALICE_ADDRESS], {
        concurrency: 1,
        totalDeadlineMs: 50,
      })
    ).resolves.toEqual({
      [ALICE_ADDRESS.toLowerCase()]: "alice.eth",
    });
    expect(getEnsName).toHaveBeenCalledTimes(2);
    expect(getEnsAddress).toHaveBeenCalledTimes(1);
  });

  it("does not cache a forward result that settles after the batch deadline", async () => {
    vi.useFakeTimers();
    let resolveLateForward: ((address: Address | null) => void) | undefined;
    const getEnsName = vi.fn(async () => "alice.eth");
    const getEnsAddress = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Address | null>((resolve) => {
            resolveLateForward = resolve;
          })
      )
      .mockResolvedValue(ALICE_ADDRESS);
    const client = createEnsClient({ getEnsAddress, getEnsName });
    const firstResolution = resolveVerifiedMainnetEnsIdentities(
      client,
      [ALICE_ADDRESS],
      {
        concurrency: 1,
        totalDeadlineMs: 50,
      }
    );

    await vi.advanceTimersByTimeAsync(50);
    await expect(firstResolution).resolves.toEqual({});

    resolveLateForward?.(ALICE_ADDRESS);
    await vi.advanceTimersByTimeAsync(0);

    await expect(
      resolveVerifiedMainnetEnsIdentities(client, [ALICE_ADDRESS], {
        concurrency: 1,
        totalDeadlineMs: 50,
      })
    ).resolves.toEqual({
      [ALICE_ADDRESS.toLowerCase()]: "alice.eth",
    });
    expect(getEnsName).toHaveBeenCalledTimes(2);
    expect(getEnsAddress).toHaveBeenCalledTimes(2);
  });
});

function createEnsClient({
  chainId = 1,
  getEnsAddress = async () => null,
  getEnsName = async () => null,
}: EnsClientOverrides = {}): PublicClient {
  return {
    chain: { id: chainId },
    getEnsAddress: ({ name }: { name: string }) => getEnsAddress(name),
    getEnsName: ({ address }: { address: Address }) =>
      getEnsName(address),
  } as unknown as PublicClient;
}

function createAddresses(count: number): Address[] {
  return Array.from({ length: count }, (_, index) => {
    const addressBody = (index + 1).toString(16).padStart(40, "0");
    return `0x${addressBody}` as Address;
  });
}
