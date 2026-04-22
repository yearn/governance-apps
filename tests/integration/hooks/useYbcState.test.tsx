import { act, renderHook, waitFor } from "@testing-library/react";
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

describe("useYbcState", () => {
  beforeEach(() => {
    resetYbcMockStore({ scenarioId: "operator-admin" });
    accountState.current = {
      address: null,
      isConnected: false,
    };
  });

  it("reseeds the default runtime on mount and when the connected wallet changes", async () => {
    const { result, rerender } = renderHook(() => useYbcState({ latencyMs: 0 }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(getYbcMockSnapshot().scenarioId).toBe("observer");
    expect(result.current.data.me.isMember).toBe(false);
    expect(result.current.data.me.isOperator).toBe(false);

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
    expect(result.current.data.me.address?.toLowerCase()).toBe(
      "0x2222222222222222222222222222222222222222"
    );
    expect(result.current.data.me.isMember).toBe(true);

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
    expect(result.current.data.me.address?.toLowerCase()).toBe(
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
    expect(result.current.data.me.address).toBeNull();
    expect(result.current.data.me.isMember).toBe(false);
  });
});
