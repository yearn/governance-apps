import { describe, expect, it } from "vitest";
import { parseDaoProposalId } from "@/lib/hooks/useDao";

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
});
