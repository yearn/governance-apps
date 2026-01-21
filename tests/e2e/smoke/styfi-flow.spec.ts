import { test, expect } from "@playwright/test";
import {
  waitForTestBridge,
  resetBridge,
  setBalance,
  setAllowance,
  setNow,
  getState,
  E2E_ADDRESS,
} from "../utils";
import { SPENDER_STYFI, SPENDER_STYFIX } from "../../../lib/constants";

test("stake, cooldown, and withdraw via bridge controls", async ({ page }) => {
  await page.goto("/styfi");
  await waitForTestBridge(page);
  await resetBridge(page);

  await setBalance(page, "YFI", "100");
  await setAllowance(page, "YFI", SPENDER_STYFI, "1000");
  await setAllowance(page, "YFI", SPENDER_STYFIX, "1000");
  await page.getByRole("button", { name: /^stYFI$/i }).click();

  const stakeInput = page.getByPlaceholder("0.00").first();
  await expect(stakeInput).toBeEnabled();
  await stakeInput.fill("10");

  const approveButton = page.getByRole("button", { name: /Approve YFI/i });
  if (await approveButton.isVisible()) {
    await approveButton.click();
    await expect(
      page.getByRole("button", { name: /Stake YFI/i })
    ).toBeVisible();
  }

  await stakeInput.fill("10");
  const stakeButton = page.getByRole("button", { name: /Stake YFI/i });
  await expect(stakeButton).toBeEnabled();
  await stakeButton.click();

  const beforeCooldown = await getState(page);
  const activeBefore = Number(beforeCooldown?.styfi.active ?? "0");

  await page.waitForFunction(
    async ({ addr, prev }: { addr: typeof E2E_ADDRESS; prev: number }) => {
      const state = await window.__TEST__?.getState(addr);
      return state ? Number(state.styfi.active) > Number(prev) : false;
    },
    { addr: E2E_ADDRESS, prev: activeBefore }
  );

  await page.getByRole("button", { name: /Unstake/i }).click();
  const cooldownInput = page.getByPlaceholder("0.00").first();
  await cooldownInput.fill("10");
  await page.getByRole("button", { name: /Start new cooldown/i }).click();

  await page.waitForFunction(
    async ({ addr }: { addr: typeof E2E_ADDRESS }) => {
      const state = await window.__TEST__?.getState(addr);
      return state ? Number(state.styfi.cooldown) > 0 : false;
    },
    { addr: E2E_ADDRESS }
  );

  const forward = 15 * 24 * 60 * 60;
  await setNow(page, Math.floor(Date.now() / 1000) + forward);

  await page.waitForFunction(
    async ({ addr }: { addr: typeof E2E_ADDRESS }) => {
      const state = await window.__TEST__?.getState(addr);
      return state ? Number(state.styfi.withdrawable) > 0 : false;
    },
    { addr: E2E_ADDRESS }
  );

  const withdrawButton = page.getByRole("button", { name: /^Withdraw$/i });
  await expect(withdrawButton).toBeEnabled();

  const beforeWithdraw = await getState(page);
  const yfiBefore = Number(beforeWithdraw?.balances.YFI ?? "0");

  await withdrawButton.click();

  await page.waitForFunction(
    async ({ addr, prev }: { addr: typeof E2E_ADDRESS; prev: number }) => {
      const state = await window.__TEST__?.getState(addr);
      return state ? Number(state.balances.YFI) > Number(prev) : false;
    },
    { addr: E2E_ADDRESS, prev: yfiBefore }
  );
});
