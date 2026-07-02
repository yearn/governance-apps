"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAddress, isAddress, parseUnits, type Address } from "viem";
import { useAccount } from "wagmi";
import { OnchainTeamsClient } from "@/lib/clients/teams/onchain";
import type { FundingApproval, TeamRecord } from "@/lib/clients/teams/types";
import type { TeamsFeed } from "@/lib/schemas/teams-feed";
import { teamsKeys } from "@/lib/hooks/teamsKeys";
import type { TxState } from "@/lib/tx/types";
import { useTx } from "@/lib/tx/useTx";

type TeamsWriteResult = {
  depositRevenue: (
    team: TeamRecord,
    tokenAddress: string,
    amount: string,
    decimals: number
  ) => Promise<void>;
  claimFunding: (
    team: TeamRecord,
    approval: FundingApproval,
    amount: string,
    recipient: string
  ) => Promise<void>;
  returnFunding: (
    team: TeamRecord,
    approval: FundingApproval,
    amount: string
  ) => Promise<void>;
  claimBonus: (team: TeamRecord, recipient: string) => Promise<void>;
  state: TxState;
};

export function useTeamsWrites(feed: TeamsFeed | null): TeamsWriteResult {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { execute, state } = useTx();
  const client = useMemo(
    () => (feed ? new OnchainTeamsClient(feed, address ?? null) : null),
    [address, feed]
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

  const getTokenDecimals = useCallback(
    (tokenAddress: string) => {
      const token = feed?.tokens[getAddress(tokenAddress)];
      if (token) return token.decimals;

      const lowerToken = tokenAddress.toLowerCase();
      const fallback = Object.values(feed?.tokens ?? {}).find(
        (entry) => entry.address.toLowerCase() === lowerToken
      );
      return fallback?.decimals ?? 18;
    },
    [feed]
  );

  const depositRevenue = useCallback(
    async (
      team: TeamRecord,
      tokenAddress: string,
      amount: string,
      decimals: number
    ) => {
      const token = parseAddress(tokenAddress, "revenue token");
      const amountRaw = parseTeamsAmount(amount, decimals);
      const prepare = await requireClient().prepareRevenueDeposit(
        parseAddress(team.address, "team"),
        token,
        amountRaw
      );
      await execute(prepare, {
        invalidate,
      });
    },
    [execute, invalidate, requireClient]
  );

  const claimFunding = useCallback(
    async (
      team: TeamRecord,
      approval: FundingApproval,
      amount: string,
      recipient: string
    ) => {
      const prepare = await requireClient().prepareFundingClaim(
        parseAddress(team.address, "team"),
        BigInt(approval.idx),
        parseTeamsAmount(amount, getTokenDecimals(approval.tokenAddress)),
        parseAddress(recipient, "recipient")
      );
      await execute(prepare, {
        invalidate,
      });
    },
    [execute, getTokenDecimals, invalidate, requireClient]
  );

  const returnFunding = useCallback(
    async (team: TeamRecord, approval: FundingApproval, amount: string) => {
      const prepare = await requireClient().prepareFundingReturn(
        parseAddress(team.address, "team"),
        BigInt(approval.idx),
        parseTeamsAmount(amount, getTokenDecimals(approval.tokenAddress))
      );
      await execute(prepare, {
        invalidate,
      });
    },
    [execute, getTokenDecimals, invalidate, requireClient]
  );

  const claimBonus = useCallback(
    async (team: TeamRecord, recipient: string) => {
      const prepare = await requireClient().prepareBonusClaim(
        parseAddress(team.address, "team"),
        parseAddress(recipient, "recipient")
      );
      await execute(prepare, {
        invalidate,
      });
    },
    [execute, invalidate, requireClient]
  );

  return {
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
