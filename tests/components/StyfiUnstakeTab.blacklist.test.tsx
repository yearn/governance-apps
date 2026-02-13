import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { UnstakeTab } from "@/app/styfi/components/cards/stake/UnstakeTab";
import { renderWithProviders } from "@/tests/test-utils";

const {
  mockUseIdentity,
  mockUseStyfiAccount,
  mockUseStyfiStartCooldown,
  mockUseStyfiWithdraw,
} = vi.hoisted(() => ({
  mockUseIdentity: vi.fn(),
  mockUseStyfiAccount: vi.fn(),
  mockUseStyfiStartCooldown: vi.fn(),
  mockUseStyfiWithdraw: vi.fn(),
}));

vi.mock("@/state/identity", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/state/identity")>();
  return {
    ...actual,
    useIdentity: () => mockUseIdentity(),
  };
});

vi.mock("@/lib/hooks/useStyfi", () => ({
  useStyfiAccount: () => mockUseStyfiAccount(),
  useStyfiStartCooldown: () => mockUseStyfiStartCooldown(),
  useStyfiWithdraw: () => mockUseStyfiWithdraw(),
}));

const ONE = 10n ** 18n;

function createAccountState(overrides?: Partial<Record<string, unknown>>) {
  return {
    styfiActive: 10n * ONE,
    styfiInCooldown: 0n,
    styfiWithdrawable: 0n,
    styfiCooldown: null,
    blacklistStatus: "blocked",
    styfiX: {
      sharesActive: 0n,
      sharesInCooldown: 0n,
      assetsActive: 0n,
      assetsInCooldown: 0n,
      assetsUnlocked: 0n,
      assetsWithdrawable: 0n,
      cooldown: null,
    },
    ...overrides,
  };
}

describe("stYFI UnstakeTab blacklist behavior", () => {
  beforeEach(() => {
    mockUseIdentity.mockReturnValue({
      canTransact: true,
    });
    mockUseStyfiStartCooldown.mockReturnValue({
      write: vi.fn(),
      state: { status: "idle" },
    });
    mockUseStyfiWithdraw.mockReturnValue({
      write: vi.fn(),
      state: { status: "idle" },
    });
  });

  it("allows withdraw when blacklist status is blocked", () => {
    mockUseStyfiAccount.mockReturnValue({
      data: createAccountState({
        styfiInCooldown: 2n * ONE,
        styfiWithdrawable: ONE,
      }),
      isLoading: false,
    });

    renderWithProviders(<UnstakeTab asset="stYFI" />);

    expect(screen.getByRole("button", { name: "Withdraw" })).toBeEnabled();
  });

  it("allows starting cooldown when blacklist status is blocked", () => {
    mockUseStyfiAccount.mockReturnValue({
      data: createAccountState({
        styfiActive: 5n * ONE,
        styfiInCooldown: 0n,
        styfiWithdrawable: 0n,
      }),
      isLoading: false,
    });

    renderWithProviders(<UnstakeTab asset="stYFI" />);

    fireEvent.change(screen.getByPlaceholderText("0.00"), {
      target: { value: "1" },
    });

    expect(
      screen.getByRole("button", { name: "Start new cooldown" })
    ).toBeEnabled();
  });
});
