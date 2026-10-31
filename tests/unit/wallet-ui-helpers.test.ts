import { describe, expect, it } from "vitest";
import { walletErrorMessage, walletLaunchUrl } from "@/web3/wallet-ui-helpers";

describe("wallet error copy", () => {
  it("finds provider rejection codes in nested causes", () => {
    expect(walletErrorMessage({ cause: { code: 4001 } }, "connect")).toContain("declined");
  });

  it("explains the previous pairing fence without exposing SDK details", () => {
    expect(walletErrorMessage({ cause: { code: "WALLET_REQUEST_PENDING", message: "sensitive" } }, "connect"))
      .toBe("Request still pending. Reject it in your wallet or wait for expiry.");
  });

  it("explains an existing wallet prompt", () => {
    expect(walletErrorMessage({ code: -32002 }, "connect")).toContain("already open");
  });

  it("never reflects raw provider messages or pairing secrets", () => {
    const error = { message: "wc:secret?long-connection-token", cause: {} };
    expect(walletErrorMessage(error, "connect")).not.toContain("secret");
    expect(walletErrorMessage(error, "switch")).toContain("Select Ethereum Mainnet");
    expect(walletErrorMessage(error, "disconnect")).toBe("Could not disconnect. Try again.");
  });

  it("bounds traversal of cyclic provider errors", () => {
    const error: { cause?: unknown } = {};
    error.cause = error;
    expect(walletErrorMessage(error, "connect")).toContain("Could not connect");
  });
});

describe("wallet launch links", () => {
  it("encodes a v2 pairing URI once for each supported wallet route", () => {
    const uri = `wc:${"a".repeat(64)}@2?relay-protocol=irn&symKey=secret`;
    expect(walletLaunchUrl("metamask", uri)).toBe(`metamask://wc?uri=${encodeURIComponent(uri)}`);
    expect(walletLaunchUrl("rabby", uri)).toBe(`rabby://walletconnect?uri=${encodeURIComponent(uri)}`);
  });

  it("rejects arbitrary URLs and malformed pairing payloads", () => {
    expect(walletLaunchUrl("metamask", "javascript:alert(1)")).toBeUndefined();
    expect(walletLaunchUrl("rabby", "wc:broken@1?key=value")).toBeUndefined();
  });
});
