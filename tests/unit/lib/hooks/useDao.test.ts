import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { DAO_MOCK_FEED, serializeDaoProposalRef } from "@/lib/clients/dao";
import { daoKeys } from "@/lib/hooks/daoKeys";
import {
  parseDaoProposalId,
  resolveActiveDaoProposalRef,
} from "@/lib/hooks/useDao";

describe("parseDaoProposalId", () => {
  it("accepts canonical unsigned proposal IDs", () => {
    expect(parseDaoProposalId("0")).toBe(0n);
    expect(parseDaoProposalId("22")).toBe(22n);
  });

  it("rejects ambiguous or non-numeric route IDs", () => {
    for (const value of ["", "01", "-1", "+1", "1.0", " 1", "proposal"]) {
      expect(parseDaoProposalId(value)).toBeNull();
    }
  });

  it("derives the composite proposal identity from the active feed contract", () => {
    const ref = resolveActiveDaoProposalRef(DAO_MOCK_FEED, 2n);
    const activeContract = DAO_MOCK_FEED.contracts.find(
      (contract) => contract.active
    );
    if (!activeContract) {
      throw new Error("The DAO mock feed requires an active Voting contract.");
    }

    expect(ref).toEqual({
      chainId: DAO_MOCK_FEED.chainId,
      votingAddress: activeContract.votingAddress,
      proposalId: 2n,
    });
  });

  it("does not reuse a numeric proposal ID across chains or Voting contracts", () => {
    const votingAddress =
      "0x1111111111111111111111111111111111111111" as Address;
    const replacementVotingAddress =
      "0x2222222222222222222222222222222222222222" as Address;
    const mainnetRef = { chainId: 1, votingAddress, proposalId: 2n };
    const otherChainRef = { chainId: 10, votingAddress, proposalId: 2n };
    const replacementContractRef = {
      chainId: 1,
      votingAddress: replacementVotingAddress,
      proposalId: 2n,
    };

    expect(daoKeys.proposal(mainnetRef)).toEqual([
      "dao",
      "proposal",
      serializeDaoProposalRef(mainnetRef),
    ]);
    expect(daoKeys.proposal(otherChainRef)).not.toEqual(
      daoKeys.proposal(mainnetRef)
    );
    expect(daoKeys.proposal(replacementContractRef)).not.toEqual(
      daoKeys.proposal(mainnetRef)
    );

    const queryClient = new QueryClient();
    queryClient.setQueryData(daoKeys.proposal(mainnetRef), "mainnet result");

    expect(
      queryClient.getQueryData(daoKeys.proposal(otherChainRef))
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(daoKeys.proposal(replacementContractRef))
    ).toBeUndefined();
  });
});
