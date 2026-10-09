import { expect, test } from "@playwright/test";

test("treasury renders a read-only portfolio and allocation list", async ({ page, request }) => {
  const head = await request.head("/treasury");
  expect(head.status()).toBe(200);
  await page.goto("/treasury");
  await expect(page.getByRole("heading", { name: "Treasury", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText("Example snapshot", { exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Portfolio", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("treasury-portfolio-value")).toHaveText("$8,974,236");
  await page.getByRole("tab", { name: "Loans & allocations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Resupply loan", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stonk USDG allocation", exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/\b(C01|C02|C06|C08|C09|C14|B01|B02|B03|R05|T03|T05)\b/);
});

test("treasury filters holdings and keeps valuation scope explicit", async ({ page }) => {
  await page.goto("/treasury");
  await expect(page.getByTestId("treasury-portfolio-value")).toBeVisible();
  await page.getByRole("button", { name: "Exclude YFI" }).click();
  await expect(page.getByTestId("treasury-portfolio-value")).toHaveText("$2,974,236");
  await page.getByRole("combobox", { name: "Accountable team" }).selectOption("vaults");
  await expect(page.getByRole("heading", { name: "yvUSD", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "YFI", exact: true })).toHaveCount(0);
  await expect(page.getByText("All treasury addresses. Filters below change the list only.")).toBeVisible();
  await page.getByRole("tab", { name: "Loans & allocations", exact: true }).click();
  await expect(page.getByText("No allocations match this team.")).toBeVisible();
  await page.getByRole("combobox", { name: "Accountable team" }).selectOption("dao-ops");
  await expect(page.getByRole("heading", { name: "YBC strategic allocation", exact: true })).toBeVisible();
});
