import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/tests/test-utils";
import { GLOBAL_WORLD_STATE } from "@/lib/mocks/world-state";
import { E2E_MOCK_ADDRESS } from "@/lib/test/constants";
import { RewardsCard } from "@/app/styfi/components/cards/RewardsCard";
import { StakeTab } from "@/app/styfi/components/cards/stake/StakeTab";

describe("Blacklist integration", () => {
  it("renders banner and disables staking", async () => {
    GLOBAL_WORLD_STATE.setBlacklisted(E2E_MOCK_ADDRESS, true);

    renderWithProviders(
      <>
        <RewardsCard />
        <StakeTab asset="stYFI" />
      </>
    );

    await waitFor(() => {
      expect(screen.getByText(/Blacklisted/i)).toBeInTheDocument();
    });

    const stakeButton = screen.getByRole("button", { name: /Stake YFI/i });
    expect(stakeButton).toBeDisabled();
  });
});
