import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContractsFooter } from "@/components/domain/ContractsFooter";

describe("ContractsFooter", () => {
  it("renders contract labels and etherscan links", () => {
    render(
      <ContractsFooter
        contracts={[
          {
            label: "Legacy veYFI",
            address: "0x1111111111111111111111111111111111111111",
          },
          {
            label: "Global Redemption Facility",
            address: "0x2222222222222222222222222222222222222222",
          },
        ]}
      />,
    );

    expect(screen.getByText("Contracts")).toBeInTheDocument();
    expect(screen.getByText("Legacy veYFI")).toBeInTheDocument();
    expect(screen.getByText("Global Redemption Facility")).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "0x1111...1111" }),
    ).toHaveAttribute(
      "href",
      "https://etherscan.io/address/0x1111111111111111111111111111111111111111",
    );
    expect(
      screen.getByRole("link", { name: "0x2222...2222" }),
    ).toHaveAttribute(
      "href",
      "https://etherscan.io/address/0x2222222222222222222222222222222222222222",
    );
  });
});
