import { expect, test } from "@playwright/test";

test("renders the YBC overview and members prototype", async ({ page }) => {
  await page.goto("/ybc");

  await expect(
    page.getByRole("heading", { name: "Yearn Builder's Collective", level: 1 })
  ).toBeVisible();
  await expect(page.getByText("/ybc")).toBeVisible();
  await expect(page.getByText("Production gated")).toBeVisible();
  await expect(page.getByText("Internal influence", { exact: true })).toBeVisible();
  await expect(page.getByText("Delegated influence", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Observer view", level: 2 })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Raw staked" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Effective weight" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Target weight" })).toBeVisible();
});
