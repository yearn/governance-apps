import type { QueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { formatUnits, parseUnits } from "viem";
import type { StyfiClient, StyfiStakeMode } from "@/lib/clients/styfi/client";
import type { VeyfiClient } from "@/lib/clients/veyfi/client";
import type { YethClient, YethDebugPreset } from "@/lib/clients/yeth";
import { GLOBAL_WORLD_STATE } from "@/lib/mocks/world-state";
import { setFixedNow } from "@/lib/mocks/time";
import { resetMockStyfiStore } from "@/lib/clients/styfi/mock";
import {
  resetMockVeyfiStore,
  setMockRedemptionCapsExhausted,
} from "@/lib/clients/veyfi/mock";
import { resetMockYethStore } from "@/lib/clients/yeth/mock";
import {
  MOCK_COVEYFI_ADDRESS,
  MOCK_SDYFI_ADDRESS,
  MOCK_UPYFI_ADDRESS,
  MOCK_YFI_ADDRESS,
} from "@/lib/constants";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";

// Known tokens for tests. Extend only when added to app logic.
export type TokenSymbol =
  | "YFI"
  | "stYFI"
  | "stYFIx"
  | "sdYFI"
  | "upYFI"
  | "coveYFI";

export interface TestBridge {
  reset: () => Promise<void>;
  setNow: (timestamp: number) => Promise<void>;
  getState: (address: Address) => Promise<{
    balances: Record<TokenSymbol, string>;
    styfi: {
      active: string;
      cooldown: string;
      withdrawable: string;
    };
    veyfi: {
      legacyBalance: string;
      migrated: boolean;
      llyfi: Record<TokenSymbol, { staked: string; cooldown: string }>;
    };
    yeth: {
      snapshotLoss: string;
      claimableNow: string;
      recoveryShares: string;
    };
    isBlacklisted: boolean;
  }>;
  setBalance: (
    address: Address,
    symbol: TokenSymbol,
    amount: string
  ) => Promise<void>;
  setAllowance: (
    address: Address,
    symbol: TokenSymbol,
    spender: Address,
    amount: string
  ) => Promise<void>;
  setScenario: (
    name: "standard" | "active" | "legacy_user" | "caps_exhausted"
  ) => Promise<void>;
  setYethPreset: (address: Address, preset: YethDebugPreset) => Promise<void>;
  seedExternalPortfolio: (address: Address) => Promise<void>;
}

type TestBridgeDeps = {
  styfi: StyfiClient;
  veyfi: VeyfiClient;
  yeth: YethClient;
  queryClient: QueryClient;
};

const TOKEN_DECIMALS: Record<TokenSymbol, number> = {
  YFI: 18,
  stYFI: 18,
  stYFIx: 18,
  sdYFI: 18,
  upYFI: 18,
  coveYFI: 18,
};

const LLYFI_ADDRESS: Record<"sdYFI" | "upYFI" | "coveYFI", Address> = {
  sdYFI: MOCK_SDYFI_ADDRESS,
  upYFI: MOCK_UPYFI_ADDRESS,
  coveYFI: MOCK_COVEYFI_ADDRESS,
};

function parseStrictAmount(value: string, decimals: number): bigint {
  if (!value) throw new Error("Amount is required.");
  if (value.includes(",")) {
    throw new Error("Invalid amount format. Commas are not allowed.");
  }
  if (!/^\d+(\.\d+)?$/.test(value)) {
    throw new Error("Invalid amount format. Use digits and one decimal point.");
  }
  return parseUnits(value, decimals);
}

function formatStrictAmount(amount: bigint, decimals: number): string {
  return formatUnits(amount, decimals);
}

function requireDebugMethod<T extends (...args: never[]) => unknown>(
  fn: T | undefined,
  name: string
): T {
  if (!fn) {
    throw new Error(`Test bridge requires mock clients. Missing ${name}.`);
  }
  return fn;
}

function resolveStyfiMode(symbol: TokenSymbol): StyfiStakeMode | null {
  if (symbol === "stYFI") return "stYFI";
  if (symbol === "stYFIx") return "stYFIx";
  return null;
}

export function createTestBridge({
  styfi,
  veyfi,
  yeth,
  queryClient,
}: TestBridgeDeps): TestBridge {
  const debugSetStyfiBalance = requireDebugMethod(
    styfi.debugSetBalance?.bind(styfi),
    "styfi.debugSetBalance"
  );
  const debugSetStyfiAllowance = requireDebugMethod(
    styfi.debugSetAllowance?.bind(styfi),
    "styfi.debugSetAllowance"
  );
  const debugSetVeyfiAllowance = requireDebugMethod(
    veyfi.debugSetAllowance?.bind(veyfi),
    "veyfi.debugSetAllowance"
  );
  const debugSetPendingVeYfi = requireDebugMethod(
    veyfi.debugSetPendingVeYfi?.bind(veyfi),
    "veyfi.debugSetPendingVeYfi"
  );
  const debugSetLlyfiBalance = requireDebugMethod(
    veyfi.debugSetLlyfiBalance?.bind(veyfi),
    "veyfi.debugSetLlyfiBalance"
  );
  const debugSeedStakedExternalPortfolio = requireDebugMethod(
    veyfi.debugSeedStakedExternalPortfolio?.bind(veyfi),
    "veyfi.debugSeedStakedExternalPortfolio"
  );
  const debugSetYethPreset = requireDebugMethod(
    yeth.debugSetAccountPreset?.bind(yeth),
    "yeth.debugSetAccountPreset"
  );

  const reset = async () => {
    resetMockStyfiStore();
    resetMockVeyfiStore();
    resetMockYethStore();
    GLOBAL_WORLD_STATE.reset();
    setFixedNow(null);
    await queryClient.resetQueries();
  };

  const setNow = async (timestamp: number) => {
    setFixedNow(timestamp);
    await queryClient.invalidateQueries({ refetchType: "all" });
  };

  const getState = async (address: Address) => {
    const [styfiState, veyfiState, yethState] = await Promise.all([
      styfi.getAccountState(address),
      veyfi.getAccountState(address),
      yeth.getAccountState(address),
    ]);
    const identity = GLOBAL_WORLD_STATE.get(address);
    const veYfi = veyfiState.veYfi ?? {
      legacyBalance: 0n,
      migrated: false,
    };

    const llyfiState = Object.fromEntries(
      veyfiState.llyfiTokens.map((token) => [
        token.symbol,
        {
          staked: formatStrictAmount(token.stakedBalance, 18),
          cooldown: formatStrictAmount(token.cooldownBalance, 18),
        },
      ])
    ) as Record<TokenSymbol, { staked: string; cooldown: string }>;

    return {
      balances: {
        YFI: formatStrictAmount(identity.yfiBalance, TOKEN_DECIMALS.YFI),
        stYFI: formatStrictAmount(
          styfiState.styfiActive +
            styfiState.styfiInCooldown +
            styfiState.styfiUnlocked,
          TOKEN_DECIMALS.stYFI
        ),
        stYFIx: formatStrictAmount(
          styfiState.styfiX.assetsActive +
            styfiState.styfiX.assetsInCooldown +
            styfiState.styfiX.assetsUnlocked,
          TOKEN_DECIMALS.stYFIx
        ),
        sdYFI: formatStrictAmount(
          veyfiState.llyfiTokens.find((t) => t.symbol === "sdYFI")
            ?.walletBalance ?? 0n,
          TOKEN_DECIMALS.sdYFI
        ),
        upYFI: formatStrictAmount(
          veyfiState.llyfiTokens.find((t) => t.symbol === "upYFI")
            ?.walletBalance ?? 0n,
          TOKEN_DECIMALS.upYFI
        ),
        coveYFI: formatStrictAmount(
          veyfiState.llyfiTokens.find((t) => t.symbol === "coveYFI")
            ?.walletBalance ?? 0n,
          TOKEN_DECIMALS.coveYFI
        ),
      },
      styfi: {
        active: formatStrictAmount(styfiState.styfiActive, 18),
        cooldown: formatStrictAmount(styfiState.styfiInCooldown, 18),
        withdrawable: formatStrictAmount(styfiState.styfiWithdrawable, 18),
      },
      veyfi: {
        legacyBalance: formatStrictAmount(veYfi.legacyBalance, 18),
        migrated: veYfi.migrated,
        llyfi: llyfiState,
      },
      yeth: {
        snapshotLoss: formatStrictAmount(yethState.snapshotLossEth, 18),
        claimableNow: formatStrictAmount(yethState.claimableNowEth, 18),
        recoveryShares: formatStrictAmount(yethState.recoveryVaultShares, 18),
      },
      isBlacklisted: identity.isBlacklisted,
    };
  };

  const setBalance = async (
    address: Address,
    symbol: TokenSymbol,
    amount: string
  ) => {
    const decimals = TOKEN_DECIMALS[symbol];
    const parsed = parseStrictAmount(amount, decimals);

    if (symbol === "YFI") {
      GLOBAL_WORLD_STATE.setYfi(address, parsed);
    } else if (symbol === "sdYFI" || symbol === "upYFI" || symbol === "coveYFI") {
      debugSetLlyfiBalance(address, symbol, parsed);
    } else {
      const mode = resolveStyfiMode(symbol);
      if (!mode) throw new Error(`Unsupported token symbol: ${symbol}`);
      const state = await styfi.getAccountState(address);
      const current =
        mode === "stYFI" ? state.styfiActive : state.styfiX.assetsActive;
      const delta = parsed - current;
      debugSetStyfiBalance(address, mode, delta);
    }

    await queryClient.invalidateQueries({ refetchType: "all" });
  };

  const setAllowance = async (
    address: Address,
    symbol: TokenSymbol,
    spender: Address,
    amount: string
  ) => {
    const decimals = TOKEN_DECIMALS[symbol];
    const parsed = parseStrictAmount(amount, decimals);

    const tokenAddress =
      symbol === "sdYFI" || symbol === "upYFI" || symbol === "coveYFI"
        ? LLYFI_ADDRESS[symbol]
        : MOCK_YFI_ADDRESS;

    debugSetStyfiAllowance(address, tokenAddress, spender, parsed);
    debugSetVeyfiAllowance(address, tokenAddress, spender, parsed);

    await queryClient.invalidateQueries({ refetchType: "all" });
  };

  const setScenario = async (
    name: "standard" | "active" | "legacy_user" | "caps_exhausted"
  ) => {
    await reset();

    if (name === "active") {
      GLOBAL_WORLD_STATE.setYfi(E2E_MOCK_ADDRESS, parseUnits("100", 18));
      debugSetStyfiBalance(E2E_MOCK_ADDRESS, "stYFI", parseUnits("25", 18));
    } else if (name === "legacy_user") {
      debugSetPendingVeYfi(parseUnits("100", 18));
    } else if (name === "caps_exhausted") {
      setMockRedemptionCapsExhausted();
    }

    await queryClient.invalidateQueries({ refetchType: "all" });
  };

  const seedExternalPortfolio = async (address: Address) => {
    debugSeedStakedExternalPortfolio(address);
    await queryClient.invalidateQueries({ refetchType: "all" });
  };

  const setYethPreset = async (address: Address, preset: YethDebugPreset) => {
    debugSetYethPreset(address, preset);
    await queryClient.invalidateQueries({ refetchType: "all" });
  };

  return {
    reset,
    setNow,
    getState,
    setBalance,
    setAllowance,
    setScenario,
    setYethPreset,
    seedExternalPortfolio,
  };
}
