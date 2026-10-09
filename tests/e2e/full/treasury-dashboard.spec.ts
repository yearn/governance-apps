import { expect, test } from "@playwright/test";

test("treasury tabs and compact disclosures support keyboard navigation", async ({ page }) => {
  await page.goto("/treasury");
  await expect(page.getByText("Closed positions", { exact: true })).toHaveCount(0);
  const portfolio = page.getByRole("tab", { name: "Portfolio", exact: true });
  const loans = page.getByRole("tab", { name: "Loans & allocations", exact: true });
  await portfolio.focus();
  await page.keyboard.press("ArrowRight");
  await expect(loans).toBeFocused();
  await expect(loans).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("Snapshot details", { exact: true })).toHaveCount(0);
  const inventory = page.getByTestId("treasury-allocation-ycrv-otc-inventory");
  await expect(inventory.getByText("Not reconciled", { exact: true })).toBeVisible();
  await expect(inventory.getByText("Unsold inventory", { exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Funded", exact: true })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Current", exact: true })).toBeVisible();
  const aerodrome = page.getByTestId("treasury-allocation-aerodrome-liquidity-loan");
  await expect(aerodrome.getByRole("img", { name: "Not available" })).toHaveText("—");
  const position = aerodrome.getByRole("button");
  await position.focus();
  await page.keyboard.press("Enter");
  await expect(position).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("listitem", { name: "33 YFI", exact: true })).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText("Expected return");
  const history = page.locator("details").filter({ has: page.locator("summary").filter({ hasText: "Closed positions" }) });
  await expect(history).not.toHaveAttribute("open", "");
  await history.locator("summary").click();
  await expect(history).toHaveAttribute("open", "");
  await expect(history.getByText("Written off", { exact: true })).toBeVisible();
});

test("treasury preserves unknown values and explicit operational states", async ({ page }) => {
  await page.goto("/treasury?scenario=partial");
  await expect(page.getByTestId("treasury-portfolio-value").getByRole("img", { name: "Not available" })).toHaveText("—");
  await expect(page.getByText("6 unpriced holdings", { exact: true })).toBeVisible();
  const snapshot = page.locator("details").filter({ has: page.locator("summary").filter({ hasText: "Snapshot details" }) });
  await expect(snapshot).not.toHaveAttribute("open", "");
  await snapshot.locator("summary").click();
  await expect(page.getByText("6 holdings without a price.", { exact: true })).toBeVisible();
  await page.goto("/treasury?scenario=stale");
  await expect(page.getByText(/Snapshot is out of date/)).toBeVisible();
  await page.goto("/treasury?scenario=empty");
  await expect(page.getByText("No holdings in this snapshot", { exact: true })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.goto("/treasury?scenario=error");
  await expect(page.locator("main").getByRole("alert")).toContainText("Treasury snapshot unavailable");
  await expect(page.getByTestId("treasury-portfolio-value")).toHaveCount(0);
  await page.goto("/treasury?scenario=loading");
  await expect(page.getByText("Loading treasury snapshot…", { exact: true })).toBeVisible();
});

test("treasury stays readable on mobile with enlarged text and dark theme", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/treasury");
  await expect(page.getByTestId("treasury-portfolio-value")).toBeVisible();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const symbol of ["YFI", "yvUSD"]) {
      const row = page.getByRole("row").filter({ has: page.getByRole("button", { name: new RegExp("^Position details — " + symbol + " at ") }) });
      for (const index of [1, 2]) {
        const cell = row.getByRole("cell").nth(index);
        expect(await cell.evaluate((element) => {
          const style = getComputedStyle(element);
          const range = document.createRange();
          range.selectNodeContents(element);
          return style.whiteSpace === "nowrap" && range.getBoundingClientRect().width <= element.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) + 1;
        })).toBe(true);
      }
    }
    await page.screenshot({ path: testInfo.outputPath("treasury-mobile-" + width + "-portfolio.png"), fullPage: true });
  }
  await page.evaluate(() => { document.documentElement.classList.add("dark"); document.documentElement.setAttribute("data-theme", "soft-dark"); });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("tab", { name: "Loans & allocations", exact: true }).click();
  await expect(page.getByRole("button", { name: "Aerodrome liquidity loan Loan", exact: true })).toBeVisible();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    if (width === 390) await page.addStyleTag({ content: "html { font-size: 125%; }" });
    for (const id of ["resupply-loan", "sherlock-bounty-deposit", "lqty-delegated-stake"]) {
      const row = page.getByTestId("treasury-allocation-" + id);
      const values = row.locator("li > span:first-child > span:visible");
      for (let i = 0; i < await values.count(); i++) {
        expect(await values.nth(i).evaluate((element) => {
          const cell = element.closest("td")!;
          const style = getComputedStyle(cell);
          return getComputedStyle(element).whiteSpace === "nowrap" && element.getBoundingClientRect().width <= cell.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) + 1;
        })).toBe(true);
      }
    }
  }
  await page.getByTestId("treasury-allocation-stonk-usdg-allocation").getByRole("button").click();
  await expect(page.getByText("Not yet funded.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("treasury-mobile-dark-loans.png"), fullPage: true });
  for (const selector of ['button[role="tab"]', 'select', 'main summary', 'main a', 'main tbody button']) {
    const targets = page.locator(selector);
    for (let i = 0; i < await targets.count(); i++) {
      const box = await targets.nth(i).boundingBox();
      if (box) expect(box.height).toBeGreaterThanOrEqual(40);
    }
  }
});

test("treasury wraps maximum-length metadata and sources at 320 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/treasury?scenario=long-metadata");
  const longPosition = page.getByRole("button", { name: "Position details — " + "W".repeat(40) + " at ychad.eth" });
  await expect(longPosition).toBeVisible();
  await longPosition.click();
  const other = page.getByTestId("treasury-collapsed-ychad-other");
  await other.getByRole("button", { name: /Other unpriced assets/ }).click();
  const otherPosition = other.getByRole("button", { name: /Position details/ });
  await otherPosition.click();
  await expect(otherPosition).toBeVisible();
  const lookalikes = page.getByTestId("treasury-collapsed-ychad-lookalikes");
  await lookalikes.getByRole("button", { name: /Unverified lookalikes/ }).click();
  await lookalikes.getByRole("button", { name: /Position details/ }).click();
  await expect(lookalikes.getByRole("link", { name: "USDC issuer reference ↗" })).toHaveAttribute("href", "https://developers.circle.com/stablecoins/usdc-contract-addresses");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.addStyleTag({ content: "html { font-size: 125%; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
