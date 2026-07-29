import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  YETH_MANUAL_RECOVERY_CLAIM_URL,
  type YethGlobalState,
} from "@/lib/clients/yeth";
import { TrustFooter } from "@/app/yeth/components/TrustFooter";

const mockGlobal: YethGlobalState = {
  asOf: 1_700_000_000,
  claimWindow: { closesAt: 1_710_000_000 },
  approvedYipUrl: "https://gov.yearn.fi/yip-1",
  manualLateClaimUrl: YETH_MANUAL_RECOVERY_CLAIM_URL,
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
    tvlEth: 2_134_200_000_000_000_000_000n,
    pps: 1_073_056_603_773_584_905n,
    totalShares: 1_989_000_000_000_000_000_000n,
    feeRecipient: "0x2222222222222222222222222222222222222222",
  },
  yieldSources: ["source one"],
  risks: ["smart-contract risk"],
};

describe("TrustFooter", () => {
  it("renders stronger summary affordance with chevron icon", () => {
    const { container } = render(<TrustFooter global={mockGlobal} />);

    expect(screen.getByText("View Contracts, Risks & Sources")).toBeInTheDocument();
    expect(screen.getByText("Claim Contract")).toBeInTheDocument();
    expect(screen.getAllByText("Recovery Vault").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Yield Vault").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("columnheader", { name: "Metric" })).toBeInTheDocument();

    const headerCells = screen
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent?.trim());
    expect(headerCells).toEqual(["Metric", "Yield Vault", "Recovery Vault"]);

    expect(screen.getByText("Total assets (ETH)")).toBeInTheDocument();
    expect(screen.getByText("Total shares")).toBeInTheDocument();
    expect(screen.getByText("PPS (ETH/share)")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: `View Ethereum address ${mockGlobal.contracts.claimContract} on Etherscan`,
      }),
    ).toHaveAttribute(
      "href",
      "https://etherscan.io/address/0x1111111111111111111111111111111111111111",
    );

    const contractsList = screen.getByText("Claim Contract").closest("ul");
    expect(contractsList).toHaveClass("w-full");
    const contractLabels = Array.from(
      contractsList?.querySelectorAll("li > span:first-child") ?? []
    ).map((node) => node.textContent?.trim());
    expect(contractLabels).toEqual([
      "Claim Contract",
      "Yield Vault",
      "Recovery Vault",
    ]);

    const chevron = container.querySelector("summary svg");
    expect(chevron).not.toBeNull();
    expect(chevron?.getAttribute("class")).toContain("group-open:rotate-180");
  });
});
