import { expect, test } from "@playwright/test";

test("treasury tabs support keyboard navigation and closed history stays compact", async ({ page }) => {
  await page.goto("/treasury");
  const portfolio = page.getByRole("tab", { name: "Portfolio", exact: true });
  const loans = page.getByRole("tab", { name: "Loans & allocations", exact: true });
  await portfolio.focus();
  await page.keyboard.press("ArrowRight");
  await expect(loans).toBeFocused();
  await expect(loans).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Provisional terms", { exact: true })).toBeVisible();
  const history = page.locator("details").filter({ has: page.locator("summary").filter({ hasText: "Closed positions" }) });
  await expect(history).not.toHaveAttribute("open", "");
  await history.locator("summary").click();
  await expect(history).toHaveAttribute("open", "");
  await expect(history.getByText("Written off", { exact: true })).toBeVisible();
});

test("treasury preserves unknown values and explicit operational states", async ({ page }) => {
  await page.goto("/treasury?scenario=partial");
  await expect(page.getByTestId("treasury-portfolio-value")).toHaveText("Unavailable");
  await expect(page.getByText("6 holdings without a current price.")).toBeVisible();
  await page.goto("/treasury?scenario=stale");
  await expect(page.getByText("Snapshot is out of date", { exact: true })).toBeVisible();
  await page.goto("/treasury?scenario=empty");
  await expect(page.getByText("No holdings in this snapshot", { exact: true })).toBeVisible();
  await page.goto("/treasury?scenario=error");
  await expect(page.locator("main").getByRole("alert")).toContainText("Treasury snapshot unavailable");
  await expect(page.getByTestId("treasury-portfolio-value")).toHaveCount(0);
  await page.goto("/treasury?scenario=loading");
  await expect(page.getByText("Loading treasury snapshot…", { exact: true })).toBeVisible();
});

test("treasury stays readable on mobile with enlarged text and dark theme", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/treasury");
  await expect(page.getByTestId("treasury-portfolio-value")).toBeVisible();
  await page.evaluate(() => { document.documentElement.classList.add("dark"); document.documentElement.setAttribute("data-theme", "soft-dark"); });
  await page.addStyleTag({ content: "html { font-size: 125%; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("tab", { name: "Loans & allocations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Aerodrome liquidity loan", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const selector of ['button[role="tab"]', 'select', 'main summary']) {
    const targets = page.locator(selector);
    for (let i = 0; i < await targets.count(); i++) {
      const box = await targets.nth(i).boundingBox();
      if (box) expect(box.height).toBeGreaterThanOrEqual(40);
    }
  }
});

test("treasury wraps maximum-length token metadata and sources at 320 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/treasury?scenario=long-metadata");
  await expect(page.getByRole("heading", { name: "W".repeat(40), exact: true })).toBeVisible();
  await page.locator("summary").filter({ hasText: "Position details — " + "W".repeat(40) }).click();
  const other = page.getByTestId("treasury-other-holdings");
  await other.locator("summary").first().click();
  await other.locator("summary").filter({ hasText: "Position details" }).click();
  await expect(page.getByRole("heading", { name: "X".repeat(40), exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.addStyleTag({ content: "html { font-size: 125%; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
