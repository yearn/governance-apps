# YBC Mock Data Schema v1

Purpose: a stable mock data contract for design, prototypes, and mock-backed implementation.

## Type shape

```ts
type YbcMockDataV1 = {
  version: 1;
  generatedAt: number;
  currentEpoch: number;
  influence: {
    internalWeight: string;
    delegatedWeight: string;
    totalWeight: string;
  };
  collective: {
    address: string;
    memberCount: number;
    stakedSupply: string;
    effectiveWeight: string;
    pendingExecutions: number;
  };
  me?: MemberPerspective;
  members: MemberRecord[];
  proposals: ProposalRecord[];
  admin?: YbcAdminRecord;
};

type MemberPerspective = {
  isMember: boolean;
  rawStaked: string;
  effectiveWeight: string;
  targetWeight: string;
  maturityBps: number;
  pendingRewards: string;
};

type MemberRecord = {
  address: string;
  ens: string | null;
  isMember: boolean;
  rawStaked: string;
  effectiveWeight: string;
  targetWeight: string;
  maturityBps: number;
  sources: {
    styfi: string;
    llYfi: string;
    migratedVeYfi: string;
  };
};

type ProposalRecord = {
  id: number;
  type: "addition" | "expulsion";
  account: string;
  proposer: string;
  epoch: number;
  thresholdBps: number;
  votesTotal: string;
  votesYea: string;
  votesNay: string;
  phase:
    | "discussion"
    | "voting"
    | "passed"
    | "failed"
    | "executed"
    | "expired"
    | "retracted";
  opensAt: number;
  closesAt: number;
  executeBy: number;
  canRetract: boolean;
  canVote: boolean;
  canExecute: boolean;
};

type YbcAdminRecord = {
  operators: string[];
  thresholds: {
    additionBps: number;
    expulsionBps: number;
  };
  hooks: string;
};
```

## Rules

- raw stake and effective weight must be separate fields
- target weight can exceed current effective weight for ramping members
- proposal timestamps should be explicit in mocks, not only inferred by epoch
- expired proposals remain visible but non-actionable
- rewards are visible in YBC but are not assumed to be claimed on a separate isolated YBC claim page
