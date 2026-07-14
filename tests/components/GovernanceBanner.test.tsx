import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GovernanceBanner } from "@/app/styfi/components/GovernanceBanner";
import { STYFI_SNAPSHOT_SPACE_URL } from "@/lib/clients/styfi/snapshot";

const FIRST_PROPOSAL = {
  id: "0xa348d353b66f46c6957a938a42fbf860eaffc855cd9163d8042780f65ea72612",
  title: "YIP:91 yTranche",
  end: 1_784_402_339,
  state: "active" as const,
};

describe("GovernanceBanner", () => {
  it("stays absent when there are no active proposals", () => {
    const { container } = render(<GovernanceBanner proposals={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("links a single active proposal directly", () => {
    render(<GovernanceBanner proposals={[FIRST_PROPOSAL]} />);

    expect(screen.getByText("Voting open")).toBeInTheDocument();
    expect(screen.getByText("YIP:91 yTranche")).toBeInTheDocument();
    expect(screen.getByText(/Vote closes/)).toBeInTheDocument();
    expect(screen.getByText(/Jul 18, 2026/)).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /review & vote/i });
    expect(link).toHaveAttribute(
      "href",
      `${STYFI_SNAPSHOT_SPACE_URL}proposal/${FIRST_PROPOSAL.id}`,
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("links multiple active proposals to the space", () => {
    render(
      <GovernanceBanner
        proposals={[
          FIRST_PROPOSAL,
          {
            id: "0xsecond",
            title: "Second proposal",
            end: FIRST_PROPOSAL.end + 1_000,
            state: "active",
          },
        ]}
      />,
    );

    expect(
      screen.getByText("2 governance proposals are open for voting"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Next vote closes/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /review & vote/i })).toHaveAttribute(
      "href",
      STYFI_SNAPSHOT_SPACE_URL,
    );
  });
});
