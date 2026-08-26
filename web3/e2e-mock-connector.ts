import { mock } from "wagmi";

type MockConnectorFactory = ReturnType<typeof mock>;
type MockConnector = ReturnType<MockConnectorFactory>;
type MockProvider = Awaited<ReturnType<MockConnector["getProvider"]>>;
type MockParameters = Parameters<typeof mock>[0];

export function createE2EMockConnector(
  parameters: MockParameters
): MockConnectorFactory {
  const createMockConnector = mock(parameters);

  return (config) => {
    const connector = createMockConnector(config);
    const getProvider = connector.getProvider.bind(connector);

    return {
      ...connector,
      async getProvider(providerParameters) {
        const provider = await getProvider(providerParameters);
        const request = (async (request: {
          method: string;
          params?: unknown;
        }) => {
          if (request.method === "eth_accounts") {
            return parameters.accounts as never;
          }
          return provider.request(request as never);
        }) as MockProvider["request"];

        return {
          ...provider,
          request,
        } satisfies MockProvider;
      },
    };
  };
}
