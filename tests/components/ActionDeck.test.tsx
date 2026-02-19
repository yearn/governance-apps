import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActionDeck } from "@/app/yeth/components/ActionDeck";
import { yethCopy } from "@/app/yeth/messages";

describe("ActionDeck", () => {
  it("renders dynamic claim amount and aligned action cards", () => {
    render(
      <ActionDeck
        onExit={vi.fn()}
        onStay={vi.fn()}
        claimableEth="4.2500"
        exitPending={false}
        stayPending={false}
        disabled={false}
      />
    );

    expect(
      screen.getByRole("button", { name: "Claim 4.2500 ETH & Exit" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: yethCopy.actions.stay.cta })
    ).toBeInTheDocument();

    const headings = [
      screen.getByRole("heading", { name: "Claim & Exit" }),
      screen.getByRole("heading", { name: "Active Recovery (Advanced)" }),
    ];

    for (const heading of headings) {
      const card = heading.closest("article");
      expect(card).toHaveClass("h-full");
      expect(card).toHaveClass("flex");
      expect(card).toHaveClass("flex-col");
    }
  });
});
