import type { Page } from "@playwright/test";

export const E2E_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

export async function waitForTestBridge(page: Page) {
  await page.waitForFunction(() => !!window.__TEST__);
}

export async function resetBridge(page: Page) {
  await page.evaluate(async () => {
    await window.__TEST__?.reset();
  });
}

export async function setBalance(
  page: Page,
  symbol: string,
  amount: string,
  address = E2E_ADDRESS
) {
  await page.evaluate(
    async ({ addr, sym, amt }) => {
      await window.__TEST__?.setBalance(addr, sym, amt);
    },
    { addr: address, sym: symbol, amt: amount }
  );
}

export async function setAllowance(
  page: Page,
  symbol: string,
  spender: string,
  amount: string,
  address = E2E_ADDRESS
) {
  await page.evaluate(
    async ({ addr, sym, sp, amt }) => {
      await window.__TEST__?.setAllowance(addr, sym, sp, amt);
    },
    { addr: address, sym: symbol, sp: spender, amt: amount }
  );
}

export async function setScenario(page: Page, name: string) {
  await page.evaluate(async (scenario) => {
    await window.__TEST__?.setScenario(scenario);
  }, name);
}

export async function setNow(page: Page, timestamp: number) {
  await page.evaluate(async (ts) => {
    await window.__TEST__?.setNow(ts);
  }, timestamp);
}

export async function getState(page: Page, address = E2E_ADDRESS) {
  return page.evaluate(async (addr) => {
    return window.__TEST__?.getState(addr);
  }, address);
}
