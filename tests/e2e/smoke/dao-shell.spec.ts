import { expect, test, type Locator, type Page } from "@playwright/test";

test("renders the DAO proposal board shell", async ({ page }) => {
  await page.goto("/dao");

  await expect(
    page.getByRole("heading", { name: "DAO Governance", level: 1 })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Proposal board", level: 2 })
  ).toBeVisible();
  await expect(page.getByText("22 proposals are available.")).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "Open the Yearn discussion forum in a new tab",
    })
  ).toHaveAttribute("href", "https://gov.yearn.fi/");
  await expect(page.getByText(/mock|prototype/i)).toHaveCount(0);

  const proposalsLink = page.getByRole("link", { name: "Proposals" });
  const createProposalLink = page.getByRole("link", {
    name: "Create proposal",
  });
  const forumLink = page.getByRole("link", {
    name: "Open the Yearn discussion forum in a new tab",
  });

  await proposalsLink.focus();
  await expect(proposalsLink).toBeFocused();
  expect(
    await proposalsLink.evaluate((element) => getComputedStyle(element).boxShadow)
  ).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(createProposalLink).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(forumLink).toBeFocused();

  await expectMinimumHitArea(createProposalLink);
});

test("renders DAO proposal detail and not-found shells", async ({ page }) => {
  await page.goto("/dao/proposals/2");

  await expect(
    page.getByRole("heading", { name: "DAO Governance", level: 1 })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fund protocol research", level: 2 })
  ).toBeVisible();
  await expect(page.getByText("Proposal #2")).toBeVisible();
  await expect(page.getByText(/mock|prototype/i)).toHaveCount(0);

  await page.goto("/dao/proposals/999");
  await expect(
    page.getByRole("heading", { name: "Proposal not found", level: 2 })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Return to proposals" })
  ).toHaveAttribute("href", "/dao");
});

test("renders the DAO proposal authoring shell without M2 form controls", async ({
  page,
}) => {
  await page.goto("/dao/propose");

  await expect(
    page.getByRole("heading", { name: "DAO Governance", level: 1 })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Before you propose", level: 2 })
  ).toBeVisible();
  await expect(page.getByText("Your wallet can create a proposal")).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByText(/mock|prototype/i)).toHaveCount(0);
});

test("contains every DAO route at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const routes = [
    { path: "/dao", readyText: "22 proposals are available." },
    { path: "/dao/proposals/2", readyText: "Fund protocol research" },
    { path: "/dao/propose", readyText: "Your wallet can create a proposal" },
  ];

  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.getByText(route.readyText, { exact: true })).toBeVisible();
    await expectNoDocumentOverflow(page);
    await expectMinimumHitArea(
      page.getByRole("link", { name: "Create proposal" })
    );
  }
});

async function expectNoDocumentOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth);
}

async function expectMinimumHitArea(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(40);
  expect(box!.height).toBeGreaterThanOrEqual(40);
}
