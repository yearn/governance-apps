import { test, expect } from "@playwright/test";
import {
  waitForTestBridge,
  resetBridge,
  setScenario,
  setBalance,
} from "../utils";

test("disables redeem when caps are exhausted", async ({ page }) => {
  await page.goto("/veyfi");
  await waitForTestBridge(page);
  await resetBridge(page);
  await setScenario(page, "caps_exhausted");
  await setBalance(page, "sdYFI", "1");

  const rowToggle = page.getByRole("button", { name: /sdYFI/i }).first();
  await rowToggle.click();

  await page.getByRole("button", { name: /^Trade$/i }).click();

  const tradeInput = page.getByPlaceholder("0.00").first();
  await tradeInput.fill("1");

  await expect(page.getByText(/Exceeds capacity|Exceeds inventory/i)).toBeVisible();

  const sellButton = page.getByRole("button", { name: /Sell sdYFI/i });
  await expect(sellButton).toBeDisabled();
});
