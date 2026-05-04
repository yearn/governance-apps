import { test, expect } from "@playwright/test";
import {
  waitForTestBridge,
  resetBridge,
  setScenario,
  setBalance,
  setAllowance,
  getState,
  E2E_ADDRESS,
} from "../utils";
import { SPENDER_REDEMPTION } from "../../../lib/constants";

test("migrate legacy veYFI and redeem sdYFI", async ({ page }) => {
  await page.goto("/veyfi");
  await waitForTestBridge(page);
  await resetBridge(page);
  await setScenario(page, "legacy_user");

  await expect(page.getByText(/Legacy veYFI detected/i)).toBeVisible();
  await page.getByRole("button", { name: /Opt-in to stYFI/i }).click();
  await expect(page.getByText(/veYFI Boost Active/i)).toBeVisible();

  await setBalance(page, "sdYFI", "100");
  await setAllowance(page, "sdYFI", SPENDER_REDEMPTION, "1000");

  const rowToggle = page.getByRole("button", { name: /sdYFI/i }).first();
  await rowToggle.click();

  const rowContainer = rowToggle.locator("..");
  await rowContainer.getByRole("tab", { name: /^Trade$/i }).click();

  const before = await getState(page);
  const yfiBefore = Number(before?.balances.YFI ?? "0");
  const sdBefore = Number(before?.balances.sdYFI ?? "0");

  const tradeInput = page.getByPlaceholder("0.00").first();
  await tradeInput.fill("10");
  await page.getByRole("button", { name: /Sell sdYFI/i }).click();

  await page.waitForFunction(
    async ({
      addr,
      prevYfi,
      prevSd,
    }: {
      addr: typeof E2E_ADDRESS;
      prevYfi: number;
      prevSd: number;
    }) => {
      const state = await window.__TEST__?.getState(addr);
      if (!state) return false;
      return (
        Number(state.balances.YFI) > Number(prevYfi) &&
        Number(state.balances.sdYFI) < Number(prevSd)
      );
    },
    { addr: E2E_ADDRESS, prevYfi: yfiBefore, prevSd: sdBefore }
  );
});
