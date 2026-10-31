import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WalletPairingQr } from "@/web3/WalletPairingQr";

const uri = `wc:${"a1".repeat(32)}@2?relay-protocol=irn&symKey=${"b2".repeat(32)}&expiryTimestamp=1793500000`;
afterEach(cleanup);

describe("WalletPairingQr", () => {
  it("provides a locally encoded, accessible QR image and replaces expired payloads", () => {
    const { rerender } = render(<WalletPairingQr uri={uri} />);
    const image = screen.getByAltText("WalletConnect pairing QR code");
    const original = image.getAttribute("src");
    expect(original).toMatch(/^data:image\/gif;base64,/);
    rerender(<WalletPairingQr uri={uri.replace("a1", "c3")} />);
    expect(image.getAttribute("src")).not.toBe(original);
  });

  it("accepts dense payloads supported by the previous encoder", () => {
    render(<WalletPairingQr uri={uri + "&data=" + "a".repeat(1500)} />);
    expect(screen.getByAltText("WalletConnect pairing QR code")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("preserves a readable recovery message when QR capacity is exceeded", () => {
    render(<WalletPairingQr uri={"wc:" + "a".repeat(4000)} />);
    expect(screen.getByRole("alert").textContent).toContain("Copy the connection link instead");
    expect(screen.queryByAltText("WalletConnect pairing QR code")).toBeNull();
  });
});
