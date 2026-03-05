import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LlyfiTokenRow } from "@/app/veyfi/components/LlyfiTokenRow";
import type { LlyfiTokenState } from "@/lib/clients/veyfi";

const { mockUseStyfiApy, mockUseProtocol, mockUseIdentity, mockUseEpochClock } =
  vi.hoisted(() => ({
    mockUseStyfiApy: vi.fn(),
    mockUseProtocol: vi.fn(),
    mockUseIdentity: vi.fn(),
    mockUseEpochClock: vi.fn(),
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

vi.mock("@/state/identity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state/identity")>();
  return {
    ...actual,
    useIdentity: () => mockUseIdentity(),
  };
});

vi.mock("@/lib/hooks/useEpochClock", () => ({
  useEpochClock: () => mockUseEpochClock(),
}));

vi.mock("@/app/veyfi/components/LlyfiRowCockpit", () => ({
  LlyfiRowCockpit: () => <div data-testid="row-cockpit" />,
}));

const ONE = 10n ** 18n;

const TOKEN: LlyfiTokenState = {
  symbol: "sdYFI",
  name: "StakeDAO",
  address: "0x1111111111111111111111111111111111111111",
  depositorAddress: "0x2222222222222222222222222222222222222222",
  walletBalance: 0n,
  stakedBalance: 0n,
  cooldownBalance: 0n,
  withdrawable: 0n,
  cooldown: null,
  allowance: 0n,
  redemptionAllowance: 0n,
  lockedYfi: 0n,
  veyfiBoost: 1.5,
  totalSupply: 0n,
  stakedAssets: 0n,
  depositorTotalSupply: 50n * ONE,
  depositorCapacity: 100n * ONE,
  exchangeRate: ONE,
  redemption: {
    enabled: true,
    capacity: 100n * ONE,
    used: 0n,
    inventory: 0n,
    fee: 0n,
  },
};

function buildGlobalData({
  staked = "100000000000000000000",
  aprBps = null as number | null,
  baseAprBps = 4000 as number | null,
} = {}) {
  return {
    global: {
      maxBoostBps: "20000",
      veyfi: {
        tokens: [
          {
            symbol: "sdYFI",
            redemption: {
              enabled: true,
              capacity: "100000000000000000000",
            },
          },
        ],
      },
    },
    styfi: {
      current: { aprBps: baseAprBps },
      projected: { aprBps: baseAprBps },
    },
    llyfi: [
      {
        symbol: "sdYFI",
        staked,
        unstaking: "0",
        current: { aprBps },
        projected: { aprBps },
      },
    ],
  };
}

describe("LlyfiTokenRow APR calculations", () => {
  beforeEach(() => {
    mockUseStyfiApy.mockReturnValue({ data: 4000n });
    mockUseIdentity.mockReturnValue({ canTransact: true, isWrongNetwork: false });
    mockUseEpochClock.mockReturnValue({
      epochInfo: { currentEpoch: 1, epochEnd: 0, nextEpochStart: 0 },
    });
  });

  it("uses wallet-specific token boost over global stats max boost", () => {
    mockUseProtocol.mockReturnValue({
      globalData: buildGlobalData(),
    });

    render(<LlyfiTokenRow token={TOKEN} maxBoostMultiplier={2} />);

    expect(screen.getByText("60% Boosted Base")).toBeInTheDocument();
  });

  it("uses S3 staked ratio for effective APR when available", () => {
    mockUseProtocol.mockReturnValue({
      globalData: buildGlobalData({
        // S3 ratio = 100%; token live ratio = 50%.
        staked: "100000000000000000000",
      }),
    });

    const { container } = render(
      <LlyfiTokenRow token={{ ...TOKEN, veyfiBoost: 2 }} maxBoostMultiplier={2} />
    );

    const aprNode = container.querySelector(".text-disco-600.text-lg.leading-tight");
    expect(aprNode?.textContent).toBe("80%");
  });

  it("derives effective APR from tooltip components instead of stale s3 apr", () => {
    mockUseProtocol.mockReturnValue({
      globalData: buildGlobalData({
        aprBps: 12345,
      }),
    });

    const { container } = render(
      <LlyfiTokenRow token={{ ...TOKEN, veyfiBoost: 2 }} maxBoostMultiplier={2} />
    );

    const aprNode = container.querySelector(".text-disco-600.text-lg.leading-tight");
    expect(aprNode?.textContent).toBe("80%");
  });

  it("treats derived zero APR as valid and does not fall back to stale s3 effective APR", () => {
    mockUseProtocol.mockReturnValue({
      globalData: buildGlobalData({
        aprBps: 12345,
        baseAprBps: 0,
      }),
    });

    const { container } = render(
      <LlyfiTokenRow token={{ ...TOKEN, veyfiBoost: 2 }} maxBoostMultiplier={2} />
    );

    const aprNode = container.querySelector(".text-disco-600.text-lg.leading-tight");
    expect(aprNode?.textContent).toBe("0%");
  });

  it("falls back to s3 effective APR when base APR sources are unavailable", () => {
    mockUseStyfiApy.mockReturnValue({ data: undefined });
    mockUseProtocol.mockReturnValue({
      globalData: buildGlobalData({
        aprBps: 12345,
        baseAprBps: null,
      }),
    });

    const { container } = render(
      <LlyfiTokenRow token={{ ...TOKEN, veyfiBoost: 2 }} maxBoostMultiplier={2} />
    );

    const aprNode = container.querySelector(".text-disco-600.text-lg.leading-tight");
    expect(aprNode?.textContent).toBe("123%");
  });
});
