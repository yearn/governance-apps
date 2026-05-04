import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineStepper } from "@/components/ui/TimelineStepper";

describe("TimelineStepper", () => {
  it("renders accessible proposal phase steps", () => {
    render(
      <TimelineStepper
        aria-label="Proposal phases"
        steps={[
          {
            id: "discussion",
            label: "Discussion",
            description: "Open for review.",
            status: "complete",
          },
          {
            id: "voting",
            label: "Voting",
            description: "Votes are open.",
            status: "current",
          },
        ]}
      />
    );

    expect(screen.getByRole("list", { name: "Proposal phases" })).toBeInTheDocument();
    expect(screen.getByText("Discussion")).toBeInTheDocument();
    expect(screen.getByText("Voting").closest("li")).toHaveAttribute(
      "aria-current",
      "step"
    );
    expect(screen.getByText("Current")).toBeInTheDocument();
  });
});
