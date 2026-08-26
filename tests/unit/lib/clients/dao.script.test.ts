import { describe, expect, it } from "vitest";
import { keccak256, type Hex } from "viem";
import {
  checkDaoExecutorScript,
  DAO_EXECUTOR_MAX_CALLS,
  DAO_EXECUTOR_SCRIPT_ERROR_VECTORS,
  DAO_EXECUTOR_VALID_SCRIPT_VECTORS,
  type DaoScriptErrorCode,
} from "@/lib/clients/dao";

describe("DAO Executor script parser", () => {
  it("parses the 20-byte target, low-12-byte length, calldata, and selector", () => {
    const target = "11".repeat(20);
    const length = "4".padStart(24, "0");
    const script = `0x${target}${length}deadbeef`;

    const result = checkDaoExecutorScript(script, "executable");

    expect(result).toEqual({
      state: "valid",
      script,
      scriptBytes: 36,
      scriptHash: keccak256(script as Hex),
      frames: [
        {
          index: 0,
          offset: 0,
          target: `0x${target}`,
          calldata: "0xdeadbeef",
          calldataBytes: 4,
          selector: "0xdeadbeef",
        },
      ],
      error: null,
    });
  });

  it("preserves ordered frame offsets through exact end-of-script parsing", () => {
    const result = checkDaoExecutorScript(
      DAO_EXECUTOR_VALID_SCRIPT_VECTORS.twoCalls.script,
      "executable"
    );

    expect(result.state).toBe("valid");
    expect(result.frames.map((frame) => frame.offset)).toEqual([0, 36]);
    expect(result.frames.map((frame) => frame.calldataBytes)).toEqual([4, 4]);
    expect(result.frames.map((frame) => frame.target)).toEqual([
      "0x1111111111111111111111111111111111111111",
      "0x1111111111111111111111111111111111111111",
    ]);
    expect(result.frames.map((frame) => frame.selector)).toEqual([
      "0x900cf0cf",
      "0x42cde4e8",
    ]);
  });

  it("accepts exactly 64 empty calls and rejects a 65th call", () => {
    const tooMany = DAO_EXECUTOR_SCRIPT_ERROR_VECTORS.find(
      (vector) => vector.expectedCode === "TOO_MANY_CALLS"
    );
    if (!tooMany) throw new Error("Missing TOO_MANY_CALLS vector.");
    const oneHeaderHexLength = 64;
    const exactly64 = tooMany.script.slice(0, -oneHeaderHexLength);

    const valid = checkDaoExecutorScript(exactly64, "executable");
    const invalid = checkDaoExecutorScript(tooMany.script, "executable");

    expect(valid.state).toBe("valid");
    expect(valid.frames).toHaveLength(DAO_EXECUTOR_MAX_CALLS);
    expect(invalid.error?.code).toBe("TOO_MANY_CALLS");
  });

  it("reports the actual 65th-header offset when earlier calls contain calldata", () => {
    const firstCall = `${"00".repeat(20)}${"1".padStart(24, "0")}00`;
    const emptyCall = `${"00".repeat(32)}`;
    const script = `0x${firstCall}${emptyCall.repeat(64)}`;

    const result = checkDaoExecutorScript(script, "executable");

    expect(result.error).toMatchObject({
      code: "TOO_MANY_CALLS",
      offset: 2_049,
    });
  });

  it("pins every parser error code and byte offset with fixed vectors", () => {
    const seen = new Set<DaoScriptErrorCode>();

    for (const vector of DAO_EXECUTOR_SCRIPT_ERROR_VECTORS) {
      const result = checkDaoExecutorScript(
        vector.script,
        vector.proposalType
      );
      expect(result.state, vector.expectedCode).toBe("invalid");
      expect(result.error?.code, vector.expectedCode).toBe(vector.expectedCode);
      expect(result.error?.offset, vector.expectedCode).toBe(
        vector.expectedOffset
      );
      seen.add(vector.expectedCode);
    }

    expect(seen).toEqual(
      new Set<DaoScriptErrorCode>([
        "INVALID_HEX",
        "ODD_HEX_LENGTH",
        "SCRIPT_TOO_LARGE",
        "TRUNCATED_HEADER",
        "CALLDATA_OUT_OF_BOUNDS",
        "TOO_MANY_CALLS",
        "TRAILING_BYTES",
        "EMPTY_EXECUTABLE_SCRIPT",
        "NON_EMPTY_SIGNAL_SCRIPT",
      ])
    );
  });

  it("does not fabricate a byte count or hash for malformed syntax", () => {
    const result = checkDaoExecutorScript("0xgg");

    expect(result).toMatchObject({
      state: "invalid",
      scriptBytes: null,
      scriptHash: null,
      frames: [],
      error: { code: "INVALID_HEX", offset: 0 },
    });
  });

  it("retains complete frames before reporting trailing bytes", () => {
    const vector = DAO_EXECUTOR_SCRIPT_ERROR_VECTORS.find(
      (candidate) => candidate.expectedCode === "TRAILING_BYTES"
    );
    if (!vector) throw new Error("Missing TRAILING_BYTES vector.");

    const result = checkDaoExecutorScript(vector.script);

    expect(result.frames).toHaveLength(1);
    expect(result.error?.offset).toBe(32);
  });
});
