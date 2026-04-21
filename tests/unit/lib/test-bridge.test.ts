import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { teamsKeys } from "@/lib/hooks/useTeams";
import { ybcKeys } from "@/lib/hooks/useYbc";
import {
  createTestBridge,
  type TeamsTestBridgeAdapter,
  type YbcTestBridgeAdapter,
} from "@/lib/test-bridge";

function createBridgeClients() {
  return {
    styfi: {
      debugSetBalance: vi.fn(),
      debugSetAllowance: vi.fn(),
    },
    veyfi: {
      debugSetAllowance: vi.fn(),
      debugSetPendingVeYfi: vi.fn(),
      debugSetLlyfiBalance: vi.fn(),
      debugSeedStakedExternalPortfolio: vi.fn(),
    },
    yeth: {
      debugSetAccountPreset: vi.fn(),
    },
  };
}

describe("createTestBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wraps Teams and YBC bridge methods with domain-root invalidation", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const clients = createBridgeClients();
    const teams: TeamsTestBridgeAdapter = {
      setTeamsViewerRole: vi.fn().mockResolvedValue(undefined),
    };
    const ybc: YbcTestBridgeAdapter = {
      patchYbcProposal: vi.fn().mockResolvedValue(undefined),
    };
    const bridge = createTestBridge({
      styfi: clients.styfi as never,
      veyfi: clients.veyfi as never,
      yeth: clients.yeth as never,
      queryClient,
      teams,
      ybc,
    });

    await bridge.setTeamsViewerRole?.("admin");
    await bridge.patchYbcProposal?.("proposal-1", { status: "passed" });

    expect(teams.setTeamsViewerRole).toHaveBeenCalledWith("admin");
    expect(ybc.patchYbcProposal).toHaveBeenCalledWith("proposal-1", {
      status: "passed",
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: teamsKeys.all,
      refetchType: "all",
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ybcKeys.all,
      refetchType: "all",
    });
  });

  it("runs shared reset and time hooks for Teams and YBC adapters", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const resetQueries = vi
      .spyOn(queryClient, "resetQueries")
      .mockResolvedValue(undefined);
    const clients = createBridgeClients();
    const teams: TeamsTestBridgeAdapter = {
      resetTeams: vi.fn().mockResolvedValue(undefined),
      onSetNow: vi.fn().mockResolvedValue(undefined),
    };
    const ybc: YbcTestBridgeAdapter = {
      resetYbc: vi.fn().mockResolvedValue(undefined),
      onSetNow: vi.fn().mockResolvedValue(undefined),
    };
    const bridge = createTestBridge({
      styfi: clients.styfi as never,
      veyfi: clients.veyfi as never,
      yeth: clients.yeth as never,
      queryClient,
      teams,
      ybc,
    });

    await bridge.setNow(1_725_000_000);
    await bridge.reset();

    expect(teams.onSetNow).toHaveBeenCalledWith(1_725_000_000);
    expect(ybc.onSetNow).toHaveBeenCalledWith(1_725_000_000);
    expect(invalidateQueries).toHaveBeenCalledWith({ refetchType: "all" });
    expect(teams.resetTeams).toHaveBeenCalled();
    expect(ybc.resetYbc).toHaveBeenCalled();
    expect(resetQueries).toHaveBeenCalled();
  });
});
