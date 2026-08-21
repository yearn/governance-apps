import { describe, expect, it } from "vitest";
import {
  GOVERNANCE_ROUTED_HOST_HEADER,
  resolveRequestHostname,
  resolveRoutedRequestHostname,
} from "@/lib/runtime/request-host";

type HeaderMap = Record<string, string | undefined>;

function makeHeaders(values: HeaderMap) {
  return {
    get(name: string) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}

describe("resolveRequestHostname", () => {
  it("prefers x-forwarded-host when present", () => {
    const headers = makeHeaders({
      "x-forwarded-host": "styfi.yearn.fi, edge.internal",
      host: "localhost:3000",
    });

    expect(resolveRequestHostname(headers, "localhost")).toBe("styfi.yearn.fi");
  });

  it("falls back to host when x-forwarded-host is unavailable", () => {
    const headers = makeHeaders({
      host: "veyfi.yearn.fi:443",
    });

    expect(resolveRequestHostname(headers, "localhost")).toBe(
      "veyfi.yearn.fi:443"
    );
  });

  it("falls back to nextUrl hostname when neither header exists", () => {
    const headers = makeHeaders({});

    expect(resolveRequestHostname(headers, "127.0.0.1")).toBe("127.0.0.1");
  });

  it("does not trust a caller-supplied routed host", () => {
    const headers = makeHeaders({
      [GOVERNANCE_ROUTED_HOST_HEADER]: "dao-beta.dao-ops.com",
      host: "app.dao-ops.com",
    });

    expect(resolveRequestHostname(headers, "localhost")).toBe(
      "app.dao-ops.com"
    );
  });
});

describe("resolveRoutedRequestHostname", () => {
  it("preserves the public host across an internal route rewrite", () => {
    const headers = makeHeaders({
      [GOVERNANCE_ROUTED_HOST_HEADER]: "dao-beta.dao-ops.com",
      "x-forwarded-host": "localhost:3111",
      host: "localhost:3111",
    });

    expect(resolveRoutedRequestHostname(headers, "localhost")).toBe(
      "dao-beta.dao-ops.com"
    );
  });
});
