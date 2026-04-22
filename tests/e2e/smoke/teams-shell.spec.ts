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
    page.getByRole("button", { name: "Open Platform workspace" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /debug/i })
  ).toBeVisible();
  await expect(
    page.locator("#bonus").getByRole("heading", { name: "Bonus", level: 3 })
  ).toBeVisible();
  await expect(
    page
      .locator("#lifecycle")
      .getByRole("heading", { name: "Ownership & Lifecycle", level: 3 })
  ).toBeVisible();

  const sectionNav = page.getByRole("navigation", {
    name: "Team Finances sections",
  });
  await expect(sectionNav.getByRole("link", { name: "Directory" })).toHaveAttribute(
    "href",
    "#directory"
  );
  await expect(sectionNav.getByRole("link", { name: "Workspace" })).toHaveAttribute(
    "href",
    "#workspace"
  );
  await expect(sectionNav.getByRole("link", { name: "Revenue" })).toHaveAttribute(
    "href",
    "#revenue"
  );
  await expect(sectionNav.getByRole("link", { name: "Funding" })).toHaveAttribute(
    "href",
    "#funding"
  );
  await expect(sectionNav.getByRole("link", { name: "Bonus" })).toHaveAttribute(
    "href",
    "#bonus"
  );
  await expect(
    sectionNav.getByRole("link", { name: "Ownership & Lifecycle" })
  ).toHaveAttribute("href", "#lifecycle");
  await expect(sectionNav.getByRole("link", { name: "Admin" })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Revenue Deposit", level: 2 })
  ).toBeVisible();

  await page.getByRole("button", { name: "Open Platform workspace" }).click();
  await expect(page.getByRole("heading", { name: "Bonus", level: 3 })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ownership & Lifecycle", level: 3 })
  ).toBeVisible();

  await setTeamsViewerRole(page, "operator-admin");
  await patchTeamsAdmin(page, { enabled: true });
  await setTeamsSelectedTeam(page, "security");

  await expect(sectionNav.getByRole("link", { name: "Admin" })).toHaveAttribute(
    "href",
    "#admin"
  );
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
  await expect(page.getByText("Loading workspace overview")).toBeVisible();
  await expect(page.getByText("Loading revenue deposit flow")).toBeVisible();

  await setTeamsLoading(page, false);
  await setTeamsViewerRole(page, "operator-admin");
  await patchTeamsAdmin(page, { enabled: true });
  await setTeamsEmpty(page, true);

  await expect(page.getByText("No teams available")).toBeVisible();
  await expect(page.getByText("No workspace available")).toBeVisible();
  await expect(page.getByText("No revenue workspace available")).toBeVisible();
  await expect(page.locator("#admin").getByText("No admin console available")).toBeVisible();
});
