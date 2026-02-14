import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { LlyfiStakeTab } from "@/app/veyfi/components/tabs/LlyfiStakeTab";
import { renderWithProviders } from "@/tests/test-utils";

const {
  mockUseIdentity,
  mockUseLlyfiStake,
  mockUseTokenApprove,
  mockUseTokenAllowance,
} = vi.hoisted(() => ({
  mockUseIdentity: vi.fn(),
  mockUseLlyfiStake: vi.fn(),
  mockUseTokenApprove: vi.fn(),
  mockUseTokenAllowance: vi.fn(),
}));

vi.mock("@/state/identity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state/identity")>();
  return {
    ...actual,
    useIdentity: () => mockUseIdentity(),
  };
});

vi.mock("@/lib/hooks/useVeyfi", () => ({
  useLlyfiStake: () => mockUseLlyfiStake(),
  veyfiKeys: {
    account: (address: string | undefined) => ["protocol", "veyfi", address],
  },
}));

vi.mock("@/lib/hooks/useTokenApprove", () => ({
  useTokenApprove: () => mockUseTokenApprove(),
}));

vi.mock("@/lib/hooks/useTokenAllowance", () => ({
  useTokenAllowance: () => mockUseTokenAllowance(),
}));

const ONE = 10n ** 18n;

const TOKEN = {
  symbol: "sdYFI",
  name: "StakeDAO",
  address: "0x1111111111111111111111111111111111111111",
  depositorAddress: "0x2222222222222222222222222222222222222222",
  walletBalance: 5n * ONE,
  stakedBalance: 0n,
  cooldownBalance: 0n,
  withdrawable: 0n,
  cooldown: null,
  allowance: 0n,
  redemptionAllowance: 0n,
  lockedYfi: 0n,
  veyfiBoost: 1.1,
  totalSupply: 0n,
  stakedAssets: 0n,
  depositorTotalSupply: 0n,
  depositorCapacity: 0n,
  exchangeRate: ONE,
  redemption: {
    capacity: 0n,
    used: 0n,
    inventory: 0n,
    fee: 0n,
  },
} as const;

describe("LLYFI stake blacklist behavior", () => {
  beforeEach(() => {
    mockUseIdentity.mockReturnValue({
      canTransact: true,
      blacklistStatus: "blocked",
      address: "0x3333333333333333333333333333333333333333",
    });
    mockUseLlyfiStake.mockReturnValue({
      write: vi.fn(),
      state: { status: "idle" },
    });
    mockUseTokenApprove.mockReturnValue({
      write: vi.fn(),
      isLoading: false,
    });
    mockUseTokenAllowance.mockReturnValue({
      data: 10n * ONE,
      refetch: vi.fn().mockResolvedValue({ data: 10n * ONE }),
    });
  });

  it("disables stake action when blacklist status is blocked", () => {
    renderWithProviders(<LlyfiStakeTab token={TOKEN} />);

    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "1" },
    });

    expect(screen.getByRole("button", { name: /Stake sdYFI/i })).toBeDisabled();
    expect(
      screen.getByText("This address is restricted from making token transfers.")
    ).toBeInTheDocument();
  });

  it("keeps stake action enabled when blacklist status is unknown", () => {
    mockUseIdentity.mockReturnValue({
      canTransact: true,
      blacklistStatus: "unknown",
      address: "0x3333333333333333333333333333333333333333",
    });

    renderWithProviders(<LlyfiStakeTab token={TOKEN} />);

    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "1" },
    });

    expect(screen.getByRole("button", { name: /Stake sdYFI/i })).toBeEnabled();
    expect(screen.queryByText(/Blacklist status/i)).not.toBeInTheDocument();
  });
});
