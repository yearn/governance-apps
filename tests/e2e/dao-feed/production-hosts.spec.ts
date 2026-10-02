import { expect, test } from "@playwright/test";

for (const { host, prefix } of [
  { host: "app.dao-ops.com", prefix: "/dao" },
  { host: "dao.yearn.fi", prefix: "" },
]) {
  for (const width of [1280, 390]) {
    test(`production navigation and API requests on ${host} at ${width}px`, async ({ page, baseURL }) => {
      test.skip(process.env.E2E_DAO_TEST_UPSTREAM !== "true");
      const origin = new URL(baseURL!);
      origin.hostname = host;
      origin.protocol = "https:";
      // Terminate the test's HTTPS browser requests at the isolated HTTP server.
      // Keep the production CSP (including upgrade-insecure-requests), response
      // bodies, and host routing intact; no public hostname receives traffic.
      await page.route(`${origin.origin}/**`, async route => {
        const target = new URL(route.request().url());
        const response = await route.fetch({
          url: new URL(target.pathname + target.search, baseURL!).href,
          headers: { ...route.request().headers(), host: origin.host,
            "x-forwarded-host": origin.host, "x-forwarded-proto": "http" },
        });
        await route.fulfill({ response });
      });
      const root = prefix || "/";
      const errors: string[] = [];
      const apiRequests: string[] = [];
      const transactions: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("request", request => {
        if (new URL(request.url()).pathname.startsWith("/api/dao-")) apiRequests.push(request.url());
        if (/eth_sendTransaction|eth_sendRawTransaction/.test(request.postData() ?? "")) transactions.push(request.url());
      });
      await page.clock.setFixedTime(new Date("2026-09-08T12:00:00Z"));
      await page.setViewportSize({ width, height: 900 });
      const feed = page.waitForResponse(response => new URL(response.url()).pathname === "/api/dao-data");
      const documentResponse = await page.goto(new URL(root, origin).href);
      expect(documentResponse?.headers()["content-security-policy"]).toContain("upgrade-insecure-requests");
      expect((await feed).status()).toBe(200);
      await expect(page.getByRole("heading", { name: "Proposals", exact: true })).toBeVisible();
      const proposal = page.getByRole("link", { name: /Open proposal #0:/ });
      await expect(proposal).toHaveAttribute("href", `${prefix}/proposals/0?from=active&chain=1&voting=0x1111111111111111111111111111111111111111`);
      await proposal.click();
      await expect(page).toHaveURL(new RegExp(`${prefix}/proposals/0\\?`));
      await expect(page.getByRole("heading", { name: "Proposal content" })).toBeVisible();
      await page.reload();
      await expect(page.getByRole("heading", { name: "Proposal content" })).toBeVisible();
      const back = page.getByRole("navigation", { name: "Proposal hierarchy" })
        .getByRole("link", { name: "Proposals", exact: true });
      await expect(back).toHaveAttribute("href", root);
      await back.click();
      const create = page.getByRole("link", { name: "Create proposal", exact: true }).last();
      await expect(create).toHaveAttribute("href", `${prefix}/propose`);
      await create.click();
      await expect(page).toHaveURL(new URL(`${prefix}/propose`, origin).href);
      await expect(page.getByRole("heading", { name: "Create proposal", level: 1, exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Wallet not connected" })).toBeVisible();
      if (width === 390) {
        await page.getByRole("button", { name: "Open navigation menu" }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.getByRole("button", { name: "Close navigation menu" }).click();
      }
      expect(apiRequests.length).toBeGreaterThan(0);
      for (const request of apiRequests) expect(new URL(request).origin).toBe(origin.origin);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(transactions).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}
