import { expect, test } from "@playwright/test";
import {
  patchTeamsAdmin,
  setTeamsEmpty,
  setTeamsLoading,
  setTeamsSelectedTeam,
  setTeamsViewerRole,
  waitForTestBridge,
} from "../utils";

test("renders the Team Finances route shell", async ({ page }) => {
  await page.goto("/teams");
  await waitForTestBridge(page);

  await expect(
    page.getByRole("heading", { name: "Team Finances", level: 1 })
  ).toBeVisible();
  await expect(page.getByText("/teams")).toBeVisible();
  await expect(page.getByText("Production gated")).toBeVisible();
  await expect(
    page.getByText(
      "Compare registered teams, open one workspace, then act on revenue, funding, bonus, and lifecycle state."
    )
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /Directory/i })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(page.getByRole("tab", { name: /Workspace/i })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Platform workspace" })
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await page.getByRole("button", { name: /Audit/i }).click();
  await expect(
    page.getByRole("columnheader", { name: "Owner" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /debug/i })
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: /Admin/i })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Revenue Deposit", level: 2 })
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Open Platform workspace" }).click();
  await expect(page.getByRole("heading", { name: "Platform", level: 2 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bonus", level: 3 })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ownership & Lifecycle", level: 3 })
  ).toBeVisible();

  await setTeamsViewerRole(page, "operator-admin");
  await patchTeamsAdmin(page, { enabled: true });
  await setTeamsSelectedTeam(page, "security");

  await page.getByRole("tab", { name: /Admin/i }).click();
  await expect(
    page.locator("#admin").getByRole("heading", { name: "Admin Console", level: 2 })
  ).toBeVisible();
});

test("keeps loading and empty coverage reachable through the shared Teams runtime", async ({
  page,
}) => {
  await page.goto("/teams");
  await waitForTestBridge(page);

  await setTeamsLoading(page, true);

  await expect(page.getByText("Loading team directory")).toBeVisible();
  await page.getByRole("tab", { name: /Workspace/i }).click();
  await expect(page.getByText("Loading workspace overview")).toBeVisible();
  await expect(page.getByText("Loading revenue deposit flow")).toBeVisible();

  await setTeamsLoading(page, false);
  await setTeamsViewerRole(page, "operator-admin");
  await patchTeamsAdmin(page, { enabled: true });
  await setTeamsEmpty(page, true);

  await page.getByRole("tab", { name: /Directory/i }).click();
  await expect(page.getByText("No teams available")).toBeVisible();
  await page.getByRole("tab", { name: /Workspace/i }).click();
  await expect(page.getByText("No workspace available")).toBeVisible();
  await expect(page.getByText("No revenue workspace available")).toBeVisible();
  await page.getByRole("tab", { name: /Admin/i }).click();
  await expect(page.locator("#admin").getByText("No admin console available")).toBeVisible();
});
