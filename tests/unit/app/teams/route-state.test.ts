import { describe, expect, it } from "vitest";
import {
  createTeamsRouteHref,
  findTeamByRouteAddress,
  getCanonicalTeamsRouteHref,
  getTeamsTopSection,
  isTeamsAdminRouteRequest,
  parseTeamsRouteState,
} from "@/app/teams/route-state";
import type { TeamRecord } from "@/lib/clients/teams";

const TEAM_ADDRESS = "0x1111111111111111111111111111111111111111";

describe("Teams route state", () => {
  it("restores a normalized team contract and inner section from the URL", () => {
    expect(
      parseTeamsRouteState(
        `/teams?section=funding&team=${TEAM_ADDRESS.toUpperCase().replace("0X", "0x")}`
      )
    ).toEqual({
      section: "funding",
      teamAddress: TEAM_ADDRESS,
    });
  });

  it("does not select a team when the URL has no team key", () => {
    expect(parseTeamsRouteState("/teams")).toEqual({
      section: "directory",
      teamAddress: null,
    });
    expect(parseTeamsRouteState("/teams?section=overview")).toEqual({
      section: "directory",
      teamAddress: null,
    });
  });

  it("ignores hash routes without overriding canonical query state", () => {
    expect(parseTeamsRouteState("/teams#revenue")).toEqual({
      section: "directory",
      teamAddress: null,
    });
    expect(
      parseTeamsRouteState(
        `/teams?team=${TEAM_ADDRESS}#revenue`
      )
    ).toEqual({
      section: "directory",
      teamAddress: null,
    });
    expect(
      parseTeamsRouteState(
        `/teams?section=bonus&team=${TEAM_ADDRESS}#revenue`
      )
    ).toEqual({
      section: "bonus",
      teamAddress: TEAM_ADDRESS,
    });
  });

  it("keeps the admin route role-gated", () => {
    expect(parseTeamsRouteState("/teams?section=admin")).toEqual({
      section: "directory",
      teamAddress: null,
    });
    expect(
      parseTeamsRouteState("/teams?section=admin", { canUseAdmin: true })
    ).toEqual({
      section: "admin",
      teamAddress: null,
    });
    expect(
      parseTeamsRouteState("/teams#admin", { canUseAdmin: true })
    ).toEqual({
      section: "directory",
      teamAddress: null,
    });
    expect(isTeamsAdminRouteRequest("/teams?section=admin")).toBe(true);
    expect(isTeamsAdminRouteRequest("/teams#admin")).toBe(false);
    expect(
      parseTeamsRouteState("/teams?section=admin", {
        canUseAdmin: false,
        adminAuthorizationReady: false,
      })
    ).toEqual({
      section: "admin",
      teamAddress: null,
    });
  });

  it("fails malformed and oversized team query values back to the directory", () => {
    for (const team of [
      "<script>",
      "0x1234",
      `0x${"1".repeat(41)}`,
      `0x${"1".repeat(4_096)}`,
    ]) {
      expect(
        parseTeamsRouteState(
          `/teams?section=overview&team=${encodeURIComponent(team)}`
        )
      ).toEqual({
        section: "directory",
        teamAddress: null,
      });
    }
  });

  it("builds canonical history-safe links while preserving unrelated query state", () => {
    expect(
      createTeamsRouteHref("/teams?debug=1#ignored", {
        section: "revenue",
        teamAddress: TEAM_ADDRESS.toUpperCase().replace("0X", "0x"),
      })
    ).toBe(`/teams?debug=1&section=revenue&team=${TEAM_ADDRESS}`);

    expect(
      createTeamsRouteHref(
        `/teams?section=revenue&team=${TEAM_ADDRESS}`,
        {
          section: "directory",
          teamAddress: null,
        }
      )
    ).toBe("/teams");
  });

  it("canonicalizes invalid and hashed routes without dropping safe query state", () => {
    const invalidState = parseTeamsRouteState(
      "/teams?trace=1&section=overview&team=not-an-address"
    );
    expect(
      getCanonicalTeamsRouteHref(
        "/teams?trace=1&section=overview&team=not-an-address",
        invalidState
      )
    ).toBe("/teams?trace=1");

    const unscopedState = parseTeamsRouteState(
      "/teams?trace=1&section=funding"
    );
    expect(
      getCanonicalTeamsRouteHref(
        "/teams?trace=1&section=funding",
        unscopedState
      )
    ).toBe("/teams?trace=1");

    const hashedState = parseTeamsRouteState(
      `/teams?trace=1&team=${TEAM_ADDRESS}#revenue`
    );
    expect(
      getCanonicalTeamsRouteHref(
        `/teams?trace=1&team=${TEAM_ADDRESS}#revenue`,
        hashedState
      )
    ).toBe("/teams?trace=1");
  });

  it("drops stale team context outside a workspace route", () => {
    expect(
      parseTeamsRouteState(`/teams?team=${TEAM_ADDRESS}`)
    ).toEqual({
      section: "directory",
      teamAddress: null,
    });

    expect(
      getCanonicalTeamsRouteHref(
        `/teams?team=${TEAM_ADDRESS}`,
        {
          section: "directory",
          teamAddress: null,
        }
      )
    ).toBe("/teams");

    expect(
      parseTeamsRouteState(
        `/teams?section=admin&team=${TEAM_ADDRESS}`,
        {
          canUseAdmin: true,
          adminAuthorizationReady: true,
        }
      )
    ).toEqual({
      section: "admin",
      teamAddress: null,
    });
  });

  it("canonicalizes address casing and leaves canonical routes untouched", () => {
    const address = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
    const mixedCaseAddress = "0xAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCdEfAbCd";
    const state = parseTeamsRouteState(
      `/teams?section=overview&team=${mixedCaseAddress}`
    );

    expect(state.teamAddress).toBe(address);
    expect(
      getCanonicalTeamsRouteHref(
        `/teams?section=overview&team=${mixedCaseAddress}`,
        state
      )
    ).toBe(`/teams?section=overview&team=${address}`);
    expect(
      getCanonicalTeamsRouteHref(
        `/teams?section=overview&team=${address}`,
        state
      )
    ).toBeNull();
    expect(
      getCanonicalTeamsRouteHref("/teams", {
        section: "directory",
        teamAddress: null,
      })
    ).toBeNull();
  });

  it("refuses to serialize an invalid programmatic team address", () => {
    expect(() =>
      createTeamsRouteHref("/teams", {
        section: "overview",
        teamAddress: "research",
      })
    ).toThrow("Cannot build a Teams route with an invalid team address.");
  });

  it("matches teams by stable address instead of mutable display IDs", () => {
    const team = {
      id: "renamed-team",
      address: TEAM_ADDRESS,
    } as TeamRecord;

    expect(findTeamByRouteAddress([team], TEAM_ADDRESS)).toBe(team);
    expect(
      findTeamByRouteAddress([team], "0x2222222222222222222222222222222222222222")
    ).toBeNull();
  });

  it("maps inner sections to the workspace tab", () => {
    expect(getTeamsTopSection("directory")).toBe("directory");
    expect(getTeamsTopSection("admin")).toBe("admin");
    expect(getTeamsTopSection("lifecycle")).toBe("workspace");
  });
});
