import { expect, test, type Page } from "@playwright/test";

const SNAPSHOT_SPACE_URL = "https://snapshot.org/#/s:styfi.eth/";
const PROPOSAL_ID =
  "0xa348d353b66f46c6957a938a42fbf860eaffc855cd9163d8042780f65ea72612";

async function mockSnapshot(page: Page, proposals: unknown[]) {
  await page.route("https://hub.snapshot.org/graphql", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { proposals } }),
    });
  });
}

test("shows permanent Snapshot Voting navigation and an active vote banner", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await mockSnapshot(page, [
    {
      id: PROPOSAL_ID,
      title: "YIP:91 yTranche",
      end: 1_999_999_999,
      state: "active",
    },
  ]);

  await page.goto("/styfi");

  const headerLink = page.getByRole("link", { name: /snapshot voting/i });
  await expect(headerLink).toBeVisible();
  await expect(headerLink).toHaveAttribute("href", SNAPSHOT_SPACE_URL);
  const headerLinkBox = await headerLink.boundingBox();
  const epochBox = await page.getByText(/^Epoch \d+$/).locator("..").boundingBox();
  expect(headerLinkBox).not.toBeNull();
  expect(epochBox).not.toBeNull();
  expect((headerLinkBox?.x ?? 0) + (headerLinkBox?.width ?? 0)).toBeLessThanOrEqual(
    epochBox?.x ?? 0,
  );

  await expect(page.getByText("Voting open")).toBeVisible();
  await expect(page.getByText("YIP:91 yTranche")).toBeVisible();
  await expect(page.getByRole("link", { name: /review & vote/i })).toHaveAttribute(
    "href",
    `${SNAPSHOT_SPACE_URL}proposal/${PROPOSAL_ID}`,
  );
});

test("keeps Snapshot Voting available in the mobile menu without an active vote", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSnapshot(page, []);

  await page.goto("/styfi");
  await expect(page.getByText("Voting open")).toHaveCount(0);

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const mobileLink = page.getByRole("link", { name: /snapshot voting/i });
  const toolsButton = page.getByRole("button", { name: "Tools", exact: true });
  await expect(mobileLink).toBeVisible();
  await expect(mobileLink).toHaveAttribute("href", SNAPSHOT_SPACE_URL);
  const mobileLinkBox = await mobileLink.boundingBox();
  const toolsButtonBox = await toolsButton.boundingBox();
  expect(mobileLinkBox).not.toBeNull();
  expect(toolsButtonBox).not.toBeNull();
  expect(mobileLinkBox?.y ?? 0).toBeGreaterThan(toolsButtonBox?.y ?? 0);
});
