import { describe, expect, it } from "vitest";
import {
  getEtherscanAddressUrl,
  getEtherscanTransactionUrl,
  isEthereumAddress,
  isEthereumTransactionHash,
} from "@/lib/explorer";

describe("mainnet explorer helpers", () => {
  const address = "0x1234567890123456789012345678901234567890";
  const hash =
    "0x1234567890123456789012345678901234567890123456789012345678901234";

  it("builds only Ethereum mainnet Etherscan URLs", () => {
    expect(getEtherscanAddressUrl(address)).toBe(
      `https://etherscan.io/address/${address}`,
    );
    expect(getEtherscanTransactionUrl(hash)).toBe(
      `https://etherscan.io/tx/${hash}`,
    );
  });

  it.each([
    "",
    "0x1234",
    `${address}/?output=javascript:alert(1)`,
    ` ${address}`,
    `${address} `,
  ])("rejects malformed address value %j", (value) => {
    expect(isEthereumAddress(value)).toBe(false);
    expect(getEtherscanAddressUrl(value)).toBeNull();
  });

  it.each(["", "0x1234", address, `${hash}?redirect=https://example.com`])(
    "rejects malformed transaction value %j",
    (value) => {
      expect(isEthereumTransactionHash(value)).toBe(false);
      expect(getEtherscanTransactionUrl(value)).toBeNull();
    },
  );
});
