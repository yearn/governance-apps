import { expect, test } from "@playwright/test";

test("renders the YBC route shell", async ({ page }) => {
  await page.goto("/ybc");

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
});
