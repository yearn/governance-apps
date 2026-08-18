import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DebugControls,
  resetAllDebugMockStores,
} from "@/components/DebugControls";
import {
  MockControls as TeamsMockControls,
} from "@/app/teams/components/MockControls";
import {
  MockControls as YbcMockControls,
} from "@/app/ybc/components/MockControls";
import { teamsKeys } from "@/lib/hooks/useTeams";
import { ybcKeys } from "@/lib/hooks/useYbc";
import { daoKeys } from "@/lib/hooks/daoKeys";
import { resetMockStyfiStore } from "@/lib/clients/styfi/mock";
import { resetMockVeyfiStore } from "@/lib/clients/veyfi/mock";
import { resetMockYethStore } from "@/lib/clients/yeth/mock";
import { resetMockTeamsStore } from "@/lib/clients/teams/mock";
import { resetYbcMockStore } from "@/lib/clients/ybc/store";
import {
  DAO_MOCK_NOW,
  getDaoMockSnapshot,
  resetDaoMockStore,
} from "@/lib/clients/dao";
import { nowSeconds, setFixedNow } from "@/lib/mocks/time";

const { disconnectAsync } = vi.hoisted(() => ({
  disconnectAsync: vi.fn(),
}));

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useDisconnect: () => ({
      disconnectAsync,
    }),
    useAccount: () => ({
      address: undefined,
      chainId: 1,
      isConnected: false,
    }),
  };
});

vi.mock("@/lib/clients/styfi/mock", () => ({
  resetMockStyfiStore: vi.fn(),
}));

vi.mock("@/lib/clients/veyfi/mock", () => ({
  resetMockVeyfiStore: vi.fn(),
}));

vi.mock("@/lib/clients/yeth/mock", () => ({
  resetMockYethStore: vi.fn(),
}));

vi.mock("@/lib/clients/teams/mock", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/clients/teams/mock")
  >();
  return { ...actual, resetMockTeamsStore: vi.fn() };
});

vi.mock("@/lib/clients/ybc/store", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/clients/ybc/store")
  >();
  return { ...actual, resetYbcMockStore: vi.fn() };
});

vi.mock("@/lib/clients/dao/store", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/clients/dao/store")
  >();
  return {
    ...actual,
    resetDaoMockStore: vi.fn(actual.resetDaoMockStore),
  };
});

describe("DebugControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setFixedNow(DAO_MOCK_NOW);
    resetDaoMockStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    setFixedNow(null);
  });

  it("renders shared sections and invalidates Teams, YBC, and section query roots on time travel", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    let resolveTimeTravel!: () => void;
    const onTimeTravel = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveTimeTravel = resolve;
        })
    );
    const customQueryKey = ["teams-runtime"] as const;

    render(
      <QueryClientProvider client={queryClient}>
        <DebugControls
          sections={[
            {
              id: "teams",
              title: "Teams",
              content: <p>Teams runtime controls</p>,
              queryKeys: [customQueryKey],
              onTimeTravel,
            },
          ]}
        />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /debug/i }));

    expect(screen.getByText("App Specific")).toBeInTheDocument();
    expect(screen.getByText("Teams")).toBeInTheDocument();
    expect(screen.getByText("Teams runtime controls")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "+1 Day" }));

    await waitFor(() => {
      expect(nowSeconds()).toBe(DAO_MOCK_NOW + 24 * 60 * 60);
    });
    expect(onTimeTravel).toHaveBeenCalledWith(1);
    expect(invalidateQueries).not.toHaveBeenCalled();

    resolveTimeTravel();

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: teamsKeys.all,
        refetchType: "all",
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ybcKeys.all,
        refetchType: "all",
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: daoKeys.all,
        refetchType: "all",
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: customQueryKey,
        refetchType: "all",
      });
    });
  });

  it("advances the shared clock and DAO snapshot from a route without a DAO section", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);

    render(
      <QueryClientProvider client={queryClient}>
        <DebugControls />
      </QueryClientProvider>
    );

    expect(getDaoMockSnapshot().now).toBe(DAO_MOCK_NOW);
    fireEvent.click(screen.getByRole("button", { name: /debug/i }));
    fireEvent.click(screen.getByRole("button", { name: "+7 Days" }));

    await waitFor(() => {
      expect(nowSeconds()).toBe(DAO_MOCK_NOW + 7 * 24 * 60 * 60);
      expect(getDaoMockSnapshot().now).toBe(
        DAO_MOCK_NOW + 7 * 24 * 60 * 60
      );
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: daoKeys.all,
        refetchType: "all",
      });
    });
  });

  it("resets every participating mock domain from any route", () => {
    resetAllDebugMockStores();

    expect(resetMockStyfiStore).toHaveBeenCalledOnce();
    expect(resetMockVeyfiStore).toHaveBeenCalledOnce();
    expect(resetMockYethStore).toHaveBeenCalledOnce();
    expect(resetMockTeamsStore).toHaveBeenCalledOnce();
    expect(resetYbcMockStore).toHaveBeenCalledOnce();
    expect(resetDaoMockStore).toHaveBeenCalledOnce();
  });

  it("resets each shared store once from the Teams route section", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <TeamsMockControls />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /debug/i }));
    fireEvent.click(
      screen.getByRole("button", { name: "Reset App (Full Wipe)" })
    );

    await waitFor(() => {
      expect(disconnectAsync).toHaveBeenCalledOnce();
      expect(resetMockStyfiStore).toHaveBeenCalledOnce();
      expect(resetMockVeyfiStore).toHaveBeenCalledOnce();
      expect(resetMockYethStore).toHaveBeenCalledOnce();
      expect(resetMockTeamsStore).toHaveBeenCalledOnce();
      expect(resetYbcMockStore).toHaveBeenCalledOnce();
      expect(resetDaoMockStore).toHaveBeenCalledOnce();
    });
  });

  it("resets each shared store once from the YBC route section", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <YbcMockControls />
      </QueryClientProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: /debug/i }));
    fireEvent.click(
      screen.getByRole("button", { name: "Reset App (Full Wipe)" })
    );

    await waitFor(() => {
      expect(disconnectAsync).toHaveBeenCalledOnce();
      expect(resetMockStyfiStore).toHaveBeenCalledOnce();
      expect(resetMockVeyfiStore).toHaveBeenCalledOnce();
      expect(resetMockYethStore).toHaveBeenCalledOnce();
      expect(resetMockTeamsStore).toHaveBeenCalledOnce();
      expect(resetYbcMockStore).toHaveBeenCalledOnce();
      expect(resetDaoMockStore).toHaveBeenCalledOnce();
    });
  });
});
