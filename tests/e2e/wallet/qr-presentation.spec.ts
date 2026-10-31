import { expect, test, type Page } from "@playwright/test";

// Pairing URIs contain session material. Keep them out of failure artifacts.
// These options are file-scoped because trace selection creates a separate worker.
test.use({ trace: "off", screenshot: "off", video: "off" });

async function openConnect(page: Page) {
  await page.getByRole("button", { name: /^Connect wallet$/i }).first().click();
  await expect(page.getByRole("dialog", { name: "Connect wallet", exact: true })).toBeVisible();
}

test("retains the pending pairing when switching between branded and plain QR", async ({ page }) => {
  test.skip(process.env.WALLETCONNECT_LIVE_QA !== "true", "Opt in with WALLETCONNECT_LIVE_QA=true and a configured WalletConnect preview.");
  test.setTimeout(60_000);
  let sockets = 0;
  page.on("websocket", () => { sockets += 1; });
  await page.goto("/");
  await openConnect(page);
  const walletConnect = page.getByRole("button", { name: /^WalletConnect/ });
  await expect(walletConnect).toBeEnabled();
  await walletConnect.click();
  const dialog = page.getByRole("dialog", { name: "WalletConnect", exact: true });

  try {
    const image = dialog.getByRole("img", { name: "WalletConnect pairing QR code" });
    await expect.poll(async () => image.count().then((count) => count === 1 && image.isVisible()), {
      timeout: 40_000,
      message: "The configured relay supplies a visible pairing QR",
    }).toBe(true);
    await expect(dialog.getByTestId("wallet-pairing-qr-mark")).toBeVisible();
    await dialog.getByText("Connection link", { exact: true }).click();
    const uriNode = dialog.locator("details p");
    const uri = await uriNode.textContent();
    expect(/^wc:[a-f0-9]{64}@2\?/i.test(uri ?? "")).toBe(true);
    const imageSource = await image.getAttribute("src");
    const initialImage = await image.elementHandle();
    const initialSockets = sockets;

    // Detect even a brief replacement or removal of the displayed pairing.
    await dialog.evaluate((element) => {
      const initial = element.querySelector("details p")?.textContent;
      element.setAttribute("data-qa-pairing-changes", "0");
      const observer = new MutationObserver(() => {
        if (element.querySelector("details p")?.textContent !== initial) {
          const changes = Number(element.getAttribute("data-qa-pairing-changes"));
          element.setAttribute("data-qa-pairing-changes", String(changes + 1));
        }
      });
      observer.observe(element, { childList: true, characterData: true, subtree: true });
    });

    await dialog.getByRole("button", { name: "Use plain QR", exact: true }).click();
    await expect(dialog.getByTestId("wallet-pairing-qr-mark")).toHaveCount(0);
    expect(await image.getAttribute("src") === imageSource).toBe(true);
    expect(await uriNode.textContent() === uri).toBe(true);
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeEnabled();
    await expect(dialog.getByRole("status").filter({ hasText: "Waiting for your wallet…" })).toHaveCount(1);
    await expect(dialog.getByRole("button", { name: "Try again", exact: true })).toHaveCount(0);

    await dialog.getByRole("button", { name: "Use branded QR", exact: true }).click();
    await expect(dialog.getByTestId("wallet-pairing-qr-mark")).toBeVisible();
    expect(await image.getAttribute("src") === imageSource).toBe(true);
    expect(await uriNode.textContent() === uri).toBe(true);
    expect(await initialImage?.evaluate((element) => element.isConnected)).toBe(true);
    await expect(dialog).toHaveAttribute("data-qa-pairing-changes", "0");
    await expect(dialog.getByRole("status").filter({ hasText: "Waiting for your wallet…" })).toHaveCount(1);
    expect(sockets).toBe(initialSockets);

    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Connect wallet", exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "WalletConnect pairing QR code" })).toHaveCount(0);
  } finally {
    await page.getByRole("button", { name: "Close dialog", exact: true }).click({ timeout: 2_000 }).catch(() => {});
    // Prevent the failure reporter from saving a DOM snapshot with session material.
    await page.close();
  }
});
