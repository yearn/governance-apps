import { YBC_FEED_MAX_PAYLOAD_BYTES } from "@/lib/schemas/ybc-feed";
import {
  readBoundedJson,
  withFeedRequest,
  type FeedRequestContext,
  type FeedTransportPolicy,
} from "@/lib/feed-transport";

export const YBC_FEED_REQUEST_TIMEOUT_MS = 10_000;

type YbcFeedRequestContext = FeedRequestContext;

export class YbcFeedRequestTimeoutError extends Error {
  constructor() {
    super(
      `The YBC feed request exceeded ${YBC_FEED_REQUEST_TIMEOUT_MS}ms.`
    );
    this.name = "YbcFeedRequestTimeoutError";
  }
}

const YBC_FEED_TRANSPORT_POLICY: FeedTransportPolicy = {
  createPayloadTooLargeError: () =>
    new Error("The YBC feed payload exceeds the supported size."),
  createTimeoutError: () => new YbcFeedRequestTimeoutError(),
  maximumPayloadBytes: YBC_FEED_MAX_PAYLOAD_BYTES,
  payloadTooLargeCancelReason:
    "YBC feed payload exceeds the supported size.",
  requestTimeoutMs: YBC_FEED_REQUEST_TIMEOUT_MS,
  timeoutCancelReason: "YBC feed request timed out.",
};

export async function withYbcFeedRequest<T>(
  url: string,
  handleResponse: (
    response: Response,
    context: YbcFeedRequestContext
  ) => Promise<T>
): Promise<T> {
  return withFeedRequest(
    url,
    YBC_FEED_TRANSPORT_POLICY,
    handleResponse
  );
}

export async function readBoundedYbcJson(
  response: Response,
  context: YbcFeedRequestContext
): Promise<unknown> {
  return readBoundedJson(response, context, YBC_FEED_TRANSPORT_POLICY);
}
