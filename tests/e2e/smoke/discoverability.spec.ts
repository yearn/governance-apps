import { expect, test } from "@playwright/test";

test("publishes canonical metadata and nonce-protected WebSite JSON-LD", async ({
  page,
}) => {
  const response = await page.goto("/styfi");
  expect(response).not.toBeNull();

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://styfi.yearn.fi"
  );
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    "content",
    "https://styfi.yearn.fi"
  );

  const jsonLdScript = page.locator('script[type="application/ld+json"]');
  await expect(jsonLdScript).toHaveCount(1);

  const jsonLd = JSON.parse((await jsonLdScript.textContent()) ?? "{}");
  expect(jsonLd).toMatchObject({
    "@type": "WebSite",
    url: "https://styfi.yearn.fi",
    name: "stYFI",
  });

  const nonce = await jsonLdScript.evaluate(
    (element) => (element as HTMLScriptElement).nonce
  );
  expect(nonce).not.toBe("");
  expect(response?.headers()["content-security-policy"]).toContain(
    `'nonce-${nonce}'`
  );
});

test("scopes machine-readable discovery files to the approved yearn.fi host", async ({
  request,
}) => {
  const productionHeaders = {
    "x-forwarded-host": "styfi.yearn.fi",
  };
  const robotsResponse = await request.get("/robots.txt", {
    headers: productionHeaders,
  });
  expect(robotsResponse.ok()).toBe(true);
  const robots = await robotsResponse.text();
  expect(robots).toContain("Sitemap: https://styfi.yearn.fi/sitemap.xml");
  expect(robots).not.toContain("/_next/");
  expect(robots).not.toContain("dao-ops.com");

  const sitemapResponse = await request.get("/sitemap.xml", {
    headers: productionHeaders,
  });
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain("<loc>https://styfi.yearn.fi</loc>");
  expect(sitemap).not.toContain("veyfi.yearn.fi");
  expect(sitemap).not.toContain("https://yearn.fi</loc>");

  const llmsResponse = await request.get("/llms.txt", {
    headers: productionHeaders,
  });
  expect(llmsResponse.ok()).toBe(true);
  expect(llmsResponse.headers()["content-type"]).toContain("text/plain");
  const llms = await llmsResponse.text();
  expect(llms).toContain("# stYFI");
  expect(llms).toContain("[Open stYFI](https://styfi.yearn.fi)");
  expect(llms).not.toContain("dao-ops.com");

  const internalRobotsResponse = await request.get("/robots.txt", {
    headers: {
      "x-forwarded-host": "app.dao-ops.com",
    },
  });
  expect(internalRobotsResponse.ok()).toBe(true);
  expect(internalRobotsResponse.headers()["x-robots-tag"]).toBe(
    "noindex, nofollow"
  );
  expect(await internalRobotsResponse.text()).not.toContain("Sitemap:");

  const internalLlmsResponse = await request.get("/llms.txt", {
    headers: {
      "x-forwarded-host": "app.dao-ops.com",
    },
  });
  expect(internalLlmsResponse.status()).toBe(404);
  expect(internalLlmsResponse.headers()["x-robots-tag"]).toBe(
    "noindex, nofollow"
  );
});
