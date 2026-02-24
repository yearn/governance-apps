import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ContractLink } from "@/components/ui/ContractLink";

describe("ContractLink", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

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

  it("copies the full address when pressing copy", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const address = "0x1234567890123456789012345678901234567890";
    render(<ContractLink address={address} />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Copy contract address" }),
      );
    });

    expect(writeText).toHaveBeenCalledWith(address);
  });
});
