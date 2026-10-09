import { expect, test } from "@playwright/test";

test("treasury renders compact portfolio and allocation tables", async ({ page, request }, testInfo) => {
  const head = await request.head("/treasury");
  expect(head.status()).toBe(200);
  await page.goto("/treasury");
  await expect(page.getByRole("heading", { name: "Treasury", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText("Example data", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Portfolio", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("treasury-portfolio-value")).toHaveText("$8,974,236");
  await expect(page.getByRole("table")).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath("treasury-desktop-portfolio.png"), fullPage: true });
  await page.getByRole("tab", { name: "Loans & allocations", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resupply loan Loan", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Stonk USDG allocation Pending", exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/\b(C01|C02|C06|C08|C09|C14|B01|B02|B03|R05|T03|T05)\b/);
});

test("treasury filters holdings and keeps valuation scope explicit", async ({ page }) => {
  await page.goto("/treasury");
  await expect(page.getByTestId("treasury-portfolio-value")).toBeVisible();
  await page.getByRole("button", { name: "Exclude YFI" }).click();
  await expect(page.getByTestId("treasury-portfolio-value")).toHaveText("$2,974,236");
  await page.getByRole("combobox", { name: "Accountable team" }).selectOption("vaults");
  await expect(page.getByRole("button", { name: /Position details — yvUSD at/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Position details — YFI at/ })).toHaveCount(0);
  await expect(page.getByText("All treasury addresses", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Loans & allocations", exact: true }).click();
  await expect(page.getByText("No allocations match this team.")).toBeVisible();
  await page.getByRole("combobox", { name: "Accountable team" }).selectOption("dao-ops");
  await expect(page.getByRole("button", { name: "YBC strategic allocation Strategic", exact: true })).toBeVisible();
});
