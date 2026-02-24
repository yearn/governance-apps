import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContractLink } from "@/components/ui/ContractLink";

describe("ContractLink", () => {
  it("renders a truncated address that links to etherscan", () => {
    const address = "0x1234567890123456789012345678901234567890";
    render(<ContractLink address={address} />);

    const link = screen.getByRole("link", { name: "0x1234...7890" });
    expect(link).toHaveAttribute(
      "href",
      "https://etherscan.io/address/0x1234567890123456789012345678901234567890",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
