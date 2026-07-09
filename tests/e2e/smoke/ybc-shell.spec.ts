import { expect, test } from "@playwright/test";
import {
  resetBridge,
  setYbcEmptyBoard,
  setYbcPerspective,
  waitForTestBridge,
} from "../utils";

test("renders the YBC overview and operator panel states", async ({ page }) => {
  await page.goto("/ybc");
  await waitForTestBridge(page);
  await resetBridge(page);

  await expect(
    page.getByRole("heading", { name: "Yearn Builder's Collective", level: 1 })
  ).toBeVisible();
  await expect(page.getByText("/ybc")).toBeVisible();
  await expect(page.getByText("Accepted shell map")).toHaveCount(0);
  await expect(page.getByText("Mock interactions")).toHaveCount(0);
  await expect(page.getByText("Mock MVP scope")).toHaveCount(0);
  await expect(page.getByText("Internal influence", { exact: true })).toBeVisible();
  await expect(page.getByText("Delegated influence", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Observer view", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proposal Board", level: 2 })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Raw staked" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Effective weight" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Target weight" })).toBeVisible();
  await page.getByRole("button", { name: /Cards/i }).click();
  await expect(page.getByRole("table")).toHaveCount(0);

  await expect(page.getByRole("heading", { name: "Proposal Board", level: 2 })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Rewards", level: 2 })).toBeVisible();
  await expect(
    page.getByText("Connect a member wallet to view YBC rewards")
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Shared rewards unavailable" })
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Operator Panel", level: 2 })
  ).toHaveCount(0);

  await setYbcPerspective(page, "operator");

  await expect(
    page.getByRole("heading", { name: "Operators and management" })
  ).toBeVisible();
  await expect(page.getByText("Governance hooks")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start add member flow" })).toBeVisible();

  await setYbcEmptyBoard(page, true);
  await expect(page.getByText("No proposal history")).toBeVisible();
});
