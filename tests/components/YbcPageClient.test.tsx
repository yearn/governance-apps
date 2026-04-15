import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { YbcPageClient } from "@/app/ybc/YbcPageClient";
import { ybcCopy } from "@/app/ybc/messages";

describe("YbcPageClient", () => {
  it("renders the WP0 naming, route, rollout gate, and section shell", () => {
    render(<YbcPageClient />);

    expect(
      screen.getByRole("heading", {
        name: ybcCopy.app.displayLabel,
        level: 1,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.app.routeKey)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.page.productionGate)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.app.betaHost)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.app.productionHost)).toBeInTheDocument();

    const sectionNav = screen.getByRole("navigation", { name: "YBC sections" });
    for (const section of ybcCopy.sections) {
      expect(within(sectionNav).getByRole("link", { name: section.label }))
        .toHaveAttribute("href", `#${section.id}`);
      expect(
        screen.getAllByRole("heading", { name: section.title, level: 2 }).length
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps the overview section as the default landing state", () => {
    render(<YbcPageClient />);

    expect(
      screen.getAllByText(ybcCopy.page.defaultSection).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(ybcCopy.sections[0].body).length
    ).toBeGreaterThanOrEqual(1);
  });
});
