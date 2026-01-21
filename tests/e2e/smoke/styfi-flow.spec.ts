import { test, expect } from "@playwright/test";
import {
  waitForTestBridge,
  resetBridge,
  setBalance,
  setNow,
  getState,
  E2E_ADDRESS,
} from "../utils";

test("stake, cooldown, and withdraw via bridge controls", async ({ page }) => {
  await page.goto("/styfi");
  await waitForTestBridge(page);
  await resetBridge(page);

  await setBalance(page, "YFI", "100");

  const stakeInput = page.getByPlaceholder("0.00").first();
  await stakeInput.fill("10");
  await page.getByRole("button", { name: /Stake YFI/i }).click();

  const beforeCooldown = await getState(page);
  const activeBefore = Number(beforeCooldown?.styfi.active ?? "0");

  await page.waitForFunction(
    async (addr, prev) => {
      const state = await window.__TEST__?.getState(addr);
      return state ? Number(state.styfi.active) > Number(prev) : false;
    },
    E2E_ADDRESS,
    activeBefore
  );

  await page.getByRole("button", { name: /Unstake/i }).click();
  const cooldownInput = page.getByPlaceholder("0.00").first();
  await cooldownInput.fill("10");
  await page.getByRole("button", { name: /Start new cooldown/i }).click();

  await page.waitForFunction(async (addr) => {
    const state = await window.__TEST__?.getState(addr);
    return state ? Number(state.styfi.cooldown) > 0 : false;
  }, E2E_ADDRESS);

  const forward = 15 * 24 * 60 * 60;
  await setNow(page, Math.floor(Date.now() / 1000) + forward);

  const withdrawButton = page.getByRole("button", { name: /^Withdraw$/i });
  await expect(withdrawButton).toBeEnabled();

  const beforeWithdraw = await getState(page);
  const yfiBefore = Number(beforeWithdraw?.balances.YFI ?? "0");

  await withdrawButton.click();

  await page.waitForFunction(
    async (addr, prev) => {
      const state = await window.__TEST__?.getState(addr);
      return state ? Number(state.balances.YFI) > Number(prev) : false;
    },
    E2E_ADDRESS,
    yfiBefore
  );
});
