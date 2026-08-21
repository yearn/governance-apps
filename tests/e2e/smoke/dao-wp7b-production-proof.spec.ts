import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import type { Address, Hex } from "viem";
import {
  clearDaoCreatedProposals,
  createDaoAwaitingIndexProposal,
  createDaoRawSha256Cid,
  deriveDaoProposalContentIdentity,
  indexDaoCreatedProposal,
  persistDaoCreatedProposal,
  serializeDaoProposalJson,
  serializeDaoProposalRef,
  DAO_CREATED_PROPOSALS_STORAGE_KEY,
  type DaoDecodedProposeIdentity,
  type DaoProposalContent,
} from "@/lib/clients/dao";
import { resetBridge, waitForTestBridge } from "../utils";

const PROOF_MODE = process.env.E2E_WP7B_PRODUCTION_PROOF;
const CAPTURE_SCREENSHOTS =
  process.env.E2E_CAPTURE_WP7B_SCREENSHOTS === "true";
const BUILD_SHA = process.env.E2E_WP7B_BUILD_SHA ?? "unrecorded";
const SCREENSHOT_DIRECTORY = path.join(
  process.cwd(),
  "docs/apps/dao/delivery/evidence/M2-WP7B/screenshots"
);
const VOTING = "0x1111111111111111111111111111111111111111" as Address;
const PROPOSER = "0x4444444444444444444444444444444444444444" as Address;
const CREATED_PROPOSAL_ID = 4_201n;
const CREATED_PROPOSAL_REF = `1:${VOTING}:${CREATED_PROPOSAL_ID.toString()}`;

type ScreenshotMetadata = {
  file: string;
  route: string;
  runtime: string;
  fixture: string;
  viewport: { width: number; height: number };
  theme: "light" | "dark";
  focus: string;
  reducedMotion: "default" | "reduce";
  textScale: "100%";
  attachmentRequestCount: number;
  documentClientWidth: number;
  documentScrollWidth: number;
  buildSha: string;
};

test("proves the production-compiled DAO-enabled boundary", async ({
  browser,
}, testInfo) => {
  test.skip(PROOF_MODE !== "enabled");
  const baseURL = requireBaseUrl(testInfo.project.use.baseURL);
  const records = createStoredCreatedProposalRecords();
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 1_280, height: 900 },
  });
  await context.addInitScript(
    ({ key, value }) => sessionStorage.setItem(key, value),
    {
      key: DAO_CREATED_PROPOSALS_STORAGE_KEY,
      value: records.awaiting,
    }
  );
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const forbiddenRequests: string[] = [];
  const attachmentRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  context.on("request", (request) => {
    const url = request.url();
    const body = request.postData() ?? "";
    if (/127\.0\.0\.1:8546|localhost:8546|\"method\":\"eth_accounts\"/.test(`${url}\n${body}`)) {
      forbiddenRequests.push(`${request.method()} ${url}`);
    }
    if (url.startsWith("https://ipfs.io/ipfs/")) {
      attachmentRequests.push(url);
    }
  });

  await page.goto("/dao");
  await expect(page.getByRole("heading", { name: "Proposals", level: 1 })).toBeVisible();
  await assertProductionChrome(page);
  await page.goto("/dao/propose");
  await expect(page.getByText("Wallet not connected", { exact: true })).toBeVisible();
  await assertProductionChrome(page);
  await page.goto("/dao/proposals/2");
  await expect(
    page.getByRole("heading", { name: "Fund protocol research", level: 1 })
  ).toBeVisible();
  await assertProductionChrome(page);

  await page.goto(`/dao/proposals/${CREATED_PROPOSAL_ID.toString()}`);
  await expect(
    page.getByRole("heading", { name: "Session proposal", level: 1 })
  ).toBeVisible();
  await expect(page.getByText("Analysis pending", { exact: true })).toBeVisible();
  await assertProposalIdentity(page, CREATED_PROPOSAL_REF);

  const metadata: ScreenshotMetadata[] = [];
  if (CAPTURE_SCREENSHOTS) {
    await captureEnabledScreenshots(page, metadata, attachmentRequests);
  }

  await page.evaluate(
    ({ key, value }) => sessionStorage.setItem(key, value),
    { key: DAO_CREATED_PROPOSALS_STORAGE_KEY, value: records.indexed }
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Session proposal", level: 1 })
  ).toBeVisible();
  await expect(page.getByText("Analysis unavailable", { exact: true })).toBeVisible();
  await assertProposalIdentity(page, CREATED_PROPOSAL_REF);

  if (CAPTURE_SCREENSHOTS) {
    await setPresentation(page, {
      height: 900,
      reducedMotion: "default",
      theme: "light",
      width: 1_280,
    });
    const technical = await openTechnicalDetails(page);
    await technical.scrollIntoViewIfNeeded();
    metadata.push(
      await captureScreenshot(page, {
        attachmentRequestCount: attachmentRequests.length,
        file: "indexed-created-identity-light-1280x900.png",
        fixture: "browser-local created proposal, indexed",
        focus: "Technical details summary",
        reducedMotion: "default",
        runtime: "production; DAO on; E2E, global mocks, debug off",
        theme: "light",
      })
    );
    await writeMetadata("production-enabled-metadata.json", metadata);
  }

  const betaPage = await context.newPage();
  const betaUrl = new URL(baseURL);
  betaUrl.hostname = "dao-beta.dao-ops.com";
  betaUrl.pathname = "/";
  const betaResponse = await betaPage.goto(betaUrl.toString());
  expect(betaResponse?.status()).toBe(200);
  expect(betaResponse?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(betaPage.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(
    betaPage.getByRole("link", { name: "Create proposal" })
  ).toHaveAttribute("href", "/propose");
  await betaPage.close();

  expect(attachmentRequests).toEqual([]);
  expect(forbiddenRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  await context.close();
});

test("proves the production-compiled DAO-disabled boundary", async ({
  page,
  request,
}, testInfo) => {
  test.skip(PROOF_MODE !== "disabled");

  for (const route of ["/dao", "/dao/propose", "/dao/proposals/2"]) {
    for (const method of ["head", "get"] as const) {
      const response = await request[method](route);
      expect(response.status(), `${method.toUpperCase()} ${route}`).toBe(404);
      expect(response.status()).toBeLessThan(500);
    }
  }

  const betaUrl = new URL(requireBaseUrl(testInfo.project.use.baseURL));
  betaUrl.hostname = "dao-beta.dao-ops.com";
  betaUrl.pathname = "/";
  const betaResponse = await page.goto(betaUrl.toString());
  expect(betaResponse?.status()).toBe(404);
  expect(betaResponse?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});

test("captures mutable authoring states from the production-compiled preview", async ({
  page,
}) => {
  test.skip(PROOF_MODE !== "preview" || !CAPTURE_SCREENSHOTS);
  const metadata: ScreenshotMetadata[] = [];
  const attachmentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://ipfs.io/ipfs/")) {
      attachmentRequests.push(request.url());
    }
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dao/propose");
  await waitForTestBridge(page);
  await resetBridge(page);
  await page.evaluate(async () => {
    await window.__TEST__?.setDaoProposerState?.("eligible");
    await window.__TEST__?.setDaoAuthoringState?.("valid-signal");
  });
  await openAuthoring(page);
  const markdown = page.getByRole("textbox", { name: "Proposal Markdown" });
  await markdown.fill("## Missing proposal title\n\nSummary without an H1.\n");
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.getByText("MISSING_H1", { exact: true })).toBeVisible();
  const validation = page.locator("#dao-markdown-validation");
  await validation.scrollIntoViewIfNeeded();
  await removeEvidenceChrome(page);
  metadata.push(
    await captureScreenshot(page, {
      attachmentRequestCount: attachmentRequests.length,
      file: "authoring-preview-error-light-390x844.png",
      fixture: "eligible author; invalid Markdown missing H1",
      focus: "Preview tab",
      reducedMotion: "default",
      runtime: "production-compiled preview evidence; E2E route controls on",
      theme: "light",
    })
  );

  await page.getByRole("tab", { name: "Write" }).click();
  await fillImmutableDraft(page);
  await page.getByRole("button", { name: "Review proposal" }).click();
  await setPresentation(page, {
    height: 600,
    reducedMotion: "reduce",
    theme: "dark",
    width: 1_280,
  });
  await removeEvidenceChrome(page);
  await page.clock.install();
  await page
    .getByRole("checkbox", { name: /I reviewed the exact immutable content/i })
    .check();
  await page
    .getByRole("button", { name: "Publish immutable content" })
    .click();
  await page.clock.fastForward(200);
  await expect(
    page.getByRole("heading", { name: "Immutable content published" })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create onchain proposal" })
    .click();
  await page.clock.fastForward(450);
  await expect(
    page.getByText("Awaiting proposal indexing and analysis")
  ).toBeVisible();
  const openProposal = page.getByRole("link", { name: "Open proposal" });
  const stableHref = await openProposal.getAttribute("href");
  expect(stableHref).toMatch(/^\/dao\/proposals\/\d+\?from=upcoming$/);
  const awaitingHeading = page.locator("#dao-proposal-complete-heading");
  await awaitingHeading.evaluate((element) =>
    element.scrollIntoView({ block: "center" })
  );
  metadata.push(
    await captureScreenshot(page, {
      attachmentRequestCount: attachmentRequests.length,
      file: "awaiting-index-identity-dark-1280x600.png",
      fixture: "receipt-confirmed proposal awaiting indexing",
      focus: "Proposal identity confirmed heading",
      reducedMotion: "reduce",
      runtime: "production-compiled preview evidence; E2E route controls on",
      theme: "dark",
    })
  );

  await page.clock.fastForward(200);
  const ready = page.getByRole("heading", { name: "Proposal ready" });
  await expect(ready).toBeVisible();
  await expect(openProposal).toHaveAttribute("href", stableHref!);
  await expect(
    page.getByRole("button", { name: "Copy proposal link" })
  ).toBeVisible();
  await setPresentation(page, {
    height: 900,
    reducedMotion: "default",
    theme: "light",
    width: 1_280,
  });
  await removeEvidenceChrome(page);
  await ready.scrollIntoViewIfNeeded();
  metadata.push(
    await captureScreenshot(page, {
      attachmentRequestCount: attachmentRequests.length,
      file: "indexed-created-actions-light-1280x900.png",
      fixture: "same browser-local proposal after deterministic indexing",
      focus: "Proposal ready heading",
      reducedMotion: "default",
      runtime: "production-compiled preview evidence; E2E route controls on",
      theme: "light",
    })
  );

  expect(attachmentRequests).toEqual([]);
  await writeMetadata("preview-metadata.json", metadata);
});

async function captureEnabledScreenshots(
  page: Page,
  metadata: ScreenshotMetadata[],
  attachmentRequests: string[]
) {
  await setPresentation(page, {
    height: 600,
    reducedMotion: "reduce",
    theme: "dark",
    width: 1_280,
  });
  const pendingTechnical = await openTechnicalDetails(page);
  await pendingTechnical.scrollIntoViewIfNeeded();
  metadata.push(
    await captureScreenshot(page, {
      attachmentRequestCount: attachmentRequests.length,
      file: "awaiting-created-identity-dark-1280x600.png",
      fixture: "browser-local created proposal, awaiting index",
      focus: "Technical details summary",
      reducedMotion: "reduce",
      runtime: "production; DAO on; E2E, global mocks, debug off",
      theme: "dark",
    })
  );

  await page.setViewportSize({ width: 768, height: 1_024 });
  await page.goto("/dao/proposals/1");
  await setTheme(page, "dark");
  await page.getByText("View Markdown source").click();
  const source = page.getByRole("region", { name: "Exact Markdown source" });
  await source.focus();
  await source.scrollIntoViewIfNeeded();
  metadata.push(
    await captureScreenshot(page, {
      attachmentRequestCount: attachmentRequests.length,
      file: "attachment-source-dark-768x1024.png",
      fixture: "relative authenticated attachment and exact source",
      focus: "Exact Markdown source region",
      reducedMotion: "reduce",
      runtime: "production; DAO on; E2E, global mocks, debug off",
      theme: "dark",
    })
  );

  for (const capture of [
    {
      file: "lifecycle-flagged-dark-390x844.png",
      fixture: "flagged proposal",
      height: 844,
      id: 11,
      theme: "dark" as const,
      width: 390,
    },
    {
      file: "lifecycle-early-veto-light-768x1024.png",
      fixture: "guardian veto before participation",
      height: 1_024,
      id: 12,
      theme: "light" as const,
      width: 768,
    },
    {
      file: "lifecycle-post-veto-dark-1280x600.png",
      fixture: "guardian veto after participation",
      height: 600,
      id: 13,
      theme: "dark" as const,
      width: 1_280,
    },
  ]) {
    await page.setViewportSize({ width: capture.width, height: capture.height });
    await page.goto(`/dao/proposals/${capture.id}`);
    await setTheme(page, capture.theme);
    const lifecycle = page.getByRole("heading", { name: "Lifecycle" });
    await lifecycle.scrollIntoViewIfNeeded();
    metadata.push(
      await captureScreenshot(page, {
        attachmentRequestCount: attachmentRequests.length,
        file: capture.file,
        fixture: capture.fixture,
        focus: "none",
        reducedMotion: "reduce",
        runtime: "production; DAO on; E2E, global mocks, debug off",
        theme: capture.theme,
      })
    );
  }

  for (const capture of [
    {
      file: "rules-default-source-light-1280x900.png",
      fixture: "default 50% proposal rule and pinned Voting source",
      height: 900,
      id: 2,
      theme: "light" as const,
      width: 1_280,
    },
    {
      file: "rules-alternate-dark-390x844.png",
      fixture: "alternate 60% proposal rule",
      height: 844,
      id: 7,
      theme: "dark" as const,
      width: 390,
    },
  ]) {
    await page.setViewportSize({ width: capture.width, height: capture.height });
    await page.goto(`/dao/proposals/${capture.id}`);
    await setTheme(page, capture.theme);
    const rules = page.getByText("Proposal rules", { exact: true });
    await rules.click();
    await rules.focus();
    await rules.scrollIntoViewIfNeeded();
    metadata.push(
      await captureScreenshot(page, {
        attachmentRequestCount: attachmentRequests.length,
        file: capture.file,
        fixture: capture.fixture,
        focus: "Proposal rules summary",
        reducedMotion: "reduce",
        runtime: "production; DAO on; E2E, global mocks, debug off",
        theme: capture.theme,
      })
    );
  }
}

function createStoredCreatedProposalRecords() {
  const content: DaoProposalContent = {
    schema: "yearn.dao.proposal.v1",
    markdown: "# Session proposal\n\nThis route preserves one receipt-derived identity.\n",
    discussionUrl: "https://gov.yearn.fi/t/session-proposal/1001",
    proposalType: "signal",
    createdBy: PROPOSER,
    createdAt: "2026-08-18T12:00:00.000Z",
    assets: [],
  };
  const contentIdentity = deriveDaoProposalContentIdentity(content);
  const identity: DaoDecodedProposeIdentity = {
    ref: { chainId: 1, votingAddress: VOTING, proposalId: CREATED_PROPOSAL_ID },
    proposer: PROPOSER,
    votingEpoch: 205n,
    contentDigest: contentIdentity.digest,
    script: "0x",
    blockTimestamp: 1_787_054_412,
    log: {
      blockNumber: 24_000_001n,
      blockHash: `0x${"cd".repeat(32)}` as Hex,
      timestamp: 1_787_054_412,
      transactionHash: `0x${"ab".repeat(32)}` as Hex,
      transactionIndex: 3,
      logIndex: 7,
    },
  };
  const proposal = createDaoAwaitingIndexProposal({
    content,
    contentCid: createDaoRawSha256Cid(contentIdentity.digest),
    discussion: {
      state: "verified",
      url: content.discussionUrl,
      title: "Session proposal discussion",
      categoryId: 5,
      category: "Proposals",
      categorySlugPath: ["proposals"],
    },
    identity,
  });
  const awaiting = serializeStoredRecord("awaiting_index", proposal);
  clearDaoCreatedProposals();
  persistDaoCreatedProposal({ stage: "awaiting_index", proposal });
  const indexedRecord = indexDaoCreatedProposal(proposal.ref, 1_787_054_424);
  if (!indexedRecord) throw new Error("Failed to build indexed proof record.");
  const indexed = serializeStoredRecord("indexed", indexedRecord.proposal);
  clearDaoCreatedProposals();
  return { awaiting, indexed };
}

function serializeStoredRecord(
  stage: "awaiting_index" | "indexed",
  proposal: ReturnType<typeof createDaoAwaitingIndexProposal>
) {
  return JSON.stringify({
    version: 1,
    records: [{ stage, proposal: serializeDaoProposalJson(proposal) }],
  });
}

async function assertProposalIdentity(page: Page, expected: string) {
  const technical = await openTechnicalDetails(page);
  await expect(technical.getByText(expected, { exact: true })).toBeVisible();
  expect(expected).toBe(
    serializeDaoProposalRef({
      chainId: 1,
      votingAddress: VOTING,
      proposalId: CREATED_PROPOSAL_ID,
    })
  );
}

async function openTechnicalDetails(page: Page) {
  const summary = page.getByText("Technical details", { exact: true });
  const details = summary.locator("xpath=ancestor::details");
  if (!(await details.getAttribute("open"))) await summary.click();
  await summary.focus();
  return details;
}

async function assertProductionChrome(page: Page) {
  expect(await page.evaluate(() => window.__TEST__)).toBeUndefined();
  await expect(page.getByRole("button", { name: /debug/i })).toHaveCount(0);
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
}

async function setPresentation(
  page: Page,
  options: {
    width: number;
    height: number;
    theme: "light" | "dark";
    reducedMotion: "default" | "reduce";
  }
) {
  await page.setViewportSize({ width: options.width, height: options.height });
  await page.emulateMedia({
    reducedMotion:
      options.reducedMotion === "reduce" ? "reduce" : "no-preference",
  });
  await setTheme(page, options.theme);
}

async function setTheme(page: Page, theme: "light" | "dark") {
  const toggle = page.getByRole("button", {
    name: theme === "dark" ? "Switch to Dark Mode" : "Switch to Light Mode",
  });
  if ((await toggle.count()) > 0) await toggle.click();
}

async function removeEvidenceChrome(page: Page) {
  await page.getByRole("button", { name: /debug/i }).evaluateAll((buttons) => {
    for (const button of buttons) button.remove();
  });
  if (BUILD_SHA === "dry-run") {
    await page.locator("nextjs-portal").evaluateAll((portals) => {
      for (const portal of portals) portal.remove();
    });
  }
  await expect(page.getByRole("button", { name: /debug/i })).toHaveCount(0);
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
}

async function captureScreenshot(
  page: Page,
  input: Omit<
    ScreenshotMetadata,
    | "buildSha"
    | "documentClientWidth"
    | "documentScrollWidth"
    | "route"
    | "textScale"
    | "viewport"
  >
): Promise<ScreenshotMetadata> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Screenshot viewport is unavailable.");
  const widths = await page.evaluate(() => ({
    documentClientWidth: document.documentElement.clientWidth,
    documentScrollWidth: document.documentElement.scrollWidth,
  }));
  expect(widths.documentScrollWidth).toBeLessThanOrEqual(
    widths.documentClientWidth
  );
  await mkdir(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({
    path: path.join(SCREENSHOT_DIRECTORY, input.file),
    animations: "disabled",
  });
  const url = new URL(page.url());
  return {
    ...input,
    ...widths,
    buildSha: BUILD_SHA,
    route: `${url.pathname}${url.search}`,
    textScale: "100%",
    viewport,
  };
}

async function writeMetadata(file: string, metadata: ScreenshotMetadata[]) {
  await mkdir(SCREENSHOT_DIRECTORY, { recursive: true });
  await writeFile(
    path.join(SCREENSHOT_DIRECTORY, file),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8"
  );
}

async function openAuthoring(page: Page) {
  await page.getByRole("button", { name: "Start proposal" }).click();
  await expect(
    page.getByRole("heading", { name: "Proposal details" })
  ).toBeVisible();
}

async function fillImmutableDraft(page: Page) {
  await page
    .getByRole("textbox", { name: "Forum discussion" })
    .fill("https://gov.yearn.fi/t/topic/1001");
  await page.getByRole("button", { name: "Validate topic" }).click();
  await expect(
    page.locator("#dao-forum-status").getByText("Forum topic accepted", {
      exact: true,
    })
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Proposal Markdown" })
    .fill(
      "# Evidence proposal\n\nExact evidence summary.\n\n## Specification\n\nCapture the receipt-derived identity without changing these bytes.\n"
    );
}

function requireBaseUrl(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("The Playwright project requires a string base URL.");
  }
  return value;
}
