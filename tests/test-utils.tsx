import { ReactElement, ReactNode } from "react";
import {
  render,
  renderHook,
  RenderOptions,
  RenderHookOptions,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, mock } from "wagmi";
import { mainnet } from "wagmi/chains";
import type { Address } from "viem";
import { ProtocolProvider } from "@/state/protocol";
import { IdentityProvider } from "@/state/identity";
import { E2E_MOCK_ADDRESS } from "@/lib/test/constants";

type ProviderOptions = {
  address?: Address;
  autoConnect?: boolean;
  withIdentity?: boolean;
  queryClient?: QueryClient;
};

type ExtendedRenderOptions = RenderOptions & ProviderOptions;

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function createTestWagmiConfig(options: ProviderOptions = {}) {
  const address = options.address ?? E2E_MOCK_ADDRESS;
  const autoConnect = options.autoConnect ?? true;

  return createConfig({
    chains: [mainnet],
    transports: {
      [mainnet.id]: http("http://127.0.0.1:8545"),
    },
    ssr: true,
    connectors: [
      mock({
        accounts: [address],
        features: {
          defaultConnected: autoConnect,
          reconnect: autoConnect,
        },
      }),
    ],
  });
}

function buildWrapper(options: ProviderOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();
  const config = createTestWagmiConfig(options);
  const withIdentity = options.withIdentity ?? true;

  function Wrapper({ children }: { children: ReactNode }) {
    const content = withIdentity ? (
      <IdentityProvider>{children}</IdentityProvider>
    ) : (
      children
    );

    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ProtocolProvider>{content}</ProtocolProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  return { Wrapper, queryClient };
}

export function renderWithProviders(
  ui: ReactElement,
  options: ExtendedRenderOptions = {}
) {
  const { wrapper: _wrapper, ...rest } = options;
  const { address, autoConnect, withIdentity, queryClient, ...rtlOptions } =
    rest;
  const { Wrapper, queryClient: client } = buildWrapper({
    address,
    autoConnect,
    withIdentity,
    queryClient,
  });
  return {
    queryClient: client,
    ...render(ui, { wrapper: Wrapper, ...rtlOptions }),
  };
}

export function renderHookWithProviders<TProps, TResult>(
  callback: (props: TProps) => TResult,
  options: ProviderOptions & RenderHookOptions<TProps> = {}
) {
  const { wrapper: _wrapper, ...rest } = options;
  const { address, autoConnect, withIdentity, queryClient, ...hookOptions } =
    rest;
  const { Wrapper, queryClient: client } = buildWrapper({
    address,
    autoConnect,
    withIdentity,
    queryClient,
  });
  const result = renderHook(callback, { wrapper: Wrapper, ...hookOptions });
  return { ...result, queryClient: client };
}
