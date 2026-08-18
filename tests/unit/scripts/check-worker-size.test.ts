import { describe, expect, it } from "vitest";
import {
  CLOUDFLARE_PAID_LIMIT_KIB,
  DEFAULT_LIMIT_KIB,
  DEFAULT_WARN_KIB,
  evaluateWorkerSize,
  parseWorkerUploadSize,
} from "../../../scripts/check-worker-size.mjs";

describe("check-worker-size", () => {
  it("parses Wrangler Total Upload output", () => {
    const size = parseWorkerUploadSize(
      "Total Upload: 15198.55 KiB / gzip: 3087.38 KiB"
    );

    expect(size).toEqual({
      rawKiB: 15198.55,
      gzipKiB: 3087.38,
    });
  });

  it("reserves headroom below the Cloudflare Workers Paid limit", () => {
    expect(CLOUDFLARE_PAID_LIMIT_KIB).toBe(10240);
    expect(DEFAULT_LIMIT_KIB).toBe(9216);
    expect(DEFAULT_WARN_KIB).toBe(7680);
  });

  it("fails when the gzip size exceeds the hard budget", () => {
    expect(
      evaluateWorkerSize({
        gzipKiB: 9300,
        limitKiB: DEFAULT_LIMIT_KIB,
        warnKiB: DEFAULT_WARN_KIB,
      })
    ).toMatchObject({ status: "fail" });
  });

  it("warns above the warning threshold while staying under the limit", () => {
    expect(
      evaluateWorkerSize({
        gzipKiB: 8000,
        limitKiB: DEFAULT_LIMIT_KIB,
        warnKiB: DEFAULT_WARN_KIB,
      })
    ).toMatchObject({ status: "warn" });
  });

  it("passes when the gzip size is below the warning threshold", () => {
    expect(
      evaluateWorkerSize({
        gzipKiB: 7000,
        limitKiB: DEFAULT_LIMIT_KIB,
        warnKiB: DEFAULT_WARN_KIB,
      })
    ).toMatchObject({ status: "pass" });
  });
});
