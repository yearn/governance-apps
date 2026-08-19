import { test, expect } from "@playwright/test";
import {
  waitForTestBridge,
  resetBridge,
  seedExternalPortfolio,
  setBalance,
} from "../utils";

test("shows external portfolio and opens veYFI in a new tab", async ({
  page,
  context,
}) => {
  await page.goto("/styfi");
  await waitForTestBridge(page);
  await resetBridge(page);
  await seedExternalPortfolio(page);
  await setBalance(page, "stYFI", "25");

  await expect(
    page.getByText(/other governance positions/i)
  ).toBeVisible();

  const veyfiRow = page
    .getByTestId("external-position-row")
    .filter({ hasText: /veyfi/i });
  await expect(veyfiRow).toBeVisible();

  const [newPage] = await Promise.all([
    context.waitForEvent("page"),
    veyfiRow.click(),
  ]);
  await newPage.waitForLoadState();
  await expect(newPage).toHaveURL(/\/veyfi(?:\/)?$/);
});
