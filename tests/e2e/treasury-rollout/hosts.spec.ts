import { expect, test } from "@playwright/test";
import example from "../../../docs/apps/treasury/examples/treasury.example.json";

const rollout = process.env.E2E_TREASURY_ROLLOUT;
test.skip(rollout !== "enabled" && rollout !== "disabled", "Run through test:e2e:treasury-rollout for a production build.");
const enabled = rollout === "enabled";

for (const { host, path } of [
  { host: "app.dao-ops.com", path: "/treasury" },
  { host: "treasury.yearn.fi", path: "/" },
  { host: "treasury-beta.dao-ops.com", path: "/" },
]) {
  test("treasury " + rollout + " on " + host, async ({ page, request, baseURL }) => {
    const headers = { host, "x-forwarded-host": host, "x-forwarded-proto": "http" };
    for (const method of ["GET", "HEAD"]) {
      const response = await request.fetch(new URL("/api/treasury-data", baseURL!).href, { method, headers });
      expect(response.status()).toBe(enabled ? 503 : 404);
      expect(response.headers()["cache-control"]).toBe("no-store");
    }

    const origin = "https://" + host;
    const feed = { ...example, mode: "live", generatedAt: Math.floor(Date.now() / 1000) };
    let feedRequests = 0;
    // HTTPS stays visible to the browser so production CSP is exercised. All
    // application traffic terminates at the isolated local HTTP test server.
    await page.route(origin + "/**", async route => {
      const target = new URL(route.request().url());
      if (target.pathname === "/api/treasury-data") {
        feedRequests++;
        if (enabled) {
          await route.fulfill({ json: feed });
          return;
        }
      }
      const response = await route.fetch({
        url: new URL(target.pathname + target.search, baseURL!).href,
        headers: { ...route.request().headers(), ...headers },
      });
      await route.fulfill({ response });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(origin + path);
    expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    expect(response?.headers()["content-security-policy"]).toContain("upgrade-insecure-requests");
    if (enabled) {
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: "Treasury", exact: true, level: 1 })).toBeVisible();
      await expect(page.getByTestId("treasury-portfolio-value")).toHaveText("$8,974,236");
      await expect(page.getByText("Example data", { exact: true })).toHaveCount(0);
      await page.getByRole("tab", { name: "Loans & allocations", exact: true }).click();
      await expect(page.getByRole("columnheader", { name: "Funded", exact: true })).toBeVisible();
      await page.reload();
      await expect(page.getByTestId("treasury-portfolio-value")).toHaveText("$8,974,236");
      expect(feedRequests).toBeGreaterThan(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    } else {
      expect(response?.status()).toBe(404);
      await expect(page.getByTestId("treasury-portfolio-value")).toHaveCount(0);
      expect(feedRequests).toBe(0);
    }
    await page.unrouteAll({ behavior: "wait" });
  });
}
