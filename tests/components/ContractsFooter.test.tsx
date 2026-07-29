import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContractsFooter } from "@/components/domain/ContractsFooter";

describe("ContractsFooter", () => {
  it("renders contract labels and etherscan links", () => {
    const firstAddress = "0x1111111111111111111111111111111111111111";
    const secondAddress = "0x2222222222222222222222222222222222222222";
    render(
      <ContractsFooter
        contracts={[
          {
            label: "Legacy veYFI",
            address: firstAddress,
          },
          {
            label: "Global Redemption Facility",
            address: secondAddress,
          },
        ]}
      />,
    );

    expect(screen.getByText("Contracts")).toBeInTheDocument();
    expect(screen.getByText("Legacy veYFI")).toBeInTheDocument();
    expect(screen.getByText("Global Redemption Facility")).toBeInTheDocument();

    expect(
      screen.getByRole("link", {
        name: `View Ethereum address ${firstAddress} on Etherscan`,
      }),
    ).toHaveAttribute(
      "href",
      `https://etherscan.io/address/${firstAddress}`,
    );
    expect(
      screen.getByRole("link", {
        name: `View Ethereum address ${secondAddress} on Etherscan`,
      }),
    ).toHaveAttribute(
      "href",
      `https://etherscan.io/address/${secondAddress}`,
    );

  });
});
