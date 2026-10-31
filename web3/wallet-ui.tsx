"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import encodeQR from "qr";
import {
  useAccount,
  useChains,
  useConnect,
  useConnectors,
  useDisconnect,
  useSwitchChain,
  type Connector,
} from "wagmi";
import { Modal } from "@/components/ui/Modal";
import { Button, getButtonClassName } from "@/components/ui/Button";
import { IconWallet } from "@/components/icons/IconWallet";
import { formatAddress } from "@/lib/format";
import {
  cancelWalletConnectPairing,
  getWalletConnectPairing,
  subscribeWalletConnectPairing,
  walletConnectPairingServerSnapshot,
} from "./walletconnect-pairing";
import { walletErrorMessage, walletLaunchUrl } from "./wallet-ui-helpers";

type Panel = "connect" | "account" | "network";
type WalletUiContextValue = {
  openConnectModal: () => void;
  openAccountModal: () => void;
  openChainModal: () => void;
};

const WalletUiContext = createContext<WalletUiContextValue | null>(null);
const noWalletUi = {
  openConnectModal: undefined,
  openAccountModal: undefined,
  openChainModal: undefined,
};

export function useConnectModal() {
  const context = useContext(WalletUiContext);
  return { openConnectModal: context?.openConnectModal ?? noWalletUi.openConnectModal };
}

export function useAccountModal() {
  const context = useContext(WalletUiContext);
  return { openAccountModal: context?.openAccountModal ?? noWalletUi.openAccountModal };
}

export function useChainModal() {
  const context = useContext(WalletUiContext);
  return { openChainModal: context?.openChainModal ?? noWalletUi.openChainModal };
}

const walletActionClass = "h-auto min-h-10 min-w-0 whitespace-normal break-words px-3 py-3 text-center";
const fullWalletActionClass = `${walletActionClass} w-full`;

const rowClass =
  "flex min-h-14 w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left text-text-primary transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary disabled:cursor-not-allowed disabled:opacity-50";

export function WalletUiProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  const connectors = useConnectors();
  const chains = useChains();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const pairing = useSyncExternalStore(
    subscribeWalletConnectPairing,
    getWalletConnectPairing,
    () => walletConnectPairingServerSnapshot,
  );
  const [panel, setPanel] = useState<Panel | null>(null);
  const [available, setAvailable] = useState<readonly Connector[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [selected, setSelected] = useState<Connector | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const attemptRef = useRef(0);
  const selectedRef = useRef<Connector | null>(null);
  const pendingRef = useRef(false);
  const injectedRequests = useRef(new Set<string>());

  const walletConnect = connectors.find((connector) => connector.id === "walletConnect");

  useEffect(() => {
    if (panel !== "connect") return;
    let cancelled = false;
    const discover = async () => {
      setDiscovering(true);
      const results = await Promise.all(connectors.map(async (connector) => {
        if (connector.id === "walletConnect") return null;
        if (connector.type === "safe" && window.parent === window) return null;
        try {
          return await connector.getProvider() ? connector : null;
        } catch {
          return null;
        }
      }));
      if (cancelled) return;
      const found = results.filter((connector): connector is Connector => connector !== null);
      const announced = found.some((connector) => connector.type === "injected" && connector.id !== "injected");
      setAvailable(found.filter((connector) => !(announced && connector.id === "injected")));
      setDiscovering(false);
    };
    void discover();
    return () => { cancelled = true; };
  }, [connectors, panel]);

  const clearAttempt = useCallback(() => {
    attemptRef.current += 1;
    if (selectedRef.current?.id === "walletConnect" && pendingRef.current) {
      cancelWalletConnectPairing();
    }
    selectedRef.current = null;
    pendingRef.current = false;
    setSelected(null);
    setPending(false);
  }, []);

  const close = useCallback(() => {
    clearAttempt();
    setPanel(null);
    setError(null);
    setCopied(null);
  }, [clearAttempt]);

  useEffect(() => () => {
    attemptRef.current += 1;
    if (selectedRef.current?.id === "walletConnect" && pendingRef.current) {
      cancelWalletConnectPairing();
    }
  }, []);

  const open = useCallback((next: Panel) => {
    clearAttempt();
    setError(null);
    setCopied(null);
    setPanel(next);
  }, [clearAttempt]);

  const value = useMemo(() => ({
    openConnectModal: () => open("connect"),
    openAccountModal: () => open(account.isConnected ? "account" : "connect"),
    openChainModal: () => open(account.isConnected ? "network" : "connect"),
  }), [account.isConnected, open]);

  const choose = async (connector: Connector) => {
    if (pendingRef.current) return;
    if (injectedRequests.current.has(connector.uid)) {
      setSelected(connector);
      setError("A request is still open in this wallet. Respond to that request before you try again.");
      return;
    }
    if (connector.id !== "walletConnect") injectedRequests.current.add(connector.uid);
    const attempt = ++attemptRef.current;
    selectedRef.current = connector;
    pendingRef.current = true;
    setSelected(connector);
    setPending(true);
    setError(null);
    setCopied(null);
    try {
      await connect.mutateAsync({ connector });
      if (attempt !== attemptRef.current) {
        // Injected-wallet prompts cannot be dismissed by a website. Do not retain
        // a connection approved after the user cancelled this app's request.
        if (connector.id !== "walletConnect") {
          await disconnect.mutateAsync({ connector });
        }
        return;
      }
      pendingRef.current = false;
      close();
    } catch (cause) {
      if (attempt !== attemptRef.current) return;
      setError(walletErrorMessage(cause, "connect"));
      pendingRef.current = false;
      setPending(false);
    } finally {
      injectedRequests.current.delete(connector.uid);
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
    } catch {
      setCopied("Copy is unavailable in this browser. Select and copy the text below.");
    }
  };

  const doDisconnect = async () => {
    const attempt = ++attemptRef.current;
    setError(null);
    try {
      await disconnect.mutateAsync();
      if (attempt === attemptRef.current) close();
    } catch (cause) {
      if (attempt === attemptRef.current) setError(walletErrorMessage(cause, "disconnect"));
    }
  };

  const changeNetwork = async (chainId: number) => {
    const attempt = ++attemptRef.current;
    setError(null);
    try {
      await switchChain.mutateAsync({ chainId });
      if (attempt === attemptRef.current) close();
    } catch (cause) {
      if (attempt === attemptRef.current) setError(walletErrorMessage(cause, "switch"));
    }
  };

  const selectedWalletConnect = selected?.id === "walletConnect";
  const pairingStopped = ["cancelled", "expired", "error"].includes(pairing.status);
  const connectionPending = pending && !(selectedWalletConnect && pairingStopped);
  const title = panel === "account" ? "Your wallet" : panel === "network" ? "Switch network" : selectedWalletConnect ? "Connect with WalletConnect" : "Connect wallet";

  return (
    <WalletUiContext.Provider value={value}>
      {children}
      <Modal
        isOpen={panel !== null}
        onClose={close}
        title={title}
        fitVisualViewport
        overlayClassName="h-dvh w-screen p-[16px]"
        className="max-h-[calc(var(--modal-viewport-height,100dvh)-32px)] w-[calc(var(--modal-viewport-width,100vw)-32px)] min-w-0 max-w-md overflow-y-auto overscroll-contain p-[20px] sm:p-6 [&_h2]:pr-12 [&_h2]:[overflow-wrap:anywhere]"
      >
        <div className="space-y-4 text-sm text-text-secondary">
          {panel === "connect" && !selected && (
            <>
              <p>Choose a wallet to connect to Yearn. Connecting does not request a transaction.</p>
              <div className="space-y-2" aria-label="Available wallets">
                {available.map((connector) => (
                  <button key={connector.uid} type="button" className={rowClass} onClick={() => void choose(connector)}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-secondary" aria-hidden>
                      <IconWallet className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block break-words font-medium">{connector.name === "Injected" ? "Browser wallet" : connector.name}</span>
                      <span className="block text-xs text-text-tertiary">{connector.type === "safe" ? "Safe app" : "Detected"}</span>
                    </span>
                  </button>
                ))}
                {discovering && <p role="status" className="py-2">Looking for installed wallets…</p>}
                {!discovering && available.length === 0 && <p className="rounded-xl bg-surface-secondary p-3">No browser wallet detected. Use a mobile wallet below, or open this page in your wallet’s browser.</p>}
                <button
                  type="button"
                  className={rowClass}
                  disabled={!walletConnect}
                  onClick={() => walletConnect && void choose(walletConnect)}
                  aria-describedby={!walletConnect ? "walletconnect-unavailable" : undefined}
                >
                  <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">⌁</span>
                  <span className="min-w-0 flex-1 break-words">
                    <span className="block font-medium">WalletConnect</span>
                    <span className="block text-xs text-text-tertiary">Scan a QR code or open a mobile wallet</span>
                  </span>
                </button>
                {!walletConnect && <p id="walletconnect-unavailable" className="text-xs">Mobile pairing is unavailable on this site. Use a browser wallet.</p>}
              </div>
              <details className="border-t border-border pt-3">
                <summary className="cursor-pointer py-1 text-text-primary">Need a wallet?</summary>
                <p className="mt-2">Install a wallet from its official website, then reload this page.</p>
                <div className="mt-2 flex flex-wrap gap-3">
                  <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Get MetaMask</a>
                  <a href="https://rabby.io/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Get Rabby</a>
                </div>
              </details>
            </>
          )}

          {panel === "connect" && selected && (
            <>
              {selectedWalletConnect ? (
                <PairingPanel
                  uri={pairing.status === "pending" ? pairing.uri : undefined}
                  status={pairing.status}
                  onCopy={(uri) => void copy(uri, "Connection link copied")}
                />
              ) : (
                <div className="rounded-xl bg-surface-secondary p-4">
                  <p className="font-medium text-text-primary">{connectionPending ? `Continue in ${selected.name}` : `Connect ${selected.name}`}</p>
                  <p className="mt-2">Open your wallet and approve the connection request. You can return here after you respond.</p>
                </div>
              )}
              {connectionPending && <p role="status">Waiting for your wallet…</p>}
              {selectedWalletConnect && pairing.status === "expired" && <p role="alert">This connection request expired. Start a new request to try again.</p>}
              {selectedWalletConnect && pairing.status === "cancelled" && <p role="status">Connection request cancelled.</p>}
              {selectedWalletConnect && pairing.status === "error" && !error && <p role="alert">Could not start mobile pairing. Check your connection and try again.</p>}
              {!connectionPending && (
                <Button variant="secondary" className={fullWalletActionClass} onClick={() => { pendingRef.current = false; void choose(selected); }}>
                  Try again
                </Button>
              )}
              <Button variant="ghost" className={fullWalletActionClass} onClick={() => { clearAttempt(); setError(null); setCopied(null); }}>
                {connectionPending ? "Cancel and choose another wallet" : "Choose another wallet"}
              </Button>
              {connectionPending && !selectedWalletConnect && <p className="text-xs">If you cancel here, dismiss the open request in your wallet too.</p>}
            </>
          )}

          {panel === "account" && account.address && (
            <>
              <div className="rounded-xl bg-surface-secondary p-4">
                <p className="text-xs">Connected with {account.connector?.name ?? "your wallet"}</p>
                <p className="mt-2 break-all font-mono text-sm text-text-primary" data-testid="wallet-account-address">{account.address}</p>
                <p className="mt-2 text-xs">{account.chainId === 1 ? "Ethereum Mainnet" : `Unsupported network (${account.chainId ?? "unknown"})`}</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button variant="secondary" size="sm" className={walletActionClass} onClick={() => void copy(account.address!, "Address copied")}>Copy address</Button>
                <a href={`https://etherscan.io/address/${account.address}`} target="_blank" rel="noopener noreferrer" className={getButtonClassName({ variant: "secondary", size: "sm", className: walletActionClass })}>View on explorer<span className="sr-only"> (opens a new tab)</span></a>
              </div>
              <Button variant="secondary" className={fullWalletActionClass} onClick={() => open("network")}>Switch network</Button>
              <Button variant="secondary" className={fullWalletActionClass} isLoading={disconnect.isPending} onClick={() => void doDisconnect()}>Disconnect</Button>
              <p className="text-xs">Disconnecting removes this site’s connection. It does not revoke token approvals.</p>
            </>
          )}

          {panel === "account" && !account.address && (
            <>
              <p>Your wallet disconnected.</p>
              <Button className={fullWalletActionClass} onClick={() => open("connect")}>Connect wallet</Button>
            </>
          )}

          {panel === "network" && (
            <>
              <p>Yearn uses Ethereum Mainnet. Confirm any network request in your wallet.</p>
              {chains.map((chain) => (
                <Button
                  key={chain.id}
                  variant="secondary"
                  className={fullWalletActionClass}
                  isLoading={switchChain.isPending}
                  disabled={account.chainId === chain.id}
                  onClick={() => void changeNetwork(chain.id)}
                >
                  {chain.id === 1 ? "Ethereum Mainnet" : chain.name}{account.chainId === chain.id ? " · Connected" : ""}
                </Button>
              ))}
              {account.connector?.type === "safe" && <p className="text-xs">Safe accounts belong to one network. Open the correct Safe account if a switch is unavailable.</p>}
            </>
          )}
          {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</p>}
          {copied && <p role="status">{copied}</p>}
        </div>
      </Modal>
    </WalletUiContext.Provider>
  );
}

function PairingPanel({
  uri,
  status,
  onCopy,
}: {
  uri?: string;
  status: string;
  onCopy: (uri: string) => void;
}) {
  const image = useMemo(() => {
    if (!uri) return null;
    try {
      return encodeQR(uri, "data-url", { scale: 5, border: 4, ecc: "medium" });
    } catch {
      return null;
    }
  }, [uri]);

  if (!uri) {
    return <p>{status === "connecting" || status === "idle" ? "Preparing a secure connection…" : "Start a new connection request to get a fresh QR code."}</p>;
  }

  return (
    <div className="space-y-3">
      <p>Scan this code with your wallet’s scanner.</p>
      {image ? (
        <div className="mx-auto w-fit max-w-full rounded-xl bg-white p-2">
          {/* The QR image is generated locally. It contains no remote image URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} width={256} height={256} alt="WalletConnect pairing QR code" className="h-auto max-h-64 w-full max-w-64" />
        </div>
      ) : <p role="alert">Could not draw the QR code. Copy the connection link instead.</p>}
      <div className="space-y-2">
        <p className="font-medium text-text-primary">Use a wallet on this device</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(["metamask", "rabby"] as const).map((wallet) => {
            const href = walletLaunchUrl(wallet, uri);
            return href ? (
              <a key={wallet} href={href} className={getButtonClassName({ variant: "secondary", size: "sm", className: walletActionClass })}>
                Open {wallet === "metamask" ? "MetaMask" : "Rabby"}
              </a>
            ) : null;
          })}
        </div>
        <p className="text-xs">Open an installed wallet, approve the request, then return to this browser tab. Your phone may not return automatically.</p>
      </div>
      <Button variant="secondary" className={fullWalletActionClass} onClick={() => onCopy(uri)}>Copy connection link</Button>
      <details>
        <summary className="cursor-pointer py-1">Show connection link</summary>
        <p className="mt-2 break-all rounded-lg bg-surface-secondary p-3 font-mono text-xs select-all">{uri}</p>
      </details>
      <p className="text-xs">Keep this request private. After you approve it in your wallet, return to this browser tab.</p>
    </div>
  );
}

/** The landing page needs a wallet control that also remains visible on phones. */
export function ConnectButton() {
  const account = useAccount();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();
  const wrongNetwork = account.isConnected && account.chainId !== 1;
  return (
    <Button variant="secondary" size="sm" onClick={account.isConnected ? wrongNetwork ? openChainModal : openAccountModal : openConnectModal}>
      {wrongNetwork ? "Wrong Network" : account.isConnected && account.address ? formatAddress(account.address) : "Connect wallet"}
    </Button>
  );
}
