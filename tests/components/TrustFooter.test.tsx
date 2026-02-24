import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { YethGlobalState } from "@/lib/clients/yeth";
import { TrustFooter } from "@/app/yeth/components/TrustFooter";

const mockGlobal: YethGlobalState = {
  asOf: 1_700_000_000,
  claimWindow: { opensAt: 1_700_000_000, closesAt: 1_710_000_000 },
  approvedYipUrl: "https://gov.yearn.fi/yip-1",
  manualLateClaimUrl: "https://gov.yearn.fi/late-claim",
  contracts: {
    claimContract: "0x1111111111111111111111111111111111111111",
    recoveryVault: "0x2222222222222222222222222222222222222222",
    yieldVault: "0x3333333333333333333333333333333333333333",
  },
  recoveryVault: {
    pps: 1_143_200_000_000_000_000n,
    totalAssetsEth: 0n,
    totalShares: 0n,
    hasStrategies: false,
  },
  yieldVault: {
    tvlEth: 0n,
    performanceFeeBps: 10_000,
    feeRecipient: "0x2222222222222222222222222222222222222222",
  },
  yieldSources: ["source one"],
  risks: ["smart-contract risk"],
  treasuryRecoveryVaultShares: 0n,
  treasuryYieldShareBps: 0,
};

describe("TrustFooter", () => {
  it("renders stronger summary affordance with chevron icon", () => {
    const { container } = render(<TrustFooter global={mockGlobal} />);

    expect(screen.getByText("View Contracts, Risks & Sources")).toBeInTheDocument();
    expect(screen.getByText("Claim Contract")).toBeInTheDocument();
    expect(screen.getByText("Recovery Vault")).toBeInTheDocument();
    expect(screen.getByText("Yield Vault")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /0x1111\.\.\.1111/i,
      })
    ).toHaveAttribute(
      "href",
      "https://etherscan.io/address/0x1111111111111111111111111111111111111111"
    );

    const chevron = container.querySelector("summary svg");
    expect(chevron).not.toBeNull();
    expect(chevron?.getAttribute("class")).toContain("group-open:rotate-180");
  });
});
