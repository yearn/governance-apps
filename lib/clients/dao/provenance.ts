import type { DaoVerifiedSource } from "./types";

export const DAO_PINNED_VOTING_REVISION =
  "9395d5e6fffdfe21fda32af94d32fca1a4f7840b";

export const DAO_PINNED_VOTING_SOURCE = {
  kind: "github",
  label: "Voting.vy at pinned stYFI revision",
  url: `https://github.com/yearn/stYFI/blob/${DAO_PINNED_VOTING_REVISION}/contracts/governance/Voting.vy`,
  revision: DAO_PINNED_VOTING_REVISION,
} as const satisfies DaoVerifiedSource;
