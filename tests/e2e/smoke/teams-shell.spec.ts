import { expect, test } from "@playwright/test";

test("renders the Team Finances route shell", async ({ page }) => {
  await page.goto("/teams");

  await expect(
    page.getByRole("heading", { name: "Team Finances", level: 1 })
  ).toBeVisible();
  await expect(page.getByText("/teams")).toBeVisible();
  await expect(page.getByText("Production gated")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open Platform workspace" })
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
  await expect(sectionNav.getByRole("link", { name: "Bonus" })).toHaveAttribute(
    "href",
    "#bonus"
  );
  await expect(
    sectionNav.getByRole("link", { name: "Ownership & Lifecycle" })
  ).toHaveAttribute("href", "#lifecycle");

  await page.getByRole("button", { name: "Open Platform workspace" }).click();
  await expect(page.getByRole("heading", { name: "Bonus", level: 3 })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ownership & Lifecycle", level: 3 })
  ).toBeVisible();
});
