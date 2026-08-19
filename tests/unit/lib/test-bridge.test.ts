import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getMockTeamsRuntimeState,
  resetMockTeamsStore,
  setMockTeamsNow,
} from "@/lib/clients/teams";
import { setFixedNow } from "@/lib/mocks/time";
import { teamsKeys } from "@/lib/hooks/useTeams";
import { ybcKeys } from "@/lib/hooks/useYbc";
import { daoKeys } from "@/lib/hooks/daoKeys";
import {
  createTestBridge,
  type DaoTestBridgeAdapter,
  type TeamsTestBridgeAdapter,
  type YbcTestBridgeAdapter,
} from "@/lib/test-bridge";

const SECONDS_PER_DAY = 24 * 60 * 60;

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
    vi.restoreAllMocks();
    setFixedNow(null);
    resetMockTeamsStore();
  });

  it("wraps Teams, YBC, and DAO bridge methods with domain-root invalidation", async () => {
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
    const dao: DaoTestBridgeAdapter = {
      setDaoPersona: vi.fn().mockResolvedValue(undefined),
      setDaoTransactionOutcome: vi.fn().mockResolvedValue(undefined),
      indexDaoPendingAction: vi.fn().mockResolvedValue(undefined),
    };
    const bridge = createTestBridge({
      styfi: clients.styfi as never,
      veyfi: clients.veyfi as never,
      yeth: clients.yeth as never,
      queryClient,
      teams,
      ybc,
      dao,
    });

    await bridge.setTeamsViewerRole?.("admin");
    await bridge.patchYbcProposal?.("proposal-1", { status: "passed" });
    await bridge.setDaoPersona?.("guardian");
    await bridge.setDaoTransactionOutcome?.("revert");
    await bridge.indexDaoPendingAction?.();

    expect(teams.setTeamsViewerRole).toHaveBeenCalledWith("admin");
    expect(ybc.patchYbcProposal).toHaveBeenCalledWith("proposal-1", {
      status: "passed",
    });
    expect(dao.setDaoPersona).toHaveBeenCalledWith("guardian");
    expect(dao.setDaoTransactionOutcome).toHaveBeenCalledWith("revert");
    expect(dao.indexDaoPendingAction).toHaveBeenCalled();
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
  });

  it("runs shared reset and time hooks for Teams, YBC, and DAO adapters", async () => {
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
    const dao: DaoTestBridgeAdapter = {
      resetDao: vi.fn().mockResolvedValue(undefined),
      onSetNow: vi.fn().mockResolvedValue(undefined),
    };
    const bridge = createTestBridge({
      styfi: clients.styfi as never,
      veyfi: clients.veyfi as never,
      yeth: clients.yeth as never,
      queryClient,
      teams,
      ybc,
      dao,
    });

    await bridge.setNow(1_725_000_000);
    await bridge.reset();

    expect(teams.onSetNow).toHaveBeenCalledWith(1_725_000_000);
    expect(ybc.onSetNow).toHaveBeenCalledWith(1_725_000_000);
    expect(dao.onSetNow).toHaveBeenCalledWith(1_725_000_000);
    expect(invalidateQueries).toHaveBeenCalledWith({ refetchType: "all" });
    expect(teams.resetTeams).toHaveBeenCalled();
    expect(ybc.resetYbc).toHaveBeenCalled();
    expect(dao.resetDao).toHaveBeenCalled();
    expect(resetQueries).toHaveBeenCalled();
  });

  it("awaits a DAO mutation before invalidating its infinitely fresh queries", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined);
    const clients = createBridgeClients();
    let finishMutation!: () => void;
    const dao: DaoTestBridgeAdapter = {
      setDaoAnalysisState: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finishMutation = resolve;
          })
      ),
    };
    const bridge = createTestBridge({
      styfi: clients.styfi as never,
      veyfi: clients.veyfi as never,
      yeth: clients.yeth as never,
      queryClient,
      dao,
    });

    const mutation = bridge.setDaoAnalysisState?.("partial");
    expect(dao.setDaoAnalysisState).toHaveBeenCalledWith("partial");
    expect(invalidateQueries).not.toHaveBeenCalled();

    finishMutation();
    await mutation;

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: daoKeys.all,
      refetchType: "all",
    });
  });

  it("clears the shared clock before rebuilding Teams state on reset", async () => {
    const start = 1_725_000_000;

    vi.spyOn(Date, "now").mockReturnValue(start * 1000);

    setFixedNow(start);
    resetMockTeamsStore();

    const queryClient = new QueryClient();
    vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined);
    vi.spyOn(queryClient, "resetQueries").mockResolvedValue(undefined);
    const clients = createBridgeClients();
    const teams: TeamsTestBridgeAdapter = {
      resetTeams: vi.fn(async () => {
        resetMockTeamsStore();
      }),
      onSetNow: vi.fn(async (timestamp: number) => {
        setMockTeamsNow(timestamp);
      }),
    };
    const bridge = createTestBridge({
      styfi: clients.styfi as never,
      veyfi: clients.veyfi as never,
      yeth: clients.yeth as never,
      queryClient,
      teams,
    });

    await bridge.setNow(start + 14 * SECONDS_PER_DAY);
    expect(getMockTeamsRuntimeState().data.currentPeriod).toBe(6);

    await bridge.reset();

    let runtime = getMockTeamsRuntimeState();
    expect(runtime.data.currentPeriod).toBe(4);
    expect(runtime.periodAnchorTimeSeconds).toBe(start);

    await bridge.setNow(start + 7 * SECONDS_PER_DAY);

    runtime = getMockTeamsRuntimeState();
    expect(runtime.currentTimeSeconds).toBe(start + 7 * SECONDS_PER_DAY);
    expect(runtime.periodAnchorTimeSeconds).toBe(start);
    expect(runtime.timeTravelDays).toBe(7);
    expect(runtime.data.currentPeriod).toBe(5);
  });
});
