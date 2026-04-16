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
  await expect(
    page.getByRole("heading", { name: "Revenue Deposit", level: 2 })
  ).toBeVisible();
});
