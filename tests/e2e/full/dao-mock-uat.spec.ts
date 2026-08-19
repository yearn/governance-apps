import { expect, test } from "@playwright/test";
import type { DaoMockFixtureId } from "@/lib/clients/dao";
import { resetBridge, waitForTestBridge } from "../utils";

const PROPOSAL_FIXTURES = [
  {
    fixture: "discussion",
    proposalId: 1,
    title: "Adopt the contributor budget policy",
    status: "Discussion",
  },
  {
    fixture: "voting",
    proposalId: 2,
    title: "Fund protocol research",
    status: "Voting",
  },
  {
    fixture: "late-voting",
    proposalId: 3,
    title: "Renew security operations",
    status: "Voting",
  },
  {
    fixture: "approved-signal",
    proposalId: 4,
    title: "Approve the contributor charter",
    status: "Approved",
  },
  {
    fixture: "approved-executable",
    proposalId: 5,
    title: "Update treasury policy",
    status: "Approved",
  },
  {
    fixture: "executed",
    proposalId: 6,
    title: "Execute the treasury migration",
    status: "Executed",
  },
  {
    fixture: "rejected",
    proposalId: 7,
    title: "Increase the operations budget",
    status: "Rejected",
  },
  {
    fixture: "no-votes",
    proposalId: 8,
    title: "Record a proposal with no votes",
    status: "Rejected",
  },
  {
    fixture: "expired",
    proposalId: 9,
    title: "Expired executable proposal",
    status: "Expired",
  },
  {
    fixture: "retracted",
    proposalId: 10,
    title: "Retracted contributor request",
    status: "Retracted",
  },
  {
    fixture: "flagged",
    proposalId: 11,
    title: "Malformed proposal",
    status: "Flagged",
  },
  {
    fixture: "early-veto",
    proposalId: 12,
    title: "Vetoed before participation",
    status: "Vetoed",
  },
  {
    fixture: "post-vote-veto",
    proposalId: 13,
    title: "Vetoed after participation began",
    status: "Vetoed",
  },
  {
    fixture: "content-unavailable",
    proposalId: 14,
    title: "Proposal #14",
    status: "Voting",
  },
  {
    fixture: "content-invalid",
    proposalId: 15,
    title: "Proposal #15",
    status: "Voting",
  },
  {
    fixture: "analysis-pending",
    proposalId: 16,
    title: "Proposal awaiting analysis",
    status: "Voting",
  },
  {
    fixture: "partial-decode",
    proposalId: 17,
    title: "Proposal with a partially decoded script",
    status: "Approved",
  },
  {
    fixture: "simulation-failed",
    proposalId: 18,
    title: "Proposal whose historical simulation failed",
    status: "Approved",
  },
  {
    fixture: "hash-mismatch",
    proposalId: 19,
    title: "Proposal with a script hash mismatch",
    status: "Approved",
  },
  {
    fixture: "direct-proposal",
    proposalId: 20,
    title: "Direct-contract proposal",
    status: "Discussion",
  },
  {
    fixture: "guarded-execution",
    proposalId: 21,
    title: "Guarded executable proposal",
    status: "Approved",
  },
  {
    fixture: "permissionless-execution",
    proposalId: 22,
    title: "Permissionless executable proposal",
    status: "Approved",
  },
] as const satisfies readonly {
  fixture: DaoMockFixtureId;
  proposalId: number;
  status: string;
  title: string;
}[];

test("keeps the deterministic account presentation consistent across shared and DAO routes", async ({
  page,
}) => {
  await page.goto("/dao");
  await waitForTestBridge(page);
  await resetBridge(page);

  await expect(page.getByText("22 proposals are available.")).toBeVisible();
  const walletButton = page.getByRole("button", {
    name: /0xf39f\.\.\.2266/i,
  });
  await expect(walletButton).toBeVisible();
  const walletButtonBox = await walletButton.boundingBox();
  expect(walletButtonBox).not.toBeNull();
  expect(walletButtonBox!.height).toBeGreaterThanOrEqual(40);
  await expect(
    page.getByRole("button", { name: "Connect wallet" })
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Wallet not connected" })
  ).toHaveCount(0);

  await page.goto("/dao/proposals/2");
  await expect(page.getByText("Voting weight", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Yea" })).toBeEnabled();
  await expect(
    page.getByRole("heading", { name: "Wallet not connected" })
  ).toHaveCount(0);

  await page.goto("/dao/propose");
  await expect(
    page.getByText("Your wallet can create a proposal", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Wallet not connected" })
  ).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dao");
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const mobileWalletButton = page.getByRole("button", {
    name: /0xf39f\.\.\.2266/i,
  });
  await expect(mobileWalletButton).toBeVisible();
  const mobileWalletButtonBox = await mobileWalletButton.boundingBox();
  expect(mobileWalletButtonBox).not.toBeNull();
  expect(mobileWalletButtonBox!.height).toBeGreaterThanOrEqual(44);
  await expect(
    page.getByRole("button", { name: "Connect Wallet" })
  ).toHaveCount(0);
});

for (const [range, fixtures] of [
  ["1–11", PROPOSAL_FIXTURES.slice(0, 11)],
  ["12–22", PROPOSAL_FIXTURES.slice(11)],
] as const) {
  test(`reaches deterministic proposal fixtures ${range} through the shared bridge`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dao");
    await waitForTestBridge(page);
    await resetBridge(page);

    for (const fixture of fixtures) {
      await page.evaluate(async (fixtureId) => {
        await window.__TEST__?.setDaoFixture?.(fixtureId);
      }, fixture.fixture);
      await page.goto(`/dao/proposals/${fixture.proposalId}`);

      await expect(
        page.getByRole("heading", { name: fixture.title, level: 2 })
      ).toBeVisible();
      await expect(
        page.getByText(fixture.status, { exact: true }).first()
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Your action" })
      ).toBeVisible();
      await expectNoDocumentOverflow(page, fixture.fixture);
    }
  });
}

test("reaches the non-visual proposal capacity fixture through the shared bridge", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dao/propose");
  await waitForTestBridge(page);
  await resetBridge(page);
  await page.evaluate(async () => {
    await window.__TEST__?.setDaoFixture?.("proposal-capacity-full");
  });

  await expect(
    page.getByText("Proposal capacity is full.", { exact: true }).first()
  ).toBeVisible();
  await expect(page.getByText("64 / 64")).toBeVisible();
  await expectNoDocumentOverflow(page, "proposal-capacity-full");
});

test("keeps core review and authoring surfaces contained at 200% text size", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1_280, height: 900 });

  for (const route of ["/dao", "/dao/proposals/17", "/dao/propose"]) {
    await page.goto(route);
    await waitForTestBridge(page);
    await page.addStyleTag({
      content: "html { font-size: 200% !important; }",
    });
    await expect(page.locator("main")).toBeVisible();
    await expectNoDocumentOverflow(page, `${route} at 200% text size`);
  }
});

async function expectNoDocumentOverflow(
  page: import("@playwright/test").Page,
  context: string
) {
  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(
    widths.scrollWidth,
    `${context} should remain contained inside the viewport`
  ).toBeLessThanOrEqual(widths.clientWidth + 1);
}
