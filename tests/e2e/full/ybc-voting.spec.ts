import { expect, test } from "@playwright/test";
import { resetBridge, setYbcPerspective, waitForTestBridge } from "../utils";

for (const width of [360, 1440]) {
  test(`YBC voting and record at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/ybc");
    await waitForTestBridge(page);
    await resetBridge(page);
    await setYbcPerspective(page, "member-ramping");
    await expect(page.getByRole("heading", { name: "Your voting weight" })).toBeVisible();
    const proposal = page.getByRole("article", { name: /YBC-7/ });
    await expect(proposal).not.toHaveAttribute("open");
    await expect(proposal.getByText("55% Yea").first()).toBeVisible();
    await expect(proposal.getByText("Your vote is needed")).toBeVisible();
    await proposal.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(proposal).toHaveAttribute("open", "");
    await expect(proposal.getByRole("region", { name: "Voting record" })).toBeVisible();
    await proposal.getByRole("button", { name: "Vote nay", exact: true }).click();
    await expect(proposal.getByText("You voted nay")).toBeVisible();
    await expect(proposal.getByRole("button", { name: "Vote nay", exact: true })).toHaveCount(0);
    await expect(proposal.getByRole("table", { name: "Voting record" }).getByRole("row")).toHaveCount(4);
    await proposal.getByRole("searchbox", { name: "Search voters" }).fill("no-such-voter");
    await expect(proposal.getByText("No voters match your search.")).toBeVisible();
    await proposal.getByRole("searchbox", { name: "Search voters" }).fill("");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    await proposal.screenshot({ path: test.info().outputPath(`ybc-voting-${width}.png`), animations: "disabled" });
    await page.getByRole("tab", { name: /History/ }).click();
    await expect(page.getByRole("article", { name: /YBC-7/ })).toHaveCount(0);
    await page.getByRole("searchbox", { name: "Search proposals" }).fill("YBC-4");
    await expect(page.getByRole("article")).toHaveCount(1);
    await page.getByRole("article", { name: /YBC-4/ }).locator("summary").click();
    await expect(page.getByText("The execution window has expired. Start a new proposal instead.")).toBeVisible();
  });
}

test("a history deep link opens the correct filter and can be collapsed", async ({ page }) => {
  await page.goto("/ybc?proposal=4#proposals");
  await expect(page.getByRole("tab", { name: /History/ })).toHaveAttribute("aria-selected", "true");
  const proposal = page.getByRole("article", { name: /YBC-4/ });
  await expect(proposal).toHaveAttribute("open", "");
  await proposal.locator("summary").click();
  await expect(proposal).not.toHaveAttribute("open");
  await page.getByRole("tab", { name: /Active/ }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: /^All/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: /^All/ })).toBeFocused();
});
