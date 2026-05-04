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
  await expect(page.getByText("Production gated")).toBeVisible();
  await expect(page.getByText("Accepted shell map")).toHaveCount(0);
  await expect(page.getByText("Mock interactions")).toHaveCount(0);
  await expect(page.getByText("Mock MVP scope")).toHaveCount(0);
  await expect(page.getByRole("tab", { name: /Members/i })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(page.getByRole("tab", { name: /Proposals/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Rewards/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Operator/i })).toHaveCount(0);
  await expect(page.getByText("Internal influence", { exact: true })).toBeVisible();
  await expect(page.getByText("Delegated influence", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Observer view", level: 2 })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Raw staked" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Effective weight" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Target weight" })).toBeVisible();

  await page.getByRole("tab", { name: /Proposals/i }).click();
  await expect(page.getByRole("heading", { name: "Proposal Board", level: 2 })).toBeVisible();

  await page.getByRole("tab", { name: /Rewards/i }).click();
  await expect(page.getByRole("heading", { name: "Rewards Handoff", level: 2 })).toBeVisible();
  await expect(
    page.getByText("Connect a member wallet to view YBC reward periods")
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open shared rewards" })
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Scoped Operator Panel", level: 2 })
  ).toHaveCount(0);

  await setYbcPerspective(page, "operator");

  await page.getByRole("tab", { name: /Operator/i }).click();
  await expect(page.getByText("Operators and management")).toBeVisible();
  await expect(page.getByText("Governance hooks")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start add member flow" })).toBeVisible();

  await setYbcEmptyBoard(page, true);
  await page.getByRole("tab", { name: /Proposals/i }).click();
  await expect(page.getByText("No active proposal history in this perspective")).toBeVisible();
});
