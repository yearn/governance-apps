import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import {
  YbcPageContent,
  YbcPageErrorState,
  YbcPageLoadingState,
} from "@/app/ybc/YbcPageClient";
import { ybcCopy } from "@/app/ybc/messages";
import {
  createMockYbcClient,
  type YbcPrototypeScenarioId,
} from "@/lib/clients/ybc";

async function getScenarioData(scenarioId: YbcPrototypeScenarioId) {
  const client = createMockYbcClient({ latencyMs: 0 });
  const state = await client.getPageState({ scenarioId });
  return state.data;
}

describe("YbcPageClient", () => {
  it("renders the loading state while the mock overview is resolving", () => {
    render(<YbcPageLoadingState />);

    expect(screen.getByText(ybcCopy.page.loadingTitle)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.page.loadingBody)).toBeInTheDocument();
  });

  it("renders an explicit error state when the mock state cannot be loaded", () => {
    render(<YbcPageErrorState errorMessage="fixture load failed" />);

    expect(screen.getByText(ybcCopy.page.errorTitle)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.page.errorBody)).toBeInTheDocument();
    expect(screen.getByText("fixture load failed")).toBeInTheDocument();
  });

  it("renders the observer overview with separate internal and delegated influence", async () => {
    const data = await getScenarioData("observer");

    render(<YbcPageContent data={data} />);

    expect(
      screen.getByRole("heading", {
        name: ybcCopy.app.displayLabel,
        level: 1,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.app.routeKey)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.hero.summary.internalLabel)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.hero.summary.delegatedLabel)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.hero.summary.totalLabel)).toBeInTheDocument();
    expect(screen.getAllByText(ybcCopy.hero.perspective.observerTitle).length).toBeGreaterThan(
      0
    );
    expect(screen.queryByText(ybcCopy.members.states.you)).not.toBeInTheDocument();

    const sectionNav = screen.getByRole("navigation", { name: "YBC sections" });
    for (const section of ybcCopy.sections) {
      expect(within(sectionNav).getByRole("link", { name: section.label }))
        .toHaveAttribute("href", `#${section.id}`);
    }
    for (const section of ybcCopy.sections.slice(2)) {
      expect(
        screen.getByRole("heading", { name: section.title, level: 2 })
      ).toBeInTheDocument();
    }

    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("columnheader", {
        name: ybcCopy.members.columns.rawStaked,
      })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", {
        name: ybcCopy.members.columns.effectiveWeight,
      })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", {
        name: ybcCopy.members.columns.targetWeight,
      })
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", {
        name: ybcCopy.members.columns.maturity,
      })
    ).toBeInTheDocument();
    expect(screen.getAllByText("5,650 weight").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("100,000 weight").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the member perspective with distinct current and target weight", async () => {
    const data = await getScenarioData("member-ramping");

    render(<YbcPageContent data={data} />);

    expect(screen.getAllByText(ybcCopy.hero.perspective.memberTitle).length).toBeGreaterThan(
      0
    );
    expect(screen.getByText("250 weight")).toBeInTheDocument();
    expect(screen.getAllByText("500 weight").length).toBeGreaterThan(0);
    expect(screen.getByText(ybcCopy.members.states.you)).toBeInTheDocument();
    expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
  });

  it("renders the empty members state when no roster data is seeded", async () => {
    const data = await getScenarioData("empty");

    render(<YbcPageContent data={data} />);

    expect(screen.getByText(ybcCopy.members.states.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(ybcCopy.members.states.emptyBody)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
