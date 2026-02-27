import { describe, expect, it } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionResult,
  type Address,
  type Hex,
} from "viem";
import {
  ERC20_TRANSFER_ABI,
  ERC4626_DEPOSIT_ABI,
  ERC4626_WITHDRAW_ABI,
  LEGACY_VEYFI_LOCKED_ABI,
  LEGACY_VEYFI_MODIFY_LOCK_ABI,
  LEGACY_VEYFI_PENALTY_ABI,
  LEGACY_VEYFI_WITHDRAW_ABI,
  LIQUID_LOCKER_EXCHANGE_ABI,
  LIQUID_LOCKER_REDEEM_ABI,
  VEYFI_DISTRIBUTOR_MIGRATE_ABI,
} from "@/workers/alerts-bot/src/abis";
import {
  LIQUID_LOCKER_REDEMPTION,
  LIQUID_LOCKERS,
  STYFI,
  VEYFI,
  VEYFI_REWARD_DISTRIBUTOR,
} from "@/workers/alerts-bot/src/contracts";
import { scanChunkForActions } from "@/workers/alerts-bot/src/index";
import type { RpcClient, RpcLog } from "@/workers/alerts-bot/src/rpc";

const ONE = 10n ** 18n;

function hashOf(index: number): Hex {
  return `0x${index.toString(16).padStart(64, "0")}`;
}

function userOf(index: number): Address {
  return `0x${index.toString(16).padStart(40, "0")}` as Address;
}

function createLog(params: {
  address: Address;
  topics: readonly (Hex | readonly Hex[] | null)[];
  data: Hex;
  txHash: Hex;
  blockNumber: number;
  logIndex: number;
}): RpcLog {
  const normalizedTopics = params.topics.map((topic, index) => {
    if (topic === null) {
      throw new Error(`Fixture contains null topic at index ${index}`);
    }

    if (Array.isArray(topic)) {
      if (topic.length !== 1) {
        throw new Error(
          `Fixture contains topic OR set at index ${index}; expected a concrete topic`,
        );
      }
      return topic[0];
    }

    return topic;
  });

  return {
    address: params.address,
    topics: normalizedTopics,
    data: params.data,
    blockNumber: params.blockNumber,
    transactionHash: params.txHash,
    logIndex: params.logIndex,
    removed: false,
  };
}

function createMockRpc(params: {
  logs: RpcLog[];
  callByBlock?: Record<number, { amount: bigint; end: bigint }>;
  txFromByHash?: Record<string, Address>;
  callError?: Error;
}): RpcClient {
  const callByBlock = params.callByBlock ?? {};
  const txFromByHash = params.txFromByHash ?? {};

  const rpc = {
    getBlockNumber: async () => {
      throw new Error("Not implemented in test");
    },
    getBlockByNumber: async () => {
      throw new Error("Not implemented in test");
    },
    getLogs: async () => params.logs,
    call: async (_request: { to: string; data: string }, blockNumber?: number) => {
      if (params.callError) {
        throw params.callError;
      }

      const block = typeof blockNumber === "number" ? blockNumber : -1;
      const lock = callByBlock[block];
      if (!lock) {
        throw new Error(`No locked() fixture for block ${block}`);
      }

      return encodeFunctionResult({
        abi: LEGACY_VEYFI_LOCKED_ABI,
        functionName: "locked",
        result: [lock.amount, lock.end],
      });
    },
    getTransactionByHash: async (hashOrHashes: string | string[]) => {
      const toTx = (hash: string) => {
        const from = txFromByHash[hash.toLowerCase()];
        if (!from) {
          return null;
        }

        return {
          hash,
          from,
          to: null,
          blockHash: null,
          blockNumber: 0,
          nonce: 0,
          transactionIndex: 0,
          value: "0x0",
          input: "0x",
        };
      };

      if (typeof hashOrHashes === "string") {
        return toTx(hashOrHashes);
      }

      return hashOrHashes.map((hash) => toTx(hash));
    },
    getTransactionReceipt: async () => {
      throw new Error("Not implemented in test");
    },
  } as unknown as RpcClient;

  return rpc;
}

describe("alerts-bot scanner fixtures", () => {
  it("decodes all monitored action kinds deterministically", async () => {
    const sdLocker = LIQUID_LOCKERS.find((locker) => locker.symbol === "sdYFI");
    const upLocker = LIQUID_LOCKERS.find((locker) => locker.symbol === "upYFI");
    const coveLocker = LIQUID_LOCKERS.find((locker) => locker.symbol === "coveYFI");
    if (!sdLocker || !upLocker || !coveLocker) {
      throw new Error("Missing expected liquid locker configuration");
    }

    const user1 = userOf(1);
    const user2 = userOf(2);
    const user3 = userOf(3);
    const user4 = userOf(4);
    const user5 = userOf(5);
    const user6 = userOf(6);
    const user7 = userOf(7);
    const user8 = userOf(8);
    const user9 = userOf(9);
    const user10 = userOf(10);
    const treasury = userOf(11);

    const upSharesForCooldown = 3_702_902_400_000_000n;
    const upAssetsForCooldown = upSharesForCooldown * upLocker.scale;

    const logs: RpcLog[] = [
      createLog({
        address: STYFI,
        topics: encodeEventTopics({
          abi: ERC4626_DEPOSIT_ABI,
          eventName: "Deposit",
          args: { sender: user1, owner: user1 },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [10n * ONE, 10n * ONE],
        ),
        txHash: hashOf(1),
        blockNumber: 10,
        logIndex: 0,
      }),
      createLog({
        address: STYFI,
        topics: encodeEventTopics({
          abi: ERC20_TRANSFER_ABI,
          eventName: "Transfer",
          args: {
            sender: user1,
            receiver: "0x0000000000000000000000000000000000000000",
          },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [2n * ONE]),
        txHash: hashOf(2),
        blockNumber: 11,
        logIndex: 0,
      }),
      createLog({
        address: STYFI,
        topics: encodeEventTopics({
          abi: ERC4626_WITHDRAW_ABI,
          eventName: "Withdraw",
          args: { sender: user1, receiver: user1, owner: user1 },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [1n * ONE, 1n * ONE],
        ),
        txHash: hashOf(3),
        blockNumber: 12,
        logIndex: 0,
      }),
      createLog({
        address: upLocker.depositor,
        topics: encodeEventTopics({
          abi: ERC4626_DEPOSIT_ABI,
          eventName: "Deposit",
          args: { sender: user2, owner: user2 },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [7n * ONE, 7n * ONE],
        ),
        txHash: hashOf(4),
        blockNumber: 13,
        logIndex: 0,
      }),
      createLog({
        address: upLocker.depositor,
        topics: encodeEventTopics({
          abi: ERC20_TRANSFER_ABI,
          eventName: "Transfer",
          args: {
            sender: user2,
            receiver: "0x0000000000000000000000000000000000000000",
          },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [upSharesForCooldown]),
        txHash: hashOf(5),
        blockNumber: 14,
        logIndex: 0,
      }),
      createLog({
        address: coveLocker.depositor,
        topics: encodeEventTopics({
          abi: ERC4626_WITHDRAW_ABI,
          eventName: "Withdraw",
          args: { sender: user3, receiver: user3, owner: user3 },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [2n * ONE, 2n * ONE],
        ),
        txHash: hashOf(6),
        blockNumber: 15,
        logIndex: 0,
      }),
      createLog({
        address: LIQUID_LOCKER_REDEMPTION,
        topics: encodeEventTopics({
          abi: LIQUID_LOCKER_REDEEM_ABI,
          eventName: "Redeem",
          args: { token: upLocker.token },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [4n * ONE, ONE / 5n],
        ),
        txHash: hashOf(7),
        blockNumber: 16,
        logIndex: 0,
      }),
      createLog({
        address: LIQUID_LOCKER_REDEMPTION,
        topics: encodeEventTopics({
          abi: LIQUID_LOCKER_EXCHANGE_ABI,
          eventName: "Exchange",
          args: { token: sdLocker.token },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [3n * ONE]),
        txHash: hashOf(8),
        blockNumber: 17,
        logIndex: 0,
      }),
      createLog({
        address: VEYFI_REWARD_DISTRIBUTOR,
        topics: encodeEventTopics({
          abi: VEYFI_DISTRIBUTOR_MIGRATE_ABI,
          eventName: "Migrate",
          args: { account: user5 },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [123n, 9n * ONE],
        ),
        txHash: hashOf(9),
        blockNumber: 18,
        logIndex: 0,
      }),
      createLog({
        address: VEYFI,
        topics: encodeEventTopics({
          abi: LEGACY_VEYFI_MODIFY_LOCK_ABI,
          eventName: "ModifyLock",
          args: { sender: user6, user: user6 },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
          [3n * ONE, 2_000_000n, 1_900_000n],
        ),
        txHash: hashOf(10),
        blockNumber: 20,
        logIndex: 0,
      }),
      createLog({
        address: VEYFI,
        topics: encodeEventTopics({
          abi: LEGACY_VEYFI_MODIFY_LOCK_ABI,
          eventName: "ModifyLock",
          args: { sender: user7, user: user7 },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
          [5n * ONE, 3_000_000n, 2_100_000n],
        ),
        txHash: hashOf(11),
        blockNumber: 21,
        logIndex: 0,
      }),
      createLog({
        address: VEYFI,
        topics: encodeEventTopics({
          abi: LEGACY_VEYFI_MODIFY_LOCK_ABI,
          eventName: "ModifyLock",
          args: { sender: user8, user: user8 },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
          [8n * ONE, 2_800_000n, 2_200_000n],
        ),
        txHash: hashOf(12),
        blockNumber: 22,
        logIndex: 0,
      }),
      createLog({
        address: VEYFI,
        topics: encodeEventTopics({
          abi: LEGACY_VEYFI_WITHDRAW_ABI,
          eventName: "Withdraw",
          args: { provider: user9 },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
          [ONE, 2_300_000n, ONE / 10n],
        ),
        txHash: hashOf(13),
        blockNumber: 23,
        logIndex: 0,
      }),
      createLog({
        address: VEYFI,
        topics: encodeEventTopics({
          abi: LEGACY_VEYFI_PENALTY_ABI,
          eventName: "Penalty",
          args: { sender: user10, receiver: treasury },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [ONE / 2n]),
        txHash: hashOf(14),
        blockNumber: 24,
        logIndex: 0,
      }),
      createLog({
        address: STYFI,
        topics: encodeEventTopics({
          abi: ERC20_TRANSFER_ABI,
          eventName: "Transfer",
          args: { sender: user10, receiver: user1 },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [ONE]),
        txHash: hashOf(15),
        blockNumber: 25,
        logIndex: 0,
      }),
    ];

    const rpc = createMockRpc({
      logs,
      callByBlock: {
        19: { amount: 0n, end: 0n },
        20: { amount: 5n * ONE, end: 2_500_000n },
        21: { amount: 7n * ONE, end: 2_700_000n },
      },
      txFromByHash: {
        [hashOf(7).toLowerCase()]: user3,
        [hashOf(8).toLowerCase()]: user4,
      },
    });

    const actions = await scanChunkForActions(rpc, 10, 30);

    const kinds = new Set(actions.map((action) => action.kind));
    expect(Array.from(kinds).sort()).toEqual([
      "exchange",
      "extension",
      "initiated_cooldown",
      "legacy_withdraw",
      "lock",
      "migrate",
      "penalty",
      "redeem",
      "staked",
      "update",
      "withdrew_from_cooldown",
    ]);

    const upCooldownAction = actions.find(
      (action) =>
        action.kind === "initiated_cooldown" &&
        action.tokenSymbol === "upYFI" &&
        action.txHash === hashOf(5),
    );
    expect(upCooldownAction).toBeDefined();
    expect(upCooldownAction?.amounts.shares).toBe(upSharesForCooldown);
    expect(upCooldownAction?.amounts.assets).toBe(upAssetsForCooldown);

    const redeemAction = actions.find(
      (action) => action.kind === "redeem" && action.txHash === hashOf(7),
    );
    expect(redeemAction?.user).toBe(user3);

    const exchangeAction = actions.find(
      (action) => action.kind === "exchange" && action.txHash === hashOf(8),
    );
    expect(exchangeAction?.user).toBe(user4);
  });

  it("skips ModifyLock classification when locked() snapshot cannot be loaded", async () => {
    const user = userOf(20);
    const logs: RpcLog[] = [
      createLog({
        address: VEYFI,
        topics: encodeEventTopics({
          abi: LEGACY_VEYFI_MODIFY_LOCK_ABI,
          eventName: "ModifyLock",
          args: { sender: user, user },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
          [3n * ONE, 2_000_000n, 1_900_000n],
        ),
        txHash: hashOf(100),
        blockNumber: 50,
        logIndex: 0,
      }),
    ];

    const rpc = createMockRpc({
      logs,
      callError: new Error("forced locked() failure"),
    });

    const actions = await scanChunkForActions(rpc, 50, 50);
    expect(actions).toEqual([]);
  });

  it("does not emit cooldown-start when burn transfer is paired with ERC4626 withdraw in the same tx", async () => {
    const user = userOf(30);
    const txHash = hashOf(300);
    const shares = ONE / 2n;
    const logs: RpcLog[] = [
      createLog({
        address: STYFI,
        topics: encodeEventTopics({
          abi: ERC20_TRANSFER_ABI,
          eventName: "Transfer",
          args: {
            sender: user,
            receiver: "0x0000000000000000000000000000000000000000",
          },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [shares]),
        txHash,
        blockNumber: 60,
        logIndex: 0,
      }),
      createLog({
        address: STYFI,
        topics: encodeEventTopics({
          abi: ERC4626_WITHDRAW_ABI,
          eventName: "Withdraw",
          args: { sender: user, receiver: user, owner: user },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [shares, shares],
        ),
        txHash,
        blockNumber: 60,
        logIndex: 1,
      }),
    ];

    const rpc = createMockRpc({ logs });
    const actions = await scanChunkForActions(rpc, 60, 60);

    expect(actions).toHaveLength(1);
    expect(actions[0]?.kind).toBe("withdrew_from_cooldown");
  });
});
