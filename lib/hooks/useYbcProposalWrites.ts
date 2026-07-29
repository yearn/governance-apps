"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAddress, isAddress, type Address } from "viem";
import { useAccount } from "wagmi";
import {
  OnchainYbcClient,
  parseYbcProposalContractId,
  type YbcProposalType,
  type YbcVoteChoice,
} from "@/lib/clients/ybc";
import type { YbcFeed } from "@/lib/schemas/ybc-feed";
import { ybcKeys } from "@/lib/hooks/ybcKeys";
import type { TxState } from "@/lib/tx/types";
import { useTx } from "@/lib/tx/useTx";

type UseYbcProposalWritesResult = {
  createProposal: (
    type: YbcProposalType,
    targetAddress?: Address | string
  ) => Promise<void>;
  executeProposal: (proposalId: string) => Promise<void>;
  retractProposal: (proposalId: string) => Promise<void>;
  voteOnProposal: (
    proposalId: string,
    choice: YbcVoteChoice
  ) => Promise<void>;
  reset: () => void;
  state: TxState;
};

export function useYbcProposalWrites(
  feed: YbcFeed | null
): UseYbcProposalWritesResult {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { execute, reset, state } = useTx();
  const client = useMemo(
    () => (feed ? new OnchainYbcClient(feed, address ?? null) : null),
    [address, feed]
  );
  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ybcKeys.feed() }),
      queryClient.invalidateQueries({
        queryKey: ybcKeys.walletOverlay(address ?? null),
      }),
    ]);
  }, [address, queryClient]);

  const requireClient = useCallback(() => {
    if (!client) {
      throw new Error("YBC feed is not available for writes.");
    }
    return client;
  }, [client]);

  const createProposal = useCallback(
    async (type: YbcProposalType, targetAddress?: Address | string) => {
      await execute(
        async () => {
          if (!targetAddress || !isAddress(targetAddress)) {
            throw new Error("Enter a valid target address.");
          }

          const target = getAddress(targetAddress) as Address;
          const prepared = await requireClient().preparePropose(
            type,
            target
          );
          return prepared();
        },
        { invalidate }
      );
    },
    [execute, invalidate, requireClient]
  );

  const retractProposal = useCallback(
    async (proposalId: string) => {
      await execute(
        async () => {
          const prepared = await requireClient().prepareRetract(
            parseYbcProposalContractId(proposalId)
          );
          return prepared();
        },
        { invalidate }
      );
    },
    [execute, invalidate, requireClient]
  );

  const voteOnProposal = useCallback(
    async (proposalId: string, choice: YbcVoteChoice) => {
      await execute(
        async () => {
          const prepared = await requireClient().prepareVote(
            parseYbcProposalContractId(proposalId),
            choice
          );
          return prepared();
        },
        { invalidate }
      );
    },
    [execute, invalidate, requireClient]
  );

  const executeProposal = useCallback(
    async (proposalId: string) => {
      await execute(
        async () => {
          const prepared = await requireClient().prepareExecute(
            parseYbcProposalContractId(proposalId)
          );
          return prepared();
        },
        { invalidate }
      );
    },
    [execute, invalidate, requireClient]
  );

  return {
    createProposal,
    executeProposal,
    reset,
    retractProposal,
    state,
    voteOnProposal,
  };
}
