"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAddress, isAddress, parseUnits, type Address } from "viem";
import { useAccount } from "wagmi";
import { OnchainTeamsClient } from "@/lib/clients/teams/onchain";
import type { FundingApproval, TeamRecord } from "@/lib/clients/teams/types";
import type { TeamsFeed } from "@/lib/schemas/teams-feed";
import { teamsKeys } from "@/lib/hooks/teamsKeys";
import type { PreparedTransaction, TxState } from "@/lib/tx/types";
import { useTx } from "@/lib/tx/useTx";

type TeamsWriteResult = {
  approveRevenueDeposit: (
    team: TeamRecord,
    tokenAddress: string,
    amount: string
  ) => Promise<boolean>;
  approveFundingReturn: (
    team: TeamRecord,
    approval: FundingApproval,
    amount: string
  ) => Promise<boolean>;
  depositRevenue: (
    team: TeamRecord,
    tokenAddress: string,
    amount: string,
    decimals: number
  ) => Promise<boolean>;
  claimFunding: (
    team: TeamRecord,
    approval: FundingApproval,
    amount: string,
    recipient: string
  ) => Promise<boolean>;
  returnFunding: (
    team: TeamRecord,
    approval: FundingApproval,
    amount: string
  ) => Promise<boolean>;
  claimBonus: (team: TeamRecord, recipient: string) => Promise<boolean>;
  state: TxState;
};

export function useTeamsWrites(feed: TeamsFeed | null): TeamsWriteResult {
  const { address, chainId } = useAccount();
  const queryClient = useQueryClient();
  const { execute, state } = useTx();
  const client = useMemo(
    () =>
      feed
        ? new OnchainTeamsClient(feed, address ?? null, chainId ?? null)
        : null,
    [address, chainId, feed]
  );
  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: teamsKeys.all,
      refetchType: "all",
    });
  }, [queryClient]);

  const requireClient = useCallback(() => {
    if (!client || !feed) {
      throw new Error("Teams feed is not available for writes.");
    }
    return client;
  }, [client, feed]);
  const executeTeamsWrite = useCallback(
    async (
      prepare: () => Promise<PreparedTransaction>,
      options: { invalidateFeed?: boolean } = {}
    ) => {
      let succeeded = false;
      await execute(
        async () => {
          const prepared = await prepare();
          return prepared();
        },
        {
          invalidate:
            options.invalidateFeed === false ? undefined : invalidate,
          onSuccess: () => {
            succeeded = true;
          },
        }
      );
      return succeeded;
    },
    [execute, invalidate]
  );

  const approveRevenueDeposit = useCallback(
    async (
      team: TeamRecord,
      tokenAddress: string,
      amount: string
    ) => {
      const requestedTeamAddress = team.address;
      const requestedTokenAddress = tokenAddress;
      const requestedAmount = amount;
      return executeTeamsWrite(
        async () => {
          const token = parseAddress(
            requestedTokenAddress,
            "revenue token"
          );
          const feedToken = resolveTeamsFeedToken(feed, token);
          const amountRaw = parseTeamsAmount(
            requestedAmount,
            feedToken.decimals
          );
          return requireClient().prepareRevenueApproval(
            parseAddress(requestedTeamAddress, "team"),
            token,
            amountRaw
          );
        },
        { invalidateFeed: false }
      );
    },
    [executeTeamsWrite, feed, requireClient]
  );

  const approveFundingReturn = useCallback(
    async (
      team: TeamRecord,
      approval: FundingApproval,
      amount: string
    ) => {
      const requestedTeamAddress = team.address;
      const requestedApprovalIdx = approval.idx;
      const requestedAmount = amount;
      return executeTeamsWrite(
        async () => {
          const teamAddress = parseAddress(
            requestedTeamAddress,
            "team"
          );
          const feedApproval = resolveTeamsFeedApproval(
            feed,
            teamAddress,
            requestedApprovalIdx
          );
          const feedToken = resolveTeamsFeedToken(
            feed,
            parseAddress(feedApproval.token, "funding token")
          );
          const amountRaw = parseTeamsAmount(
            requestedAmount,
            feedToken.decimals
          );
          return requireClient().prepareFundingReturnApproval(
            teamAddress,
            BigInt(requestedApprovalIdx),
            amountRaw
          );
        },
        { invalidateFeed: false }
      );
    },
    [executeTeamsWrite, feed, requireClient]
  );

  const depositRevenue = useCallback(
    async (
      team: TeamRecord,
      tokenAddress: string,
      amount: string,
      _decimals: number
    ) => {
      void _decimals;
      const requestedTeamAddress = team.address;
      const requestedTokenAddress = tokenAddress;
      const requestedAmount = amount;
      return executeTeamsWrite(async () => {
        const token = parseAddress(requestedTokenAddress, "revenue token");
        const feedToken = resolveTeamsFeedToken(feed, token);
        const amountRaw = parseTeamsAmount(
          requestedAmount,
          feedToken.decimals
        );
        return requireClient().prepareRevenueDeposit(
          parseAddress(requestedTeamAddress, "team"),
          token,
          amountRaw
        );
      });
    },
    [executeTeamsWrite, feed, requireClient]
  );

  const claimFunding = useCallback(
    async (
      team: TeamRecord,
      approval: FundingApproval,
      amount: string,
      recipient: string
    ) => {
      const requestedTeamAddress = team.address;
      const requestedApprovalIdx = approval.idx;
      const requestedAmount = amount;
      const requestedRecipient = recipient;
      return executeTeamsWrite(async () => {
        const teamAddress = parseAddress(requestedTeamAddress, "team");
        const feedApproval = resolveTeamsFeedApproval(
          feed,
          teamAddress,
          requestedApprovalIdx
        );
        assertCurrentTeamsFundingApproval(feed, feedApproval.period);
        const feedToken = resolveTeamsFeedToken(
          feed,
          parseAddress(feedApproval.token, "funding token")
        );
        const amountRaw = parseTeamsAmount(
          requestedAmount,
          feedToken.decimals
        );
        assertTeamsAmountWithinRawBalance(
          amountRaw,
          feedApproval.claimable,
          "Funding claim"
        );
        return requireClient().prepareFundingClaim(
          teamAddress,
          BigInt(requestedApprovalIdx),
          amountRaw,
          parseAddress(requestedRecipient, "recipient")
        );
      });
    },
    [executeTeamsWrite, feed, requireClient]
  );

  const returnFunding = useCallback(
    async (team: TeamRecord, approval: FundingApproval, amount: string) => {
      const requestedTeamAddress = team.address;
      const requestedApprovalIdx = approval.idx;
      const requestedAmount = amount;
      return executeTeamsWrite(async () => {
        const teamAddress = parseAddress(requestedTeamAddress, "team");
        const feedApproval = resolveTeamsFeedApproval(
          feed,
          teamAddress,
          requestedApprovalIdx
        );
        assertCurrentTeamsFundingApproval(feed, feedApproval.period);
        const feedToken = resolveTeamsFeedToken(
          feed,
          parseAddress(feedApproval.token, "funding token")
        );
        const amountRaw = parseTeamsAmount(
          requestedAmount,
          feedToken.decimals
        );
        return requireClient().prepareFundingReturn(
          teamAddress,
          BigInt(requestedApprovalIdx),
          amountRaw
        );
      });
    },
    [executeTeamsWrite, feed, requireClient]
  );

  const claimBonus = useCallback(
    async (team: TeamRecord, recipient: string) => {
      const requestedTeamAddress = team.address;
      const requestedRecipient = recipient;
      return executeTeamsWrite(async () => {
        return requireClient().prepareBonusClaim(
          parseAddress(requestedTeamAddress, "team"),
          parseAddress(requestedRecipient, "recipient")
        );
      });
    },
    [executeTeamsWrite, requireClient]
  );

  return {
    approveFundingReturn,
    approveRevenueDeposit,
    claimBonus,
    claimFunding,
    depositRevenue,
    returnFunding,
    state,
  };
}

function parseAddress(value: string, label: string): Address {
  if (!isAddress(value)) {
    throw new Error(`Invalid Teams ${label} address.`);
  }
  return getAddress(value) as Address;
}

function parseTeamsAmount(value: string, decimals: number) {
  try {
    const amount = parseUnits(value, decimals);
    if (amount <= 0n) {
      throw new Error("Amount must be greater than zero.");
    }
    return amount;
  } catch {
    throw new Error("Enter a valid Teams amount.");
  }
}

function assertTeamsAmountWithinRawBalance(
  amount: bigint,
  maximumRaw: string,
  label: string
) {
  if (!/^(0|[1-9]\d*)$/.test(maximumRaw) || amount > BigInt(maximumRaw)) {
    throw new Error(`${label} exceeds the exact available balance.`);
  }
}

function resolveTeamsFeedToken(feed: TeamsFeed | null, address: Address) {
  const token = feed
    ? Object.values(feed.tokens).find(
        (entry) => entry.address.toLowerCase() === address.toLowerCase()
      )
    : null;
  if (!token) {
    throw new Error(
      "The selected Teams token is not present in the trusted feed."
    );
  }
  return token;
}

function resolveTeamsFeedApproval(
  feed: TeamsFeed | null,
  team: Address,
  approvalIdx: number
) {
  const approval = feed?.fundingApprovals.find(
    (entry) =>
      entry.id === approvalIdx &&
      entry.team.toLowerCase() === team.toLowerCase()
  );
  if (!approval) {
    throw new Error(
      "The selected Teams funding approval is not present in the trusted feed."
    );
  }
  return approval;
}

function assertCurrentTeamsFundingApproval(
  feed: TeamsFeed | null,
  approvedPeriod: number
) {
  if (!feed || approvedPeriod !== feed.periods.current) {
    throw new Error(
      "Only a current-period Teams funding approval can be used."
    );
  }
}
