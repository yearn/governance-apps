import { expect, test } from "@playwright/test";
import { resetBridge, setYbcPerspective, waitForTestBridge } from "../utils";

for (const width of [360, 768, 1440]) {
  test(`YBC position states, distribution, and empty stake at ${width}px`, async ({ page }) => {
    await page.setViewportSize({width,height:1000});
    await page.goto("/ybc#members");
    await waitForTestBridge(page); await resetBridge(page); await setYbcPerspective(page,"member-ramping");
    await expect(page.getByRole("tab",{name:"Members",exact:true})).toHaveAttribute("aria-selected","true");
    const members=page.locator("#members");
    const row=(suffix:string)=>members.locator(`[data-member-address="0x000000000000000000000000000000000000${suffix}"]`);
    await expect(row("0101").getByText("No stake",{exact:true})).toBeVisible();
    await expect(row("0102").getByText(/Activating/)).toBeVisible();
    await expect(row("0102").locator("time")).toBeVisible();
    await expect(row("0103").getByText(/Unstaking/)).toBeVisible();
    await expect(row("0103").getByText(/Activating/)).toBeVisible();
    await expect(row("0104").getByText(/Unstaking/)).toBeVisible();
    await expect(members.getByRole("progressbar")).toHaveCount(0);
    // Check rendered geometry, including the simultaneous activation/withdrawal
    // state that previously stretched one badge and enlarged its row.
    const badges = await members.locator("[data-weight-state] .h-6").evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
    expect(badges.length).toBeGreaterThan(7);
    for (const height of badges) expect(height).toBe(24);
    if (width === 768) {
      const rowBox = (await row("0101").boundingBox())!;
      const metricBox = (await row("0101").locator("td").nth(1).boundingBox())!;
      expect(Math.abs(metricBox.width * 3 - rowBox.width)).toBeLessThanOrEqual(1);
    }
    if (width === 1440) {
      const heights = await members.locator("[data-member-address]").evaluateAll(elements => elements.map(el => el.getBoundingClientRect().height));
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
      const bar = page.getByRole("button", { name: "YBC share of DAO voting power: show breakdown" });
      const barBox = (await bar.boundingBox())!;
      const titleBox = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
      expect(barBox.x).toBe(titleBox.x);
      expect(barBox.width).toBeGreaterThan(1100);
    }
    await expect(page.locator("#proposals")).toBeHidden();
    await members.getByRole("button",{name:"Distribution",exact:true}).click();
    const chart=members.getByRole("group",{name:"Voting weight distribution",exact:true});
    const slice=chart.getByRole("button",{name:/alice-ybc.eth:/});
    await slice.focus();
    await expect(slice).toHaveAttribute("aria-pressed","true");
    await expect(members.getByText("Selected member")).toBeVisible();
    await members.getByRole("button",{name:"claire-ybc.eth, 0%",exact:true}).click();
    await expect(members.getByText("No active stake")).toBeVisible();
    await members.getByRole("button",{name:"Table",exact:true}).click();
    await page.evaluate(async()=>{
      await window.__TEST__?.patchYbcMember?.("0x1111111111111111111111111111111111111111",{weight:{rawStaked:"0",targetWeight:"0",effectiveWeight:"0",maturityBps:10000,maturesAt:1}});
    });
    const mine=members.locator('[data-member-address="0x1111111111111111111111111111111111111111"]');
    await expect(mine.getByText("No stake",{exact:true})).toBeVisible();
    await expect(mine.locator("time")).toHaveCount(0);
    const widths=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
    expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  });
}

test("tabs retain proposal state, support keyboard and browser history, and expose shared rewards", async({page})=>{
  await page.goto("/ybc");
  await waitForTestBridge(page);await resetBridge(page);
  const nav=page.getByRole("tablist",{name:"YBC sections"});
  await page.getByRole("tab",{name:/History/}).click();
  await nav.getByRole("tab",{name:"Members",exact:true}).click();
  await nav.getByRole("tab",{name:"Members",exact:true}).press("ArrowRight");
  await expect(nav.getByRole("tab",{name:"Rewards",exact:true})).toBeFocused();
  await expect(page.getByRole("link",{name:"View and claim rewards in stYFI"})).toHaveAttribute("href","/styfi?focus=rewards");
  await page.goBack();
  await expect(nav.getByRole("tab",{name:"Members",exact:true})).toHaveAttribute("aria-selected","true");
  await page.goBack();
  await expect(page.getByRole("tab",{name:/History/})).toHaveAttribute("aria-selected","true");
  await nav.getByRole("tab",{name:"Proposals",exact:true}).focus();
  await nav.getByRole("tab",{name:"Proposals",exact:true}).press("End");
  await expect(nav.getByRole("tab",{name:"Rewards",exact:true})).toBeFocused();
});

test("operator navigation moves focus into the proposals panel", async ({ page }) => {
  await page.goto("/ybc");
  await waitForTestBridge(page);
  await resetBridge(page);
  await setYbcPerspective(page, "operator");
  await page.getByRole("tab", { name: "Operator", exact: true }).click();
  const action = page.getByRole("button", { name: "Start add member flow" });
  await action.focus();
  await action.press("Enter");
  await expect(page.locator("#ybc-panel-proposals")).toBeFocused();
  await expect(page.getByRole("tab", { name: "Proposals", exact: true })).toHaveAttribute("aria-selected", "true");
});

test.describe("touch help", () => {
  test.use({ hasTouch: true, viewport: { width: 360, height: 900 } });
  test("opens and dismisses help within the viewport", async ({ page }) => {
    await page.goto("/ybc");
    await waitForTestBridge(page);
    await resetBridge(page);
    await page.getByRole("tab", { name: "Members", exact: true }).click();
    const help = [
      page.getByRole("button", { name: "About observer access" }),
      page.getByRole("button", { name: "About Available YBC voting power" }),
      page.getByRole("button", { name: "YBC share of DAO voting power: show breakdown" }),
      page.getByRole("button", { name: "About Total YBC weight" }),
      page.getByRole("button", { name: "About YBC share", exact: true }),
      page.getByRole("button", { name: "About Position", exact: true }),
      page.getByRole("button", { name: /Stake in withdrawal streams/ }).first(),
    ];
    for (const button of help) {
      await button.tap();
      await expect(button).toBeFocused();
      const tooltip = page.locator('[role="tooltip"]:visible');
      await expect(tooltip).toHaveCount(1);
      const box = await tooltip.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(360);
      await page.keyboard.press("Escape");
      await expect(tooltip).toHaveCount(0);
      await button.tap();
      await expect(tooltip).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(tooltip).toHaveCount(0);
    }
  });
});

test("member table reflows with enlarged text on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 1000 });
  await page.goto("/ybc#members");
  await waitForTestBridge(page); await resetBridge(page);
  await expect(page.getByRole("table", { name: "Members" })).toBeVisible();
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  const geometry = await page.evaluate(() => {
    const table = document.querySelector("#members table")!;
    return { page: document.documentElement.scrollWidth, table: table.scrollWidth, width: table.clientWidth };
  });
  expect(geometry.page).toBeLessThanOrEqual(360);
  // Chromium can round scrollWidth up one pixel for a collapsed-border table.
  expect(geometry.table).toBeLessThanOrEqual(geometry.width + 1);
  const mixed = page.locator('[data-member-address="0x0000000000000000000000000000000000000103"]');
  await expect(mixed.getByText(/Activating/)).toBeVisible();
  await expect(mixed.getByText(/Unstaking/)).toBeVisible();
});
