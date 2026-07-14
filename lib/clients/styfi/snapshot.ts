export const STYFI_SNAPSHOT_SPACE_ID = "styfi.eth";
export const STYFI_SNAPSHOT_SPACE_URL =
  "https://snapshot.org/#/s:styfi.eth/";

const SNAPSHOT_GRAPHQL_URL = "https://hub.snapshot.org/graphql";
const MAX_ACTIVE_PROPOSALS = 20;
const SNAPSHOT_REQUEST_TIMEOUT_MS = 3_000;
const SNAPSHOT_PROPOSAL_ID_PATTERN = /^[a-zA-Z0-9]+$/;

export type StyfiSnapshotProposal = {
  id: string;
  title: string;
  end: number;
  state: "active";
};

type SnapshotProposalResponse = {
  data?: {
    proposals?: unknown;
  };
  errors?: unknown;
};

const ACTIVE_PROPOSALS_QUERY = `
  query StyfiActiveProposals {
    proposals(
      first: ${MAX_ACTIVE_PROPOSALS}
      where: { space_in: ["${STYFI_SNAPSHOT_SPACE_ID}"], state: "active" }
      orderBy: "end"
      orderDirection: asc
    ) {
      id
      title
      end
      state
    }
  }
`;

function isActiveProposal(value: unknown): value is StyfiSnapshotProposal {
  if (!value || typeof value !== "object") return false;

  const proposal = value as Record<string, unknown>;
  return (
    typeof proposal.id === "string" &&
    proposal.id.length <= 128 &&
    SNAPSHOT_PROPOSAL_ID_PATTERN.test(proposal.id) &&
    typeof proposal.title === "string" &&
    proposal.title.trim().length > 0 &&
    typeof proposal.end === "number" &&
    Number.isFinite(proposal.end) &&
    proposal.end > 0 &&
    proposal.state === "active"
  );
}

export function getStyfiSnapshotProposalUrl(proposalId: string): string {
  if (!SNAPSHOT_PROPOSAL_ID_PATTERN.test(proposalId)) {
    throw new Error("Invalid Snapshot proposal ID");
  }

  return `${STYFI_SNAPSHOT_SPACE_URL}proposal/${encodeURIComponent(proposalId)}`;
}

export function filterCurrentStyfiSnapshotProposals(
  proposals: StyfiSnapshotProposal[],
  nowMs = Date.now(),
): StyfiSnapshotProposal[] {
  return proposals.filter((proposal) => proposal.end * 1000 > nowMs);
}

export async function fetchActiveStyfiSnapshotProposals(
  signal?: AbortSignal,
): Promise<StyfiSnapshotProposal[]> {
  const requestController = new AbortController();
  const abortRequest = () => requestController.abort();
  if (signal?.aborted) abortRequest();
  signal?.addEventListener("abort", abortRequest, { once: true });
  const timeoutId = setTimeout(abortRequest, SNAPSHOT_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(SNAPSHOT_GRAPHQL_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: ACTIVE_PROPOSALS_QUERY }),
      signal: requestController.signal,
    });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortRequest);
  }

  if (!response.ok) {
    throw new Error(`Snapshot request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as SnapshotProposalResponse;
  const hasErrors = Array.isArray(payload.errors)
    ? payload.errors.length > 0
    : Boolean(payload.errors);
  if (hasErrors || !Array.isArray(payload.data?.proposals)) {
    throw new Error("Snapshot returned an invalid proposal response");
  }

  return payload.data.proposals
    .filter(isActiveProposal)
    .sort((left, right) => left.end - right.end);
}
