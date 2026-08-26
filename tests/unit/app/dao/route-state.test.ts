import { describe, expect, it } from "vitest";
import {
  createDaoBoardGroupHref,
  createDaoProposalHref,
  parseDaoBoardGroup,
  resolveDaoProposalOrigin,
  type DaoBoardGroupCounts,
} from "@/app/dao/route-state";

const populatedCounts: DaoBoardGroupCounts = {
  active: 2,
  upcoming: 1,
  closed: 4,
};

describe("DAO route state", () => {
  it.each([
    ["https://example.test/dao?group=upcoming", "upcoming"],
    ["https://example.test/dao?group=active", "active"],
    ["https://example.test/dao?group=closed", "closed"],
  ] as const)("honors the valid group in %s", (href, expected) => {
    expect(parseDaoBoardGroup(href, populatedCounts)).toBe(expected);
  });

  it("honors a valid group even when that group is empty", () => {
    expect(
      parseDaoBoardGroup("/dao?group=upcoming", {
        active: 3,
        upcoming: 0,
        closed: 2,
      })
    ).toBe("upcoming");
  });

  it.each([
    [{ active: 2, upcoming: 3, closed: 4 }, "active"],
    [{ active: 0, upcoming: 3, closed: 4 }, "upcoming"],
    [{ active: 0, upcoming: 0, closed: 4 }, "closed"],
    [{ active: 0, upcoming: 0, closed: 0 }, "active"],
  ] as const)(
    "falls back by populated priority for %o",
    (counts, expected) => {
      expect(parseDaoBoardGroup("/dao?group=invalid", counts)).toBe(expected);
      expect(parseDaoBoardGroup("/dao", counts)).toBe(expected);
    }
  );

  it("builds canonical board and proposal links without dropping unrelated state", () => {
    expect(
      createDaoBoardGroupHref("/dao?trace=1&group=active#old", "closed")
    ).toBe("/dao?trace=1&group=closed");
    expect(createDaoProposalHref(12n, "closed")).toBe(
      "/dao/proposals/12?from=closed"
    );
  });

  it("builds clean beta-host board and nested proposal links", () => {
    expect(
      createDaoBoardGroupHref(
        "https://dao-beta.dao-ops.com/?trace=1&group=active#old",
        "closed"
      )
    ).toBe("/?trace=1&group=closed");
    expect(
      createDaoProposalHref(12n, "closed", "dao-beta.dao-ops.com")
    ).toBe("/proposals/12?from=closed");
  });

  it("cross-links beta surfaces to the guarded DAO beta host", () => {
    expect(
      createDaoProposalHref(12n, "closed", "teams-beta.dao-ops.com")
    ).toBe("https://dao-beta.dao-ops.com/proposals/12?from=closed");
  });

  it("uses a valid proposal origin and otherwise derives the proposal group", () => {
    expect(resolveDaoProposalOrigin("closed", "active")).toBe("closed");
    expect(resolveDaoProposalOrigin("not-a-group", "upcoming")).toBe(
      "upcoming"
    );
    expect(resolveDaoProposalOrigin(null, "closed")).toBe("closed");
  });
});
