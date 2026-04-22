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
  const sectionNav = page.getByRole("navigation", { name: "YBC sections" });
  await expect(sectionNav.getByRole("link", { name: "Overview" })).toHaveAttribute(
    "href",
    "#overview"
  );
  await expect(sectionNav.getByRole("link", { name: "Members" })).toHaveAttribute(
    "href",
    "#members"
  );
  await expect(sectionNav.getByRole("link", { name: "Proposals" })).toHaveAttribute(
    "href",
    "#proposals"
  );
  await expect(sectionNav.getByRole("link", { name: "Rewards" })).toHaveAttribute(
    "href",
    "#rewards"
  );
  await expect(sectionNav.getByRole("link", { name: "Admin" })).toHaveAttribute(
    "href",
    "#admin"
  );
  await expect(page.getByText("Internal influence", { exact: true })).toBeVisible();
  await expect(page.getByText("Delegated influence", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Observer view", level: 2 })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Raw staked" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Effective weight" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Target weight" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Proposal Board", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Rewards Handoff", level: 2 })).toBeVisible();
  await expect(
    page.getByText("Connect a member wallet to view YBC reward periods")
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open shared rewards" })
  ).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Scoped Operator Panel", level: 2 })).toBeVisible();
  await expect(page.getByText("Operator access required")).toBeVisible();

  await setYbcPerspective(page, "operator");

  await expect(page.getByText("Operators and management")).toBeVisible();
  await expect(page.getByText("Governance hooks")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start add member flow" })).toBeVisible();

  await setYbcEmptyBoard(page, true);
  await expect(page.getByText("No active proposal history in this perspective")).toBeVisible();
});
