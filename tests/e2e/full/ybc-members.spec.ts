import { expect, test } from "@playwright/test";
import { resetBridge, setYbcPerspective, waitForTestBridge } from "../utils";

for (const width of [360, 1440]) {
  test(`YBC member stake states and empty wallet at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/ybc");
    await waitForTestBridge(page);
    await resetBridge(page);
    await setYbcPerspective(page, "member-ramping");
    const members = page.locator("#members");
    const noStake = members.locator('[data-member-address="0x0000000000000000000000000000000000000101"]');
    const freshStake = members.locator('[data-member-address="0x0000000000000000000000000000000000000102"]');
    const partialStake = members.locator('[data-member-address="0x0000000000000000000000000000000000000103"]');
    await expect(noStake.getByText("0 YFI staked. No weight to ramp.")).toBeVisible();
    await expect(noStake.getByRole("progressbar")).toHaveCount(0);
    await expect(freshStake.getByText("0% active")).toBeVisible();
    await expect(freshStake.getByText("80 weight still ramping")).toBeVisible();
    await expect(partialStake.getByText("75% active")).toBeVisible();
    await expect(partialStake.getByText("50 weight still ramping")).toBeVisible();
    await expect(partialStake.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "75");
    await expect(members.getByText("100% active")).toHaveCount(2);
    await expect(members.getByRole("table")).toBeVisible();
    const widths = await members.evaluate((node) => ({ client: node.clientWidth, scroll: node.scrollWidth, doc: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    expect(widths.doc).toBeLessThanOrEqual(widths.viewport);
    await members.getByRole("button", { name: /Cards/ }).click();
    await expect(members.getByRole("table")).toHaveCount(0);
    await expect(noStake.getByText("0 YFI staked. No weight to ramp.")).toBeVisible();
    await expect(partialStake.getByText("75% active")).toBeVisible();
    await members.getByRole("button", { name: /Table/ }).click();
    await page.evaluate(async () => {
      await window.__TEST__?.patchYbcMember?.("0x1111111111111111111111111111111111111111", {
        weight: { rawStaked: "0", targetWeight: "0", effectiveWeight: "0", maturityBps: 10000, maturesAt: 1 },
      });
    });
    const overview = page.locator("#overview");
    await expect(overview.getByText("0 YFI staked. No weight to ramp.")).toBeVisible();
    await expect(overview.getByRole("progressbar")).toHaveCount(0);
    await expect(overview.getByText(/% active|Full weight on/)).toHaveCount(0);
  });
}
