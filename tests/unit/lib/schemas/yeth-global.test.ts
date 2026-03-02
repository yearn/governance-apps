import { describe, expect, it } from "vitest";
import { YethGlobalDataSchema } from "@/lib/schemas/yeth-global";

const VALID_PAYLOAD = {
  version: 1,
  chainId: 1,
  generatedAt: 1_772_126_400,
  blockNumber: 24_700_000,
  claim: {
    closesAt: 1_774_804_800,
  },
  yieldVault: {
    tvlEth: "2134200000000000000000",
  },
  recoveryVault: {
    pps: "1143200000000000000",
    totalAssetsEth: "512700000000000000000",
    totalShares: "448500000000000000000",
  },
};

describe("YethGlobalDataSchema", () => {
  it("accepts valid v1 payloads", () => {
    const parsed = YethGlobalDataSchema.safeParse(VALID_PAYLOAD);
    expect(parsed.success).toBe(true);
  });

  it("rejects non-mainnet chain id", () => {
    const parsed = YethGlobalDataSchema.safeParse({
      ...VALID_PAYLOAD,
      chainId: 10,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects decimal token amount strings", () => {
    const parsed = YethGlobalDataSchema.safeParse({
      ...VALID_PAYLOAD,
      recoveryVault: {
        ...VALID_PAYLOAD.recoveryVault,
        pps: "1.1432",
      },
    });
    expect(parsed.success).toBe(false);
  });
});
