import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { oathWallet, OATH_WALLET_ID } from "@/web3/oath-wallet";

const projectId = "test-project-id";
const uri = "wc:test-topic@2?relay-protocol=irn&symKey=test-key";

afterEach(() => vi.unstubAllGlobals());

describe("Oath Wallet", () => {
  it("preserves the raw pairing URI for scanning and encodes it once for iOS", () => {
    const wallet = oathWallet({ projectId });
    expect(wallet.qrCode?.getUri(uri)).toBe(uri);
    const mobile = new URL(wallet.mobile!.getUri!(uri));
    expect(mobile.protocol).toBe("oathwallet:");
    expect(mobile.hostname).toBe("wc");
    expect(mobile.searchParams.get("uri")).toBe(uri);
    expect([...mobile.searchParams.keys()]).toEqual(["uri"]);
  });

  it("offers only the existing iOS app, without claiming an injected provider", () => {
    const wallet = oathWallet({ projectId });
    expect(wallet.downloadUrls).toEqual({
      ios: "https://apps.apple.com/app/id6780187283",
      qrCode: "https://apps.apple.com/app/id6780187283",
    });
    expect(wallet.extension).toBeUndefined();
    expect(wallet.installed).toBeUndefined();
    expect(wallet.qrCode?.instructions?.steps.map((step) => step.step)).toEqual(
      ["install", "scan", "connect"],
    );
  });

  it.each(["Mozilla/5.0 (iPhone)", "Mozilla/5.0 (Macintosh)"])(
    "is visible on %s",
    (userAgent) => {
      vi.stubGlobal("navigator", { userAgent });
      expect(oathWallet({ projectId }).hidden).toBeUndefined();
    },
  );

  it("hides the iOS-only entry on Android", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 16)",
    });
    expect(oathWallet({ projectId }).hidden?.()).toBe(true);
  });

  it("loads a local, rounded icon without remote resources", () => {
    const wallet = oathWallet({ projectId });
    expect(wallet.iconUrl).toBe("/oath-wallet.svg");
    const svg = readFileSync("public/oath-wallet.svg", "utf8");
    expect(svg).toMatch(/<svg/);
    expect(svg).toMatch(/rx="[1-9]/);
    expect(svg).not.toMatch(/<script|<image|onload=|href=/i);
  });

  it("keeps the named connector distinct from generic WalletConnect", () => {
    const connectors = connectorsForWallets(
      [{ groupName: "Wallets", wallets: [oathWallet, walletConnectWallet] }],
      { appName: "Yearn Governance Apps", projectId },
    );
    const config = createConfig({
      chains: [mainnet],
      transports: { [mainnet.id]: http() },
      connectors,
    });
    const oath = config.connectors.filter(
      (connector) => connector.id === OATH_WALLET_ID,
    );
    expect(oath).toHaveLength(1);
    expect(oath[0].name).toBe("Oath Wallet");
    expect(
      config.connectors.some((connector) => connector.id !== OATH_WALLET_ID),
    ).toBe(true);
  });
});
