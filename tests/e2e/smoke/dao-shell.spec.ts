import {
  expect,
  test,
  type APIResponse,
  type Locator,
  type Page,
} from "@playwright/test";

const EXPECT_PRODUCTION_FAIL_CLOSED =
  process.env.E2E_EXPECT_DAO_PRODUCTION_FAIL_CLOSED === "true";

test("answers preview DAO HEAD probes without self-proxying", async ({
  request,
}) => {
  test.skip(EXPECT_PRODUCTION_FAIL_CLOSED);

  for (const path of ["/dao", "/dao/proposals/2"]) {
    const response = await request.head(path);

    expect(response.status()).toBe(200);
    expect(response.status()).toBeLessThan(500);
    expectHeadSecurityHeaders(response);
    expectNoSelfRewrite(response, path);
  }
});

test("fails closed for production DAO HEAD probes without a server error", async ({
  request,
}) => {
  test.skip(!EXPECT_PRODUCTION_FAIL_CLOSED);

  for (const path of ["/dao", "/dao/proposals/2"]) {
    const response = await request.head(path);

    expect(response.status()).toBe(404);
    expect(response.status()).toBeLessThan(500);
    expectHeadSecurityHeaders(response);
    expectNoSelfRewrite(response, path);
  }
});

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
  await expect(
    page.getByRole("link", {
      name: "Open this proposal's forum discussion in a new tab",
    })
  ).toHaveAttribute("target", "_blank");

  for (const label of ["Proposal #2", "Proposal ID", "Status", "Type"]) {
    await expect(page.getByText(label, { exact: true })).toHaveCSS(
      "color",
      "rgb(82, 82, 82)"
    );
  }
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

test("wraps an arbitrary-length numeric proposal ID at 390px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const proposalId = "9".repeat(160);

  await page.goto(`/dao/proposals/${proposalId}`);
  await expect(
    page.getByRole("heading", { name: "Proposal not found", level: 2 })
  ).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("balances all six preview launcher apps across desktop rows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const links = page.locator(
    'a[href="/styfi"], a[href="/veyfi"], a[href="/teams"], a[href="/yeth"], a[href="/ybc"], a[href="/dao"]'
  );
  await expect(links).toHaveCount(6);
  const rowCounts = await links.evaluateAll((elements) => {
    const counts = new Map<number, number>();
    for (const element of elements) {
      const top = Math.round(element.getBoundingClientRect().top);
      counts.set(top, (counts.get(top) ?? 0) + 1);
    }
    return [...counts.values()];
  });

  expect(rowCounts).toEqual([3, 3]);
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

function expectNoSelfRewrite(response: APIResponse, requestPath: string) {
  const rewrite = response.headers()["x-middleware-rewrite"];
  if (!rewrite) return;

  expect(new URL(rewrite).pathname).not.toBe(requestPath);
}

function expectHeadSecurityHeaders(response: APIResponse) {
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["x-nonce"]).toMatch(/^[a-f0-9]{32}$/);
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
}
