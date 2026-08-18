import { expect, test, type Locator, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1_024 },
  { name: "desktop", width: 1_280, height: 900 },
  { name: "short desktop", width: 1_280, height: 600 },
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto("/dao");
  await page.evaluate(async () => {
    if (!window.__TEST__) throw new Error("Test bridge is unavailable.");
    await window.__TEST__.reset();
  });
});

test("scans and filters the proposal board at every review viewport", async ({
  page,
}) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto("/dao");

    await expect(
      page.getByRole("heading", { name: "Proposal board", level: 2 })
    ).toBeVisible();
    await expect(page.getByText("22 proposals are available.")).toBeVisible();
    await expect(page.getByText("Voting ends in 5 days").first()).toBeVisible();
    await expect(
      page.getByText("of votes cast · 55% approval threshold").first()
    ).toBeVisible();

    for (const filter of ["Active", "Upcoming", "Closed"]) {
      const tab = page.getByRole("tab", { name: new RegExp(filter) });
      await expectMinimumHitArea(tab);
    }

    await page.getByRole("tab", { name: /Upcoming/ }).click();
    await expect(
      page.getByRole("link", {
        name: /Adopt the contributor budget policy/,
      })
    ).toBeVisible();
    await page.getByRole("tab", { name: /Closed/ }).click();
    await expect(
      page.getByRole("link", { name: /Approve the contributor charter/ })
    ).toBeVisible();
    await expect(page.getByText("No executable actions").first()).toBeVisible();
    await expectNoDocumentOverflow(page, viewport.name);
  }
});

test("supports keyboard filters and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dao");

  const active = page.getByRole("tab", { name: /Active/ });
  await active.focus();
  await page.keyboard.press("ArrowRight");
  const upcoming = page.getByRole("tab", { name: /Upcoming/ });
  await expect(upcoming).toBeFocused();
  await expect(upcoming).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("tabpanel", { name: /Upcoming/ })
  ).toBeVisible();
  await expect(upcoming).toHaveCSS("transition-duration", "0s");
});

test("contains proposal analysis and technical values at every review viewport", async ({
  page,
}) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.goto("/dao/proposals/17");

    const immutableHeading = page.getByRole("heading", {
      name: "Immutable proposal content",
    });
    const resultsHeading = page.getByRole("heading", { name: "Vote results" });
    await expect(immutableHeading).toBeVisible();
    await expect(resultsHeading).toBeVisible();
    await expect(
      page.getByText("Partially decoded · simulation succeeded")
    ).toBeVisible();
    await expect(page.getByText("Unknown call")).toBeVisible();
    await expect(
      page.getByText("No verified ABI source", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Reference block", { exact: true })).toBeVisible();

    const technicalSummary = page.getByText("Technical details", {
      exact: true,
    });
    await technicalSummary.click();
    await expect(
      page.getByText("Proposal identity", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Event script", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Feed snapshot block", { exact: true }),
    ).toBeVisible();
    await expectMinimumHitArea(
      page.getByRole("button", { name: "Copy script hash" })
    );

    const immutableBox = await immutableHeading.boundingBox();
    const resultsBox = await resultsHeading.boundingBox();
    expect(immutableBox).not.toBeNull();
    expect(resultsBox).not.toBeNull();
    if (viewport.width < 1_024) {
      expect(resultsBox!.y).toBeLessThan(immutableBox!.y);
    } else {
      expect(resultsBox!.x).toBeGreaterThan(immutableBox!.x);
    }
    if (viewport.name === "short desktop") {
      await expect(resultsHeading.locator("xpath=ancestor::aside")).toHaveCSS(
        "position",
        "static"
      );
    }
    await expectNoDocumentOverflow(page, viewport.name);
  }
});

test("renders every terminal fixture with explicit status and vote rule copy", async ({
  page,
}) => {
  const terminalFixtures = [
    { id: 4, status: "Approved" },
    { id: 6, status: "Executed" },
    { id: 7, status: "Rejected" },
    { id: 8, status: "Rejected" },
    { id: 9, status: "Expired" },
    { id: 10, status: "Retracted" },
    { id: 11, status: "Flagged" },
    { id: 12, status: "Vetoed" },
    { id: 13, status: "Vetoed" },
  ];

  await page.setViewportSize({ width: 390, height: 844 });
  for (const fixture of terminalFixtures) {
    await page.goto(`/dao/proposals/${fixture.id}`);
    await expect(page.getByText(fixture.status, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/of votes cast · \d/)).toBeVisible();
    await page.getByText("Proposal rules", { exact: true }).click();
    await expect(page.getByText("No minimum turnout is required.")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Lifecycle" })
    ).toBeVisible();
    await expectNoDocumentOverflow(page, `terminal proposal ${fixture.id}`);
  }

  await page.goto("/dao/proposals/4");
  await expect(page.getByText("Approved", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("No executable actions").first()).toBeVisible();
});

test("keeps onchain records and trust failures explicit", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/dao/proposals/14");
  await expect(
    page.getByText("Immutable content could not be retrieved").first()
  ).toBeVisible();
  await expect(page.getByText(/onchain proposal remains visible/).first()).toBeVisible();
  await page.getByText("Technical details", { exact: true }).click();
  await expect(page.getByText("Voting contract")).toBeVisible();
  await expect(page.getByText("Raw contract status")).toBeVisible();

  await page.goto("/dao/proposals/15");
  await expect(
    page.getByText("Immutable content did not pass validation").first()
  ).toBeVisible();
  await expect(page.getByText(/yearn\.dao\.proposal\.v1/).first()).toBeVisible();

  await page.goto("/dao/proposals/16");
  await expect(page.getByText("Analysis pending", { exact: true })).toBeVisible();

  await page.goto("/dao/proposals/18");
  await expect(page.getByText("Simulation failed").first()).toBeVisible();

  await page.goto("/dao/proposals/19");
  await expect(
    page.getByRole("alert").filter({
      hasText: "Event script does not match the stored script hash",
    })
  ).toBeVisible();

  await page.goto("/dao/proposals/20");
  await expect(
    page.getByText(/not a verified Proposals-category topic/)
  ).toBeVisible();
  await expectNoDocumentOverflow(page, "trust failure fixtures");
});

async function expectNoDocumentOverflow(page: Page, context: string) {
  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(
    widths.scrollWidth,
    `${context} should contain long values inside the viewport`
  ).toBeLessThanOrEqual(widths.clientWidth);
}

async function expectMinimumHitArea(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(40);
  expect(box!.height).toBeGreaterThanOrEqual(40);
}
