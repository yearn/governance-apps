import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DebugControls } from "@/components/DebugControls";
import { teamsKeys } from "@/lib/hooks/useTeams";
import { ybcKeys } from "@/lib/hooks/useYbc";

const { debugAdvanceTime, disconnectAsync } = vi.hoisted(() => ({
  disconnectAsync: vi.fn(),
  debugAdvanceTime: vi.fn(),
}));

vi.mock("wagmi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("wagmi")>();
  return {
    ...actual,
    useDisconnect: () => ({
      disconnectAsync,
    }),
  };
});

vi.mock("@/lib/mocks/time", () => ({
  debugAdvanceTime,
}));

vi.mock("@/lib/clients/styfi/mock", () => ({
  resetMockStyfiStore: vi.fn(),
}));

vi.mock("@/lib/clients/veyfi/mock", () => ({
  resetMockVeyfiStore: vi.fn(),
}));

vi.mock("@/lib/clients/yeth/mock", () => ({
  resetMockYethStore: vi.fn(),
}));

describe("DebugControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders shared sections and invalidates Teams, YBC, and section query roots on time travel", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const onTimeTravel = vi.fn().mockResolvedValue(undefined);
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
      expect(debugAdvanceTime).toHaveBeenCalledWith(24 * 60 * 60);
    });
    expect(onTimeTravel).toHaveBeenCalledWith(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teamsKeys.all,
      refetchType: "all",
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ybcKeys.all,
      refetchType: "all",
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: customQueryKey,
      refetchType: "all",
    });
  });
});
