import type { Page } from "@playwright/test";
import type { Address } from "viem";
import type { TestBridge, TokenSymbol } from "@/lib/test-bridge";

type ScenarioName = Parameters<TestBridge["setScenario"]>[0];

export const E2E_ADDRESS =
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" as Address;

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
  symbol: TokenSymbol,
  amount: string,
  address: Address = E2E_ADDRESS
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
  symbol: TokenSymbol,
  spender: Address,
  amount: string,
  address: Address = E2E_ADDRESS
) {
  await page.evaluate(
    async ({ addr, sym, sp, amt }) => {
      await window.__TEST__?.setAllowance(addr, sym, sp, amt);
    },
    { addr: address, sym: symbol, sp: spender, amt: amount }
  );
}

export async function setScenario(page: Page, name: ScenarioName) {
  await page.evaluate(async (scenario) => {
    await window.__TEST__?.setScenario(scenario);
  }, name);
}

export async function seedExternalPortfolio(
  page: Page,
  address: Address = E2E_ADDRESS
) {
  await page.evaluate(async (addr) => {
    await window.__TEST__?.seedExternalPortfolio(addr);
  }, address);
}

export async function setNow(page: Page, timestamp: number) {
  await page.evaluate(async (ts) => {
    await window.__TEST__?.setNow(ts);
  }, timestamp);
}

export async function getState(page: Page, address: Address = E2E_ADDRESS) {
  return page.evaluate(async (addr) => {
    return window.__TEST__?.getState(addr);
  }, address);
}
