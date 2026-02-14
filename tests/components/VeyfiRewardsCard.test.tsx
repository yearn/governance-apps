import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VeyfiRewardsCard } from "@/app/veyfi/components/VeyfiRewardsCard";

describe("VeyfiRewardsCard", () => {
  it("links to the canonical stYFI domain on yearn.fi hosts", () => {
    render(<VeyfiRewardsCard hostname="veyfi.yearn.fi" />);

    const ctaLink = screen
      .getByRole("button", { name: /Go to stYFI Dashboard/i })
      .closest("a");

    expect(ctaLink).toHaveAttribute("href", "https://styfi.yearn.fi");
  });

  it("keeps a path-scoped stYFI link on shared dev hosts", () => {
    render(<VeyfiRewardsCard hostname="app.dao-ops.com" />);

    const ctaLink = screen
      .getByRole("button", { name: /Go to stYFI Dashboard/i })
      .closest("a");

    expect(ctaLink).toHaveAttribute("href", "/styfi");
  });

  it("links to the stYFI beta domain on preprod hosts", () => {
    render(<VeyfiRewardsCard hostname="veyfi-beta.dao-ops.com" />);

    const ctaLink = screen
      .getByRole("button", { name: /Go to stYFI Dashboard/i })
      .closest("a");

    expect(ctaLink).toHaveAttribute("href", "https://styfi-beta.dao-ops.com");
  });
});
