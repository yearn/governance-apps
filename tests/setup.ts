import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { setFixedNow } from "@/lib/mocks/time";
import { resetMockStyfiStore } from "@/lib/clients/styfi/mock";
import { resetMockVeyfiStore } from "@/lib/clients/veyfi/mock";
import { resetMockYethStore } from "@/lib/clients/yeth/mock";
import { GLOBAL_WORLD_STATE } from "@/lib/mocks/world-state";
import type { ReactNode } from "react";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";

process.env.NEXT_PUBLIC_USE_MOCKS = "true";
process.env.NEXT_PUBLIC_E2E = "true";
process.env.NEXT_PUBLIC_RPC_URLS = "http://127.0.0.1:8545";
process.env.NEXT_PUBLIC_WC_PROJECT_ID = "test-project";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("wagmi", async () => {
  const actual = await vi.importActual<typeof import("wagmi")>("wagmi");
  return {
    ...actual,
    WagmiProvider: ({ children }: { children: ReactNode }) => children,
    useAccount: () => ({
      address: E2E_MOCK_ADDRESS,
      isConnected: true,
      chainId: 1,
    }),
    useWalletClient: () => ({ data: null }),
    usePublicClient: () => undefined,
    useDisconnect: () => ({ disconnectAsync: vi.fn() }),
    useReadContract: () => ({
      data: 0n,
      isLoading: false,
      refetch: async () => ({ data: 0n }),
    }),
  };
});

beforeEach(() => {
  process.env.NEXT_PUBLIC_USE_MOCKS = "true";
  process.env.NEXT_PUBLIC_E2E = "true";
});

afterEach(() => {
  cleanup();
  setFixedNow(null);
  resetMockStyfiStore();
  resetMockVeyfiStore();
  resetMockYethStore();
  GLOBAL_WORLD_STATE.reset();
});
