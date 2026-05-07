import { describe, expect, it } from "vitest";
import {
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

  it("fails when the gzip size exceeds the hard budget", () => {
    expect(
      evaluateWorkerSize({
        gzipKiB: 3087.38,
        limitKiB: 3072,
        warnKiB: 2900,
      })
    ).toMatchObject({ status: "fail" });
  });

  it("warns above the warning threshold while staying under the limit", () => {
    expect(
      evaluateWorkerSize({
        gzipKiB: 2930,
        limitKiB: 3072,
        warnKiB: 2900,
      })
    ).toMatchObject({ status: "warn" });
  });

  it("passes when the gzip size is below the warning threshold", () => {
    expect(
      evaluateWorkerSize({
        gzipKiB: 2890,
        limitKiB: 3072,
        warnKiB: 2900,
      })
    ).toMatchObject({ status: "pass" });
  });
});
