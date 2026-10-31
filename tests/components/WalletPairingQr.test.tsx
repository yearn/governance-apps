import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WalletPairingQr } from "@/web3/WalletPairingQr";

const uri = `wc:${"a1".repeat(32)}@2?relay-protocol=irn&symKey=${"b2".repeat(32)}&expiryTimestamp=1793500000`;
afterEach(cleanup);

describe("WalletPairingQr", () => {
  it("provides a locally encoded, accessible QR image with a decorative Yearn mark", () => {
    render(<WalletPairingQr uri={uri} />);
    const image = screen.getByAltText("WalletConnect pairing QR code");
    expect(image.getAttribute("src")).toMatch(/^data:image\/gif;base64,/);
    expect(screen.getByTestId("wallet-pairing-qr-mark").getAttribute("aria-hidden")).toBe("true");
  });

  it("switches to the exact unobstructed image without replacing the pairing payload", async () => {
    const user = userEvent.setup();
    render(<WalletPairingQr uri={uri} />);
    const image = screen.getByAltText("WalletConnect pairing QR code");
    const source = image.getAttribute("src");
    await user.click(screen.getByRole("button", { name: "Use plain QR" }));
    expect(screen.queryByTestId("wallet-pairing-qr-mark")).toBeNull();
    expect(image.getAttribute("src")).toBe(source);
    await user.click(screen.getByRole("button", { name: "Use branded QR" }));
    expect(screen.getByTestId("wallet-pairing-qr-mark")).toBeTruthy();
    expect(image.getAttribute("src")).toBe(source);
  });

  it("replaces expired payloads while retaining the user's plain QR choice", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<WalletPairingQr uri={uri} />);
    const image = screen.getByAltText("WalletConnect pairing QR code");
    const source = image.getAttribute("src");
    await user.click(screen.getByRole("button", { name: "Use plain QR" }));
    rerender(<WalletPairingQr uri={uri.replace("a1", "c3")} />);
    expect(image.getAttribute("src")).not.toBe(source);
    expect(screen.queryByTestId("wallet-pairing-qr-mark")).toBeNull();
    expect(screen.getByRole("button", { name: "Use branded QR" })).toBeTruthy();
  });

  it("keeps denser payloads supported by the previous encoder plain", () => {
    render(<WalletPairingQr uri={uri + "&data=" + "a".repeat(1500)} />);
    expect(screen.getByAltText("WalletConnect pairing QR code")).toBeTruthy();
    expect(screen.queryByTestId("wallet-pairing-qr-mark")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("preserves a readable recovery message when QR capacity is exceeded", () => {
    render(<WalletPairingQr uri={"wc:" + "a".repeat(4000)} />);
    expect(screen.getByRole("alert").textContent).toContain("Copy the connection link instead");
    expect(screen.queryByAltText("WalletConnect pairing QR code")).toBeNull();
  });
});
