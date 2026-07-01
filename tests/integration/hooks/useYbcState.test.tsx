import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Address } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getYbcMockSnapshot, resetYbcMockStore } from "@/lib/clients/ybc/store";
import { useYbcState } from "@/lib/hooks/useYbc";

const { accountState } = vi.hoisted(() => ({
  accountState: {
    current: {
      address: null as Address | null,
      isConnected: false,
    },
  },
}));

vi.mock("wagmi", () => ({
  useAccount: () => accountState.current,
}));

vi.mock("@/state/protocol", () => ({
  useOptionalProtocol: () => null,
}));

function getMockData(state: ReturnType<typeof useYbcState>) {
  expect(state.backend).toBe("mock");
  if (state.backend !== "mock") {
    throw new Error("Expected YBC mock backend");
  }
  return state.data;
}

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useYbcState", () => {
  beforeEach(() => {
    resetYbcMockStore({ scenarioId: "operator-admin" });
    accountState.current = {
      address: null,
      isConnected: false,
    };
  });

  it("reseeds the default runtime on mount and when the connected wallet changes", async () => {
    const { result, rerender } = renderHook(() => useYbcState({ latencyMs: 0 }), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(getYbcMockSnapshot().scenarioId).toBe("observer");
    expect(getMockData(result.current).me.isMember).toBe(false);
    expect(getMockData(result.current).me.isOperator).toBe(false);

    act(() => {
      accountState.current = {
        address: "0x2222222222222222222222222222222222222222",
        isConnected: true,
      };
    });
    rerender();

    await waitFor(() => {
      expect(getYbcMockSnapshot().scenarioId).toBe("member-matured");
    });
    expect(getMockData(result.current).me.address?.toLowerCase()).toBe(
      "0x2222222222222222222222222222222222222222"
    );
    expect(getMockData(result.current).me.isMember).toBe(true);

    act(() => {
      accountState.current = {
        address: "0x1111111111111111111111111111111111111111",
        isConnected: true,
      };
    });
    rerender();

    await waitFor(() => {
      expect(getYbcMockSnapshot().scenarioId).toBe("member-ramping");
    });
    expect(getMockData(result.current).me.address?.toLowerCase()).toBe(
      "0x1111111111111111111111111111111111111111"
    );

    act(() => {
      accountState.current = {
        address: null,
        isConnected: false,
      };
    });
    rerender();

    await waitFor(() => {
      expect(getYbcMockSnapshot().scenarioId).toBe("observer");
    });
    expect(getMockData(result.current).me.address).toBeNull();
    expect(getMockData(result.current).me.isMember).toBe(false);
  });
});
