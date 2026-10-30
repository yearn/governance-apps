import { afterEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  factory: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock("@rainbow-me/rainbowkit", () => ({
  getWalletConnectConnector: mock.factory,
}));
import { oathWallet } from "@/web3/oath-wallet";

afterEach(() => vi.clearAllMocks());

it("isolates Oath sessions and preserves host WalletConnect options and lifecycle methods", () => {
  const walletConnectParameters = {
    customStoragePrefix: "shared-host",
    disableProviderPing: true,
  };
  const wallet = oathWallet({
    projectId: "host-project",
    walletConnectParameters,
  });
  const delegate = vi.fn(() => ({
    id: "walletConnect",
    name: "WalletConnect",
    connect: mock.connect,
    disconnect: mock.disconnect,
  }));
  const withDetails = vi.fn(() => delegate);
  mock.factory.mockReturnValue(withDetails);
  const details = {
    rkDetails: {
      ...wallet,
      index: 0,
      groupIndex: 0,
      groupName: "Wallets",
      isRainbowKitConnector: true,
    },
  };
  const connector = wallet.createConnector(details);
  // The delegate owns Wagmi lifecycle behavior. Its config is passed through intact.
  const config = {} as Parameters<typeof connector>[0];
  const result = connector(config);
  expect(mock.factory).toHaveBeenCalledWith({
    projectId: "host-project",
    walletConnectParameters: {
      disableProviderPing: true,
      customStoragePrefix: "oath-wallet",
    },
  });
  expect(walletConnectParameters.customStoragePrefix).toBe("shared-host");
  expect(withDetails).toHaveBeenCalledWith(details);
  expect(delegate).toHaveBeenCalledWith(config);
  expect(result.id).toBe("oath-wallet");
  expect(result.name).toBe("Oath Wallet");
  expect(result.connect).toBe(mock.connect);
  expect(result.disconnect).toBe(mock.disconnect);
});
