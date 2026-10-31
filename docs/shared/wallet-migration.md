# Wallet migration

Issue: [#123](https://github.com/yearn/governance-apps/issues/123).

## Decision

Use app-owned wallet controls with Wagmi 3.7.9. Keep official injected and Safe connectors. Use Universal Provider 2.26.0 behind a small app-owned connector.

The migration removes RainbowKit and Reown AppKit. WalletConnect remains the protocol for QR and mobile pairing. The existing RPC transports and shared transaction pipeline remain in use.

The selected versions passed the seven-day release-age rule on October 31, 2026. Safe uses provider 0.18.6 and SDK 9.1.0. The local QR encoder is qr 0.7.2.

The lockfile has 1,089 package entries, excluding its root record. The previous lockfile has 1,423 entries. The new tree has no RainbowKit, Reown, Coinbase, Base, Solana, or Ethereum Provider packages. These counts do not measure browser size or application security.

### Alternatives

- RainbowKit 2.2.11 retains the Wagmi 2 maintenance constraint.
- ConnectKit 1.9.2 requires Wagmi 2 and React 17/18.
- Reown AppKit adds broader wallet, account, and payment UI.
- Wagmi's standard WalletConnect connector requires Ethereum Provider, which retains AppKit.
- Direct Sign Client saves only four further entries in the resolution trial. It requires more provider code.
- Removing WalletConnect also removes required QR and mobile pairing.

The application owns the wallet interface and connector adapter. The official SDK still owns the protocol, encryption, relay, and session storage.

### Current sources

- [Wagmi 3 migration](https://wagmi.sh/react/guides/migrate-from-v2-to-v3)
- [Custom connectors](https://wagmi.sh/dev/creating-connectors)
- [Safe connector](https://wagmi.sh/react/api/connectors/safe)
- [Universal Provider source pin](https://github.com/WalletConnect/walletconnect-monorepo/tree/63094dcb6fded05dcbc2b08b8895ada75a31dcb5/providers/universal-provider)
- [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963)
- [iOS wallet links](https://docs.walletconnect.com/wallets/ios/mobile-linking)
- [Universal Provider license](https://github.com/WalletConnect/walletconnect-monorepo/blob/63094dcb6fded05dcbc2b08b8895ada75a31dcb5/providers/universal-provider/LICENSE.md)

WalletConnect still requires its project and gateway. Its Community License still applies. The deployment owner must retain required attribution and verify applicable service terms before rollout.

## Behavior

All domains use one connect, account, and network dialog. Installed EIP-6963 wallets appear separately. The generic injected connector remains a fallback. Safe uses the official connector and the established trusted origins.

The WalletConnect SDK loads when a connection or stored session needs it. A missing project ID disables mobile pairing with an explanation. The application does not substitute a fake project ID.

Wallet approval is separate from a transaction. The connection dialog supplies a QR code, a copyable URI, and explicit MetaMask/Rabby launch buttons. Phone users return to the browser manually when their operating system does not return automatically.

Closing a pending request cancels its use by the application. Universal Provider cannot abort the underlying proposal. A late approval is disconnected. A retry waits until that proposal settles. The UI explains how to reject the old request.

The connector validates expiry, approved methods, events, chain-specific accounts, and session updates. Unsupported signing methods cannot fall through to public RPC. Public reads use the configured transport.

A new storage boundary prevents incompatible RainbowKit state from reconnecting automatically. Wagmi uses `yearn-wallet-v3`. Universal Provider uses `yearn-wallet-v1`. Users reconnect once after migration. The application does not erase old or unrelated wallet storage.

## Validation

Run the repository checks:

```sh
npm run validate:deps
npm run typecheck
npm run lint
npm test
npm run generate:dao-feed -- --check
npm run test:e2e
npm run test:e2e:full
npm run worker:build
npm run validate:worker-runtime -- wrangler.jsonc
npm run validate:worker-size
```

Use the production environment described in the existing release checklist for Worker checks. Mock flags must remain false in production validation.

The separate wallet suite uses real Wagmi configuration with synthetic injected providers:

```sh
NEXT_PUBLIC_RUNTIME_MODE=development npm run test:e2e:wallet
```

This suite needs a build or development server with `NEXT_PUBLIC_E2E=false` and `NEXT_PUBLIC_USE_MOCKS=true`. A server built for the ordinary mock suite cannot exercise injected discovery. If an appropriate server already runs, use `E2E_REUSE_SERVER=true`.

The wallet suite covers two installed providers, selected-provider requests, account changes, network rejection/retry, reconnect/disconnect, late approval, focus, and narrow screens.

Protocol unit tests use an injected SDK fixture. They cover session permissions and lifecycle behavior without a relay. Neither these tests nor phone-sized browser windows prove real wallet compatibility.

### Human acceptance

Record the device, OS, browser, wallet version, result, and observed error for each case.

1. Install MetaMask and Rabby on the same desktop browser.
2. Connect each wallet separately.
3. Change the account in the selected wallet.
4. Change away from Ethereum, reject the switch, and then accept it.
5. Reload the page and verify reconnect.
6. Disconnect, reload, and verify that the wallet stays disconnected.
7. Reject a connection, then retry.
8. Close a pending request, then approve the old wallet prompt.
9. Verify that the old approval does not reconnect the app.
10. Scan the desktop QR with iPhone MetaMask.
11. Repeat with iPhone Rabby.
12. Open the page in iPhone Safari and use each explicit wallet launch button.
13. Return to Safari after approval.
14. Repeat reconnect, disconnect, rejection, and expiry on the phone.
15. Open an allowed app route in Safe. The launcher route intentionally disallows framing.
16. Verify the Safe account, chain, disconnect behavior, and transaction review on a controlled test environment.

Android Chrome pairing, return, reconnect, and rejection also need release acceptance. The current owner evaluation targets iPhone and desktop wallets.

Real signing and transaction tests require a controlled test account or fork. A local mock-data preview does not establish Safe transaction or live transaction compatibility.

## Rollout and rollback

The local preview is an evaluation milestone. Do not mark the issue complete from automated checks alone.

Before release, collect real-wallet evidence and complete the existing preproduction checks. Compare RPC configuration, project origin restrictions, Worker limits, and the deployed wallet routes.

Use one migration PR for the application changes and lockfile. Preserve the reviewed base commit and test evidence. Roll back through the normal release process to the previous application commit and lockfile.

Rollback does not revoke token approvals or erase wallet-side sessions. The separate storage prefixes preserve earlier application state without mixing connector implementations.
