import { describe, expect, it } from "vitest";
import { assertMainnetAccount, MAINNET_CHAIN_ID } from "@/lib/tx/network";

describe("assertMainnetAccount", () => {
  it("returns the account address for connected mainnet accounts", () => {
    const address = assertMainnetAccount({
      address: "0x1111111111111111111111111111111111111111",
      chainId: MAINNET_CHAIN_ID,
    });
    expect(address).toBe("0x1111111111111111111111111111111111111111");
  });

  it("throws when account is not connected", () => {
    expect(() =>
      assertMainnetAccount({ chainId: MAINNET_CHAIN_ID })
    ).toThrow("No account connected");
  });

  it("throws when chain is not mainnet", () => {
    expect(() =>
      assertMainnetAccount({
        address: "0x1111111111111111111111111111111111111111",
        chainId: 137,
      })
    ).toThrow("Wrong network");
  });
});
