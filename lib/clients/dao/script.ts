import { keccak256, type Address, type Hex } from "viem";
import type {
  DaoProposalType,
  DaoScriptCheck,
  DaoScriptError,
  DaoScriptErrorCode,
  DaoScriptFrame,
} from "./types";

export const DAO_EXECUTOR_HEADER_BYTES = 32;
export const DAO_EXECUTOR_MAX_CALLS = 64;
export const DAO_EXECUTOR_MAX_SCRIPT_BYTES = 2_048;

const TARGET_HEX_LENGTH = 40;
const CALLDATA_LENGTH_HEX_LENGTH = 24;

export function checkDaoExecutorScript(
  script: string,
  proposalType?: DaoProposalType
): DaoScriptCheck {
  const syntaxError = validateHexSyntax(script);
  if (syntaxError) {
    return invalidCheck(script, null, null, [], syntaxError);
  }

  const hex = script as Hex;
  const scriptBytes = (script.length - 2) / 2;
  const scriptHash = keccak256(hex);

  const excessCallOffset = findExcessCallOffset(script);
  if (excessCallOffset !== null) {
    return invalidCheck(script, scriptBytes, scriptHash, [], {
      code: "TOO_MANY_CALLS",
      message: `Executor scripts support at most ${DAO_EXECUTOR_MAX_CALLS} calls.`,
      offset: excessCallOffset,
    });
  }

  if (scriptBytes > DAO_EXECUTOR_MAX_SCRIPT_BYTES) {
    return invalidCheck(script, scriptBytes, scriptHash, [], {
      code: "SCRIPT_TOO_LARGE",
      message: `Executor scripts cannot exceed ${DAO_EXECUTOR_MAX_SCRIPT_BYTES} bytes.`,
      offset: DAO_EXECUTOR_MAX_SCRIPT_BYTES,
    });
  }

  if (scriptBytes === 0) {
    if (proposalType === "executable") {
      return invalidCheck(script, scriptBytes, scriptHash, [], {
        code: "EMPTY_EXECUTABLE_SCRIPT",
        message: "Executable proposals require at least one call.",
        offset: 0,
      });
    }

    return {
      state: "empty",
      script,
      scriptBytes,
      scriptHash,
      frames: [],
      error: null,
    };
  }

  const frames: DaoScriptFrame[] = [];
  let offset = 0;

  while (offset < scriptBytes) {
    const remainingBytes = scriptBytes - offset;
    if (remainingBytes < DAO_EXECUTOR_HEADER_BYTES) {
      const code: DaoScriptErrorCode =
        frames.length === 0 ? "TRUNCATED_HEADER" : "TRAILING_BYTES";
      return invalidCheck(script, scriptBytes, scriptHash, frames, {
        code,
        message:
          code === "TRUNCATED_HEADER"
            ? "The first Executor header is incomplete."
            : "Bytes remain after the final complete Executor call.",
        offset,
      });
    }

    const headerOffset = offset;
    const headerStart = 2 + headerOffset * 2;
    const header = script.slice(
      headerStart,
      headerStart + DAO_EXECUTOR_HEADER_BYTES * 2
    );
    const target = `0x${header.slice(0, TARGET_HEX_LENGTH)}` as Address;
    const calldataBytesBigInt = BigInt(
      `0x${header.slice(
        TARGET_HEX_LENGTH,
        TARGET_HEX_LENGTH + CALLDATA_LENGTH_HEX_LENGTH
      )}`
    );
    const calldataOffset = headerOffset + DAO_EXECUTOR_HEADER_BYTES;
    const availableCalldataBytes = scriptBytes - calldataOffset;

    if (calldataBytesBigInt > BigInt(availableCalldataBytes)) {
      return invalidCheck(script, scriptBytes, scriptHash, frames, {
        code: "CALLDATA_OUT_OF_BOUNDS",
        message:
          `Call ${frames.length + 1} declares ` +
          `${calldataBytesBigInt.toString()} calldata bytes, but only ` +
          `${availableCalldataBytes} remain.`,
        offset: calldataOffset,
      });
    }

    const calldataBytes = Number(calldataBytesBigInt);
    const calldataStart = 2 + calldataOffset * 2;
    const calldata = `0x${script.slice(
      calldataStart,
      calldataStart + calldataBytes * 2
    )}` as Hex;
    const selector =
      calldataBytes >= 4 ? (calldata.slice(0, 10) as Hex) : null;

    frames.push({
      index: frames.length,
      offset: headerOffset,
      target,
      calldata,
      calldataBytes,
      selector,
    });
    offset = calldataOffset + calldataBytes;
  }

  if (proposalType === "signal") {
    return invalidCheck(script, scriptBytes, scriptHash, frames, {
      code: "NON_EMPTY_SIGNAL_SCRIPT",
      message: "Signal proposals must use the empty Executor script.",
      offset: 0,
    });
  }

  return {
    state: "valid",
    script,
    scriptBytes,
    scriptHash,
    frames,
    error: null,
  };
}

function validateHexSyntax(script: string): DaoScriptError | null {
  if (!script.startsWith("0x")) {
    return {
      code: "INVALID_HEX",
      message: "Executor scripts must be 0x-prefixed hexadecimal bytes.",
      offset: null,
    };
  }

  const digits = script.slice(2);
  const invalidCharacterIndex = digits.search(/[^0-9a-fA-F]/);
  if (invalidCharacterIndex >= 0) {
    return {
      code: "INVALID_HEX",
      message: "Executor scripts may contain only hexadecimal characters.",
      offset: Math.floor(invalidCharacterIndex / 2),
    };
  }
  if (digits.length % 2 !== 0) {
    return {
      code: "ODD_HEX_LENGTH",
      message: "Executor scripts must contain complete bytes.",
      offset: Math.floor(digits.length / 2),
    };
  }
  return null;
}

/**
 * Call-count validation intentionally precedes the byte limit. Since 65 empty
 * headers already occupy 2,080 bytes, this precedence keeps both contract
 * limits independently diagnosable with fixed vectors.
 */
function findExcessCallOffset(script: string): number | null {
  const scriptBytes = (script.length - 2) / 2;
  let offset = 0;
  let calls = 0;

  while (offset < scriptBytes) {
    const remainingBytes = scriptBytes - offset;
    if (remainingBytes < DAO_EXECUTOR_HEADER_BYTES) return null;
    if (calls === DAO_EXECUTOR_MAX_CALLS) return offset;

    const headerStart = 2 + offset * 2;
    const lengthStart = headerStart + TARGET_HEX_LENGTH;
    const calldataBytes = BigInt(
      `0x${script.slice(
        lengthStart,
        lengthStart + CALLDATA_LENGTH_HEX_LENGTH
      )}`
    );
    offset += DAO_EXECUTOR_HEADER_BYTES;
    if (calldataBytes > BigInt(scriptBytes - offset)) return null;
    offset += Number(calldataBytes);
    calls += 1;
  }

  return null;
}

function invalidCheck(
  script: string,
  scriptBytes: number | null,
  scriptHash: Hex | null,
  frames: DaoScriptFrame[],
  error: DaoScriptError
): DaoScriptCheck {
  return {
    state: "invalid",
    script,
    scriptBytes,
    scriptHash,
    frames,
    error,
  };
}
