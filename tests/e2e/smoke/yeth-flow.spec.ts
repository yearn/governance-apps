import { test, expect } from "@playwright/test";
import {
  E2E_ADDRESS,
  resetBridge,
  setNow,
  setYethPreset,
  waitForTestBridge,
} from "../utils";

const OPEN_CLAIM_WINDOW_NOW = 1_770_000_000;

test("claim, stay, redeem, claim-ended, and empty-state flows", async ({ page }) => {
  await page.goto("/yeth");
  await waitForTestBridge(page);
  await resetBridge(page);
  await setNow(page, OPEN_CLAIM_WINDOW_NOW);

  await setYethPreset(page, "claimable");
  await page.waitForFunction(
    async ({ addr }: { addr: typeof E2E_ADDRESS }) => {
      const state = await window.__TEST__?.getState(addr);
      return state ? Number(state.yeth.claimableNow) > 0 : false;
    },
    { addr: E2E_ADDRESS }
  );

  await page
    .getByRole("button", { name: /Deposit claim into Recovery Vault/i })
    .click();
  await page
    .getByLabel(/I understand and accept these risks/i)
    .click();
  await page.getByRole("button", { name: /^Continue$/i }).click();

  await page.waitForFunction(
    async ({ addr }: { addr: typeof E2E_ADDRESS }) => {
      const state = await window.__TEST__?.getState(addr);
      if (!state) return false;
      return (
        Number(state.yeth.claimableNow) === 0 &&
        Number(state.yeth.recoveryShares) > 0
      );
    },
    { addr: E2E_ADDRESS }
  );
  await expect(
    page.getByRole("heading", { name: /Recovery Position/i })
  ).toBeVisible();

  const redeemButton = page.getByRole("button", { name: /^Exit with .* ETH$/i });
  await expect(redeemButton).toBeVisible();
  await redeemButton.click();

  await page.waitForFunction(
    async ({ addr }: { addr: typeof E2E_ADDRESS }) => {
      const state = await window.__TEST__?.getState(addr);
      return state ? Number(state.yeth.recoveryShares) === 0 : false;
    },
    { addr: E2E_ADDRESS }
  );
  await expect(
    page.getByRole("heading", { name: /Recovery Position/i })
  ).toHaveCount(0);

  await setYethPreset(page, "claimable");
  await expect(
    page.getByRole("button", { name: /^Claim .* ETH & Exit$/i })
  ).toBeVisible();
  await page.getByRole("button", { name: /^Claim .* ETH & Exit$/i }).click();

  await page.waitForFunction(
    async ({ addr }: { addr: typeof E2E_ADDRESS }) => {
      const state = await window.__TEST__?.getState(addr);
      if (!state) return false;
      return (
        Number(state.yeth.claimableNow) === 0 &&
        Number(state.yeth.recoveryShares) === 0
      );
    },
    { addr: E2E_ADDRESS }
  );
  await expect(
    page.getByRole("button", { name: /^Claim .* ETH & Exit$/i })
  ).toHaveCount(0);

  await setYethPreset(page, "claimable");
  await setNow(page, 2_000_000_000);
  await expect(
    page.getByRole("heading", { name: /Claim Window Closed/i })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Manual Late Claim Process/i })
  ).toBeVisible();

  await setNow(page, OPEN_CLAIM_WINDOW_NOW);
  await setYethPreset(page, "empty");
  await page.waitForFunction(
    async ({ addr }: { addr: typeof E2E_ADDRESS }) => {
      const state = await window.__TEST__?.getState(addr);
      if (!state) return false;
      return (
        Number(state.yeth.claimableNow) === 0 &&
        Number(state.yeth.recoveryShares) === 0
      );
    },
    { addr: E2E_ADDRESS }
  );
  await expect(
    page.getByRole("button", { name: /^Claim .* ETH & Exit$/i })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Deposit claim into Recovery Vault/i })
  ).toHaveCount(0);
});
