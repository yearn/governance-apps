import {
  expect,
  test,
  type APIResponse,
  type Locator,
  type Page,
} from "@playwright/test";

const EXPECT_PRODUCTION_FAIL_CLOSED =
  process.env.E2E_EXPECT_DAO_PRODUCTION_FAIL_CLOSED === "true";
const EXPECT_PRODUCTION_COMPILED_PREVIEW =
  process.env.E2E_EXPECT_DAO_PRODUCTION_COMPILED_PREVIEW === "true";

test("hydrates interactive DAO routes in a production-compiled preview", async ({
  page,
}) => {
  test.skip(!EXPECT_PRODUCTION_COMPILED_PREVIEW);

  const cspViolations: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /content security policy|script-src|nonce/i.test(message.text())
    ) {
      cspViolations.push(message.text());
    }
  });

  const routes = [
    {
      path: "/dao",
      readyText: "22 proposals are available.",
      focusLink: "Create proposal",
    },
    {
      path: "/dao/propose",
      readyText: "Your wallet can create a proposal",
      focusLink: "Proposals",
    },
  ];

  for (const route of routes) {
    await page.goto(route.path);
    await expect(page.getByText(route.readyText, { exact: true })).toBeVisible();

    const link = page
      .getByRole("navigation", { name: "DAO Governance" })
      .getByRole("link", { name: route.focusLink });
    await link.focus();
    await expect(link).toBeFocused();
  }

  expect(cspViolations).toEqual([]);
});

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
  await expect(
    page.getByText(/\b(mock|fixture|prototype|qa|implementation)\b/i)
  ).toHaveCount(0);

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

test("exposes the shared DAO debug section without route-local controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dao");

  await page.getByRole("button", { name: /debug/i }).click();

  await expect(page.getByText("Debug Controls", { exact: true })).toBeVisible();
  await expect(page.getByText("App Specific", { exact: true })).toBeVisible();
  for (const group of [
    "Route state",
    "Fixture",
    "Persona and roles",
    "Content",
    "Lifecycle",
    "Veto",
    "Analysis",
    "Account",
    "Execution",
    "Authoring",
    "Proposer eligibility",
  ]) {
    await expect(page.getByText(group, { exact: true })).toBeVisible();
  }
  await expectNoDocumentOverflow(page);
  await expectMinimumHitArea(
    page.getByRole("button", { name: "Close debug controls" })
  );
});

test("moves debug-panel focus and removes its entrance animation for reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/dao");

  const trigger = page.getByRole("button", { name: /debug/i });
  await trigger.focus();
  await trigger.click();

  const closeButton = page.getByRole("button", {
    name: "Close debug controls",
  });
  await expect(closeButton).toBeFocused();
  const panel = page
    .getByText("Debug Controls", { exact: true })
    .locator("../..");
  await expect(panel).toHaveCSS("animation-name", "none");

  await closeButton.click();
  await expect(trigger).toBeFocused();
});

test("uses the typed bridge to mutate DAO facts and refresh infinitely fresh queries", async ({
  page,
}) => {
  await page.goto("/dao");

  await page.evaluate(async () => {
    if (!window.__TEST__) throw new Error("Test bridge is unavailable.");
    await window.__TEST__.reset();
    await window.__TEST__.setDaoEmpty?.(true);
  });
  await expect(
    page.getByRole("heading", { name: "No proposals yet", level: 2 })
  ).toBeVisible();

  await page.evaluate(async () => {
    if (!window.__TEST__) throw new Error("Test bridge is unavailable.");
    await window.__TEST__.setDaoEmpty?.(false);
  });
  await page.goto("/dao/proposals/13");
  await page.evaluate(async () => {
    if (!window.__TEST__) throw new Error("Test bridge is unavailable.");
    await window.__TEST__.setDaoFixture?.("post-vote-veto");
  });
  await expect(page.getByText("Vetoed", { exact: true }).first()).toBeVisible();

  await page.evaluate(async () => {
    if (!window.__TEST__) throw new Error("Test bridge is unavailable.");
    await window.__TEST__.setDaoPersona?.("guardian");
    await window.__TEST__.setDaoRole?.("operator", true);
    await window.__TEST__.setDaoContentState?.("unavailable");
  });
  await expect(page.getByText("Proposal content is unavailable.")).toBeVisible();

  await page.goto("/dao/proposals/1");
  await page.evaluate(async () => {
    if (!window.__TEST__) throw new Error("Test bridge is unavailable.");
    await window.__TEST__.setDaoFixture?.("discussion");
    await window.__TEST__.setNow(Math.floor(Date.now() / 1_000) + 4 * 86_400);
  });
  await expect(page.getByText("Voting", { exact: true }).first()).toBeVisible();
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
  await expect(
    page.getByText(/\b(mock|fixture|prototype|qa|implementation)\b/i)
  ).toHaveCount(0);

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
  await expect(
    page.getByText(/\b(mock|fixture|prototype|qa|implementation)\b/i)
  ).toHaveCount(0);
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
