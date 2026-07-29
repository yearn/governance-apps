import { TEAMS_FEED_MAX_PAYLOAD_BYTES } from "@/lib/schemas/teams-feed";
import {
  readBoundedJson,
  withFeedRequest,
  type FeedRequestContext,
  type FeedTransportPolicy,
} from "@/lib/feed-transport";

export const TEAMS_FEED_REQUEST_TIMEOUT_MS = 10_000;

type TeamsFeedRequestContext = FeedRequestContext;

export class TeamsFeedRequestTimeoutError extends Error {
  constructor() {
    super(
      `The Teams feed request exceeded ${TEAMS_FEED_REQUEST_TIMEOUT_MS}ms.`
    );
    this.name = "TeamsFeedRequestTimeoutError";
  }
}

const TEAMS_FEED_TRANSPORT_POLICY: FeedTransportPolicy = {
  createPayloadTooLargeError: () =>
    new Error("The Teams feed payload exceeds the supported size."),
  createTimeoutError: () => new TeamsFeedRequestTimeoutError(),
  fetchOptions: { cache: "no-store" },
  maximumPayloadBytes: TEAMS_FEED_MAX_PAYLOAD_BYTES,
  payloadTooLargeCancelReason:
    "Teams feed payload exceeds the supported size.",
  requestTimeoutMs: TEAMS_FEED_REQUEST_TIMEOUT_MS,
  timeoutCancelReason: "Teams feed request timed out.",
};

export async function withTeamsFeedRequest<T>(
  url: string,
  handleResponse: (
    response: Response,
    context: TeamsFeedRequestContext
  ) => Promise<T>
): Promise<T> {
  return withFeedRequest(
    url,
    TEAMS_FEED_TRANSPORT_POLICY,
    handleResponse
  );
}

export async function readBoundedTeamsJson(
  response: Response,
  context: TeamsFeedRequestContext
): Promise<unknown> {
  return readBoundedJson(
    response,
    context,
    TEAMS_FEED_TRANSPORT_POLICY
  );
}
