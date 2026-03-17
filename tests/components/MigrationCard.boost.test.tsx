import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MigrationCard } from "@/app/veyfi/components/MigrationCard";

const {
  mockUseVeyfiAccount,
  mockUseVeyfiMigration,
  mockUseStyfiApy,
  mockUseProtocol,
  mockUseEpochClock,
} = vi.hoisted(() => ({
  mockUseVeyfiAccount: vi.fn(),
  mockUseVeyfiMigration: vi.fn(),
  mockUseStyfiApy: vi.fn(),
  mockUseProtocol: vi.fn(),
  mockUseEpochClock: vi.fn(),
}));

vi.mock("@/lib/hooks/useVeyfi", () => ({
  useVeyfiAccount: () => mockUseVeyfiAccount(),
  useVeyfiMigration: () => mockUseVeyfiMigration(),
}));

vi.mock("@/lib/hooks/useStyfi", () => ({
  useStyfiApy: () => mockUseStyfiApy(),
}));

vi.mock("@/state/protocol", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state/protocol")>();
  return {
    ...actual,
    useProtocol: () => mockUseProtocol(),
  };
});

vi.mock("@/lib/hooks/useEpochClock", () => ({
  useEpochClock: () => mockUseEpochClock(),
}));

const ONE = 10n ** 18n;

const migratedAccountState = {
  veYfi: {
    legacyBalance: 0n,
    lockedAmount: 100n * ONE,
    migrationEligible: true,
    migrated: true,
    boostEpochs: 95,
    // Keep unlockTime present for metadata rendering; boost display should not
    // derive from it.
    unlockTime: 1885413132,
  },
  llyfiTokens: [{ veyfiBoost: 1.88 }],
} as const;

describe("MigrationCard boost display", () => {
  beforeEach(() => {
    mockUseVeyfiAccount.mockReturnValue({ data: migratedAccountState });
    mockUseVeyfiMigration.mockReturnValue({
      write: vi.fn(),
      state: { status: "idle" },
    });
    mockUseStyfiApy.mockReturnValue({ data: 2500 });
    mockUseProtocol.mockReturnValue({
      globalData: {
        global: {
          maxBoostBps: "20000",
          veyfi: {
            tokens: [
              {
                symbol: "sdYFI",
                redemption: {
                  capacity: "100000000000000000000",
                },
              },
            ],
          },
        },
        styfi: {
          current: { aprBps: 1000 },
          projected: { aprBps: 1000 },
        },
        llyfi: [
          {
            symbol: "sdYFI",
            staked: "100000000000000000000",
            unstaking: "0",
            current: { aprBps: 8000 },
            projected: { aprBps: 8000 },
          },
        ],
      },
    });
    mockUseEpochClock.mockReturnValue({
      epochInfo: { currentEpoch: 1, epochEnd: 0, nextEpochStart: 0 },
    });
  });

  it("uses account boostEpochs and current epoch for migrated lock display", () => {
    render(<MigrationCard />);

    // 1 + (95 - 1) / 104 = 1.9038...
    expect(screen.getByText("1.90x Boost")).toBeInTheDocument();
  });

  it("derives the migrated base APR from locker effective APR inputs instead of styfi APR", () => {
    render(<MigrationCard />);

    expect(screen.getAllByText("76.15%")).toHaveLength(2);
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("floors at 1.00x after boost epochs are exhausted", () => {
    mockUseEpochClock.mockReturnValue({
      epochInfo: { currentEpoch: 120, epochEnd: 0, nextEpochStart: 0 },
    });

    render(<MigrationCard />);

    expect(screen.getByText("1.00x Boost")).toBeInTheDocument();
  });
});
