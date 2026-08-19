import { expect, test, type Locator, type Page } from "@playwright/test";
import { DAO_EXECUTOR_VALID_SCRIPT_VECTORS } from "@/lib/clients/dao";
import { resetBridge, waitForTestBridge } from "../utils";

test.beforeEach(async ({ page }) => {
  await page.goto("/dao/propose");
  await waitForTestBridge(page);
  await resetBridge(page);
  await page.evaluate(async () => {
    await window.__TEST__?.setDaoProposerState?.("eligible");
    await window.__TEST__?.setDaoAuthoringState?.("valid-signal");
  });
});

test("authors, reviews, publishes, and submits a Signal proposal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openAuthoring(page);
  await fillImmutableDraft(page, 1001);

  await page.getByRole("button", { name: "Review proposal" }).click();
  await expect(
    page.getByRole("heading", { name: "Review the exact proposal" })
  ).toBeVisible();
  await expect(page.getByText("No executable actions")).toBeVisible();
  await expect(page.getByText("Exact proposal title")).toBeVisible();
  await expect(page.getByText("Exact summary")).toBeVisible();
  await expect(page.getByText("Exact specification")).toBeVisible();
  await expect(page.getByText("0x", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Backend decoding and simulation follow submission/i)
  ).toBeVisible();

  const publish = page.getByRole("button", {
    name: "Publish proposal content",
  });
  await expectMinimumHitArea(publish);
  await page
    .getByRole("checkbox", { name: /I reviewed the exact immutable content/i })
    .check();
  await publish.click();

  await expect(page.getByText("Proposal content published")).toBeVisible();
  await expect(page.getByText("The wallet step has not started yet.", { exact: false })).toBeVisible();
  const create = page.getByRole("button", {
    name: "Create onchain proposal",
  });
  await expectMinimumHitArea(create);
  await create.click();
  await expect(page.getByText("Proposal transaction submitted")).toBeVisible();
  await expect(
    page.getByText(/Waiting for proposal indexing and backend decoding/i)
  ).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("authors an executable proposal from the full raw script", async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.evaluate(async () => {
    await window.__TEST__?.setDaoAuthoringState?.("valid-script");
  });
  await openAuthoring(page);

  const executable = page.getByRole("radio", {
    name: /^Executable/i,
  });
  await expect(executable).toBeChecked();
  const script = page.getByRole("textbox", { name: "Full Executor script" });
  await expect(script).toHaveValue(
    DAO_EXECUTOR_VALID_SCRIPT_VECTORS.twoCalls.script
  );
  const scriptSection = page.getByRole("region", {
    name: "Execution script",
  });
  await expect(scriptSection.getByText("Script structure is valid")).toBeVisible();
  await expect(scriptSection.getByText("Call 1")).toBeVisible();
  await expect(scriptSection.getByText("Call 2")).toBeVisible();
  await expect(scriptSection.getByText(/\b(safe|verified)\b/i)).toHaveCount(0);

  await fillImmutableDraft(page, 1005);
  await page.getByRole("button", { name: "Review proposal" }).click();
  await expect(page.getByText("Script structure is valid")).toBeVisible();
  await expect(
    page.getByText(DAO_EXECUTOR_VALID_SCRIPT_VECTORS.twoCalls.script)
  ).toBeVisible();
  await expect(page.getByText("Script hash", { exact: true })).toBeVisible();
  await expect(page.getByText("2", { exact: true }).first()).toBeVisible();

  await page
    .getByRole("checkbox", { name: /I reviewed the exact immutable content/i })
    .check();
  await page
    .getByRole("button", { name: "Publish proposal content" })
    .click();
  await expect(page.getByText("Proposal content published")).toBeVisible();
  await page
    .getByRole("button", { name: "Create onchain proposal" })
    .click();
  await expect(page.getByText("Proposal transaction submitted")).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("keeps the exact review locked and announces asynchronous progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openAuthoring(page);

  const specification = page.getByRole("textbox", { name: "Specification" });
  const placeholderColor = await specification.evaluate(
    (element) => getComputedStyle(element, "::placeholder").color
  );
  expect(placeholderColor).toBe("rgb(82, 82, 82)");

  const exactTitle = "  Exact   proposal title  ";
  await fillImmutableDraft(page, 1001, exactTitle);
  const acceptedTopic = page.getByRole("status").filter({
    hasText: "Forum topic accepted",
  });
  await expect(acceptedTopic.getByText("Fund protocol research")).toBeVisible();
  await expect(acceptedTopic.getByText("Proposals · ID 5")).toBeVisible();
  await expect(acceptedTopic.getByText("yearn-contributor")).toBeVisible();
  await expect(acceptedTopic.locator("time")).toHaveAttribute(
    "datetime",
    "2024-08-01T00:00:00.000Z"
  );

  await page.getByRole("button", { name: "Review proposal" }).click();
  const immutable = page.getByRole("region", { name: "Immutable content" });
  const titleValue = immutable
    .getByText("Title", { exact: true })
    .locator("xpath=following-sibling::div");
  await expect(titleValue).toHaveText(exactTitle, { useInnerText: false });
  expect(await titleValue.evaluate((element) => element.textContent)).toBe(
    exactTitle
  );
  expect(
    await titleValue.evaluate((element) => (element as HTMLElement).innerText)
  ).toBe(exactTitle);
  expect(
    await titleValue.evaluate((element) => getComputedStyle(element).whiteSpace)
  ).toBe("pre-wrap");

  const forum = page.getByRole("region", { name: "Forum topic" });
  await expect(forum.getByText("Fund protocol research")).toBeVisible();
  await expect(forum.getByText("Proposals · ID 5")).toBeVisible();
  await expect(forum.getByText("yearn-contributor")).toBeVisible();
  await expect(forum.locator("time")).toHaveAttribute(
    "datetime",
    "2024-08-01T00:00:00.000Z"
  );
  const forumLink = forum.getByRole("link", { name: /opens in a new tab/i });
  await expect(forumLink).toHaveAttribute("target", "_blank");
  await expectMinimumHitArea(forumLink);

  await page.clock.install();
  await page
    .getByRole("checkbox", { name: /I reviewed the exact immutable content/i })
    .check();
  await page
    .getByRole("button", { name: "Publish proposal content" })
    .click();

  const publishing = page.getByRole("button", {
    name: "Publishing proposal content",
  });
  await expect(publishing).toBeDisabled();
  await expect(publishing).toHaveAttribute("aria-busy", "true");
  const publicationSpinner = publishing.locator("svg");
  await expect(publicationSpinner).toHaveAttribute("aria-hidden", "true");
  expect(
    await publicationSpinner.evaluate(
      (element) => getComputedStyle(element).animationName
    )
  ).toBe("none");
  await expect(
    page.getByRole("status").filter({ hasText: "Publishing proposal content" })
  ).toBeVisible();

  const edit = page.getByRole("button", { name: "Edit proposal" });
  await expect(edit).toBeDisabled();
  await edit.evaluate((element) => {
    element.removeAttribute("disabled");
    (element as HTMLButtonElement).click();
  });
  await expect(
    page.getByRole("heading", { name: "Review the exact proposal" })
  ).toBeVisible();

  await page.clock.fastForward(200);
  await expect(page.getByText("Proposal content published")).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit proposal" })).toBeDisabled();
  expect(await titleValue.evaluate((element) => element.textContent)).toBe(
    exactTitle
  );

  await page.getByRole("button", { name: "Create onchain proposal" }).click();
  const waiting = page.getByRole("button", { name: "Waiting for wallet" });
  await expect(waiting).toBeDisabled();
  await expect(waiting).toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByRole("status").filter({ hasText: "Waiting for wallet" })
  ).toBeVisible();
  await page.clock.fastForward(250);
  await expect(page.getByText("Proposal transaction submitted")).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("starts authoring with keyboard focus below the sticky header", async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 1280, height: 560 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/dao/propose");
    await waitForTestBridge(page);
    await resetBridge(page);
    await page.evaluate(async () => {
      await window.__TEST__?.setDaoProposerState?.("eligible");
      await window.__TEST__?.setDaoAuthoringState?.("valid-signal");
    });

    const start = page.getByRole("button", { name: "Start proposal" });
    await start.focus();
    await page.keyboard.press("Enter");

    const heading = page.getByRole("heading", { name: "Create a proposal" });
    await expect(heading).toBeFocused();
    await expect(heading).toHaveAttribute("tabindex", "-1");
    const placement = await heading.evaluate((element) => ({
      bottom: element.getBoundingClientRect().bottom,
      headerBottom:
        document.querySelector("header")?.getBoundingClientRect().bottom ?? 0,
      top: element.getBoundingClientRect().top,
      viewportHeight: window.innerHeight,
    }));
    expect(placement.top).toBeGreaterThanOrEqual(placement.headerBottom);
    expect(placement.bottom).toBeLessThanOrEqual(placement.viewportHeight);
    await expectNoDocumentOverflow(page);
  }
});

test("shows deterministic forum validation failures without clearing content", async ({
  page,
}) => {
  await openAuthoring(page);
  const forum = page.getByRole("textbox", { name: "Forum discussion" });
  const validate = page.getByRole("button", { name: "Validate topic" });

  for (const [topicId, code] of [
    [404, "TOPIC_NOT_FOUND"],
    [2002, "WRONG_CATEGORY"],
    [503, "FORUM_UNAVAILABLE"],
  ] as const) {
    await forum.fill(`https://gov.yearn.fi/t/topic/${topicId}`);
    await validate.click();
    await expect(page.getByText(code)).toBeVisible();
    await expect(forum).toHaveValue(
      `https://gov.yearn.fi/t/topic/${topicId}`
    );
  }
});

test("preserves the draft and does not start the wallet step after publication failure", async ({
  page,
}) => {
  await openAuthoring(page);
  await fillImmutableDraft(page, 1002);
  await reviewAndPublish(page);

  await expect(
    page.getByText("Proposal content was not published")
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create onchain proposal" })
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Edit proposal" }).click();
  await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(
    "Exact proposal title"
  );
  await expect(page.getByRole("textbox", { name: "Summary" })).toHaveValue(
    "Exact summary"
  );
  await expect(
    page.getByRole("textbox", { name: "Specification" })
  ).toHaveValue("Exact specification");
  await expect(
    page.getByRole("textbox", { name: "Forum discussion" })
  ).toHaveValue("https://gov.yearn.fi/t/improve-treasury-reporting/1002");
});

test("keeps publication after wallet rejection and proposal revert", async ({
  page,
}) => {
  for (const [topicId, failureTitle] of [
    [1003, "Wallet request cancelled"],
    [1004, "Proposal creation failed"],
  ] as const) {
    await page.goto("/dao/propose");
    await waitForTestBridge(page);
    await page.evaluate(async () => {
      await window.__TEST__?.setDaoProposerState?.("eligible");
      await window.__TEST__?.setDaoAuthoringState?.("valid-signal");
    });
    await openAuthoring(page);
    await fillImmutableDraft(page, topicId);
    await reviewAndPublish(page);
    await expect(page.getByText("Proposal content published")).toBeVisible();
    await page
      .getByRole("button", { name: "Create onchain proposal" })
      .click();
    await expect(page.getByText(failureTitle)).toBeVisible();
    await expect(page.getByText("Proposal content published")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Retry proposal creation" })
    ).toBeEnabled();
  }
});

test("renders every mutable proposer blocker and the shared capacity rule", async ({
  page,
}) => {
  for (const [state, reason] of [
    ["blacklisted", "This account is blocked from creating proposals."],
    ["insufficient-weight", "Proposal weight is below the current minimum."],
    ["cooldown", "The proposal cooldown is still active."],
    ["capacity-full", "Proposal capacity is full."],
  ] as const) {
    await page.evaluate(async (nextState) => {
      await window.__TEST__?.setDaoProposerState?.(nextState);
    }, state);
    await expect(page.getByText(reason, { exact: state !== "capacity-full" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Draft proposal" })).toBeVisible();
  }

  await page.getByRole("button", { name: "Draft proposal" }).click();
  await expect(
    page.getByText(/system-wide capacity, not a per-user quota/i)
  ).toBeVisible();
  await expect(page.getByText("64 / 64")).toBeVisible();
});

async function openAuthoring(page: Page) {
  const start = page.getByRole("button", {
    name: /^(Start|Draft) proposal$/,
  });
  await expect(start).toBeVisible();
  await start.click();
  await expect(
    page.getByRole("heading", { name: "Create a proposal" })
  ).toBeVisible();
}

async function fillImmutableDraft(
  page: Page,
  topicId: number,
  title = "Exact proposal title"
) {
  await page
    .getByRole("textbox", { name: "Forum discussion" })
    .fill(`https://gov.yearn.fi/t/topic/${topicId}`);
  await page.getByRole("button", { name: "Validate topic" }).click();
  await expect(page.getByText("Forum topic accepted")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Title" })
    .fill(title);
  await page
    .getByRole("textbox", { name: "Summary" })
    .fill("Exact summary");
  await page
    .getByRole("textbox", { name: "Specification" })
    .fill("Exact specification");
}

async function reviewAndPublish(page: Page) {
  await page.getByRole("button", { name: "Review proposal" }).click();
  await page
    .getByRole("checkbox", { name: /I reviewed the exact immutable content/i })
    .check();
  await page
    .getByRole("button", { name: "Publish proposal content" })
    .click();
}

async function expectMinimumHitArea(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(40);
  expect(box!.height).toBeGreaterThanOrEqual(40);
}

async function expectNoDocumentOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth);
}
