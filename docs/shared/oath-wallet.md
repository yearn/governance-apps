# Oath Wallet connection

The shared RainbowKit configuration lists Oath Wallet directly alongside the
existing wallets. This applies to every app using `web3/rainbowkit.tsx`; no
app-specific connection button or layout is added.

Oath is a native iOS wallet. Selecting it on desktop opens RainbowKit's named
WalletConnect QR screen and connection instructions. On iOS, RainbowKit uses
`oathwallet://wc?uri=<encoded WalletConnect URI>` to open Oath. The entry is
hidden on Android. The download link points to the iOS App Store listing.

The connector uses the host's existing WalletConnect project ID and Ethereum
configuration. It has its own `oath-wallet` storage prefix, so a pending Oath
pairing does not reuse a different wallet entry's provider session. Its Wagmi
requested-chain storage is also separate, so clearing another wallet's
requested chains cannot invalidate Oath's reconnect state. Generic
WalletConnect remains available. The existing E2E mock connector and all
transaction preparation, approval and execution paths remain unchanged.

## Reviewer checks

1. Configure `NEXT_PUBLIC_WC_PROJECT_ID` with a valid project allowing the test
   origin. Use the repository's existing RPC/runtime configuration.
2. Open an app with `NEXT_PUBLIC_E2E=false`, click **Connect wallet**, and verify
   Oath uses the same row and icon dimensions as its peers.
3. Select **Oath Wallet** and verify the QR screen and instructions. Close it,
   reopen, and retry. Then verify the generic WalletConnect entry still opens.
4. On an iPhone with Oath installed, verify app handoff and approve an Ethereum
   session before considering end-to-end mobile pairing verified. A rendered
   QR and passing host tests alone do not establish pairing or signing support.

Host regression tests cover URI preservation/encoding, platform visibility,
local icon safety, connector coexistence, and isolated provider configuration.
The existing smoke/full E2E suites use the mock connector; they do not verify
physical-device pairing or transaction execution through Oath.
