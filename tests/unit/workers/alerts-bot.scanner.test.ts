import { describe, expect, it } from "vitest";
import {
  encodeAbiParameters,
  encodeFunctionData,
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
  YETH_CLAIM_CALL_ABI,
  YETH_CLAIM_TOPIC,
  YETH_SET_CLAIM_TOPIC,
} from "@/workers/alerts-bot/src/abis";
import {
  LIQUID_LOCKER_REDEMPTION,
  LIQUID_LOCKERS,
  STYFI,
  STYFIX,
  VEYFI,
  VEYFI_REWARD_DISTRIBUTOR,
  YETH_CLAIM,
  YETH_RECOVERY_VAULT,
} from "@/workers/alerts-bot/src/contracts";
import {
  createEmptyYethStateForTest,
  scanChunkForActions,
  scanChunkForYethActions,
} from "@/workers/alerts-bot/src/index";
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

function topicAddress(address: Address): Hex {
  return `0x${address.slice(2).toLowerCase().padStart(64, "0")}` as Hex;
}

function createYethSetClaimLog(params: {
  account: Address;
  snapshotEth: bigint;
  txHash: Hex;
  blockNumber: number;
  logIndex: number;
}): RpcLog {
  return createLog({
    address: YETH_CLAIM,
    topics: [YETH_SET_CLAIM_TOPIC, topicAddress(params.account)],
    data: encodeAbiParameters([{ type: "uint256" }], [params.snapshotEth]),
    txHash: params.txHash,
    blockNumber: params.blockNumber,
    logIndex: params.logIndex,
  });
}

function createYethClaimLog(params: {
  account: Address;
  snapshotEth: bigint;
  txHash: Hex;
  blockNumber: number;
  logIndex: number;
}): RpcLog {
  return createLog({
    address: YETH_CLAIM,
    topics: [YETH_CLAIM_TOPIC, topicAddress(params.account)],
    data: encodeAbiParameters(
      [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
      [params.snapshotEth, 0n, 0n],
    ),
    txHash: params.txHash,
    blockNumber: params.blockNumber,
    logIndex: params.logIndex,
  });
}

function createMockRpc(params: {
  logs: RpcLog[];
  callByBlock?: Record<number, { amount: bigint; end: bigint }>;
  txFromByHash?: Record<string, Address>;
  txInputByHash?: Record<string, Hex>;
  callError?: Error;
}): RpcClient {
  const callByBlock = params.callByBlock ?? {};
  const txFromByHash = params.txFromByHash ?? {};
  const txInputByHash = params.txInputByHash ?? {};

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
          input: txInputByHash[hash.toLowerCase()] ?? "0x",
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

  it("suppresses internal stYFI stake when the same tx also emits stYFIx stake", async () => {
    const user = userOf(31);
    const txHash = hashOf(301);
    const logs: RpcLog[] = [
      createLog({
        address: STYFI,
        topics: encodeEventTopics({
          abi: ERC4626_DEPOSIT_ABI,
          eventName: "Deposit",
          args: { sender: STYFIX, owner: STYFIX },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [ONE, ONE],
        ),
        txHash,
        blockNumber: 61,
        logIndex: 0,
      }),
      createLog({
        address: STYFIX,
        topics: encodeEventTopics({
          abi: ERC4626_DEPOSIT_ABI,
          eventName: "Deposit",
          args: { sender: user, owner: user },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [ONE, ONE],
        ),
        txHash,
        blockNumber: 61,
        logIndex: 1,
      }),
    ];

    const rpc = createMockRpc({ logs });
    const actions = await scanChunkForActions(rpc, 61, 61);

    expect(actions).toHaveLength(1);
    expect(actions[0]?.kind).toBe("staked");
    expect(actions[0]?.tokenSymbol).toBe("stYFIX");
    expect(actions[0]?.txHash).toBe(txHash);
  });
});

describe("alerts-bot yETH scanner math", () => {
  it("maintains bucket totals when SetClaim updates an account already in stayed", async () => {
    const userA = userOf(401);
    const userB = userOf(402);
    const claimTx = hashOf(4001);
    const logs: RpcLog[] = [
      createYethSetClaimLog({
        account: userA,
        snapshotEth: 100n * ONE,
        txHash: hashOf(4000),
        blockNumber: 1,
        logIndex: 0,
      }),
      createYethClaimLog({
        account: userA,
        snapshotEth: 100n * ONE,
        txHash: claimTx,
        blockNumber: 2,
        logIndex: 0,
      }),
      createLog({
        address: YETH_RECOVERY_VAULT,
        topics: encodeEventTopics({
          abi: ERC4626_DEPOSIT_ABI,
          eventName: "Deposit",
          args: { sender: userA, owner: userA },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [100n * ONE, 100n * ONE],
        ),
        txHash: claimTx,
        blockNumber: 2,
        logIndex: 1,
      }),
      createLog({
        address: YETH_RECOVERY_VAULT,
        topics: encodeEventTopics({
          abi: ERC20_TRANSFER_ABI,
          eventName: "Transfer",
          args: {
            sender: "0x0000000000000000000000000000000000000000",
            receiver: userA,
          },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [100n * ONE]),
        txHash: claimTx,
        blockNumber: 2,
        logIndex: 2,
      }),
      createYethSetClaimLog({
        account: userA,
        snapshotEth: 120n * ONE,
        txHash: hashOf(4002),
        blockNumber: 3,
        logIndex: 0,
      }),
      createYethSetClaimLog({
        account: userB,
        snapshotEth: 30n * ONE,
        txHash: hashOf(4003),
        blockNumber: 4,
        logIndex: 0,
      }),
    ];

    const rpc = createMockRpc({
      logs,
      txFromByHash: {
        [claimTx.toLowerCase()]: userA,
      },
      txInputByHash: {
        [claimTx.toLowerCase()]: encodeFunctionData({
          abi: YETH_CLAIM_CALL_ABI,
          functionName: "claim",
          args: [false],
        }),
      },
    });

    const state = createEmptyYethStateForTest();
    const actions = await scanChunkForYethActions(rpc, 1, 5, state);

    expect(actions.map((action) => action.kind)).toEqual(["yeth_claimed_stayed"]);
    expect(state.snapshotExitedEth).toBe(0n);
    expect(state.snapshotStayedEth).toBe(120n * ONE);
    expect(state.snapshotUnclaimedEth).toBe(30n * ONE);
    expect(state.totalSnapshotDebtEth).toBe(150n * ONE);
    expect(
      state.snapshotExitedEth + state.snapshotStayedEth + state.snapshotUnclaimedEth,
    ).toBe(state.totalSnapshotDebtEth);
  });

  it("attributes partial and full withdraw burns proportionally into snapshot exited", async () => {
    const user = userOf(410);
    const claimTx = hashOf(4101);
    const partialWithdrawTx = hashOf(4102);
    const fullWithdrawTx = hashOf(4103);
    const logs: RpcLog[] = [
      createYethSetClaimLog({
        account: user,
        snapshotEth: 100n * ONE,
        txHash: hashOf(4100),
        blockNumber: 10,
        logIndex: 0,
      }),
      createYethClaimLog({
        account: user,
        snapshotEth: 100n * ONE,
        txHash: claimTx,
        blockNumber: 11,
        logIndex: 0,
      }),
      createLog({
        address: YETH_RECOVERY_VAULT,
        topics: encodeEventTopics({
          abi: ERC4626_DEPOSIT_ABI,
          eventName: "Deposit",
          args: { sender: user, owner: user },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [100n * ONE, 100n * ONE],
        ),
        txHash: claimTx,
        blockNumber: 11,
        logIndex: 1,
      }),
      createLog({
        address: YETH_RECOVERY_VAULT,
        topics: encodeEventTopics({
          abi: ERC20_TRANSFER_ABI,
          eventName: "Transfer",
          args: {
            sender: "0x0000000000000000000000000000000000000000",
            receiver: user,
          },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [100n * ONE]),
        txHash: claimTx,
        blockNumber: 11,
        logIndex: 2,
      }),
      createLog({
        address: YETH_RECOVERY_VAULT,
        topics: encodeEventTopics({
          abi: ERC4626_WITHDRAW_ABI,
          eventName: "Withdraw",
          args: { sender: user, receiver: user, owner: user },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [25n * ONE, 25n * ONE],
        ),
        txHash: partialWithdrawTx,
        blockNumber: 12,
        logIndex: 0,
      }),
      createLog({
        address: YETH_RECOVERY_VAULT,
        topics: encodeEventTopics({
          abi: ERC20_TRANSFER_ABI,
          eventName: "Transfer",
          args: {
            sender: user,
            receiver: "0x0000000000000000000000000000000000000000",
          },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [25n * ONE]),
        txHash: partialWithdrawTx,
        blockNumber: 12,
        logIndex: 1,
      }),
      createLog({
        address: YETH_RECOVERY_VAULT,
        topics: encodeEventTopics({
          abi: ERC20_TRANSFER_ABI,
          eventName: "Transfer",
          args: {
            sender: user,
            receiver: "0x0000000000000000000000000000000000000000",
          },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [75n * ONE]),
        txHash: fullWithdrawTx,
        blockNumber: 13,
        logIndex: 0,
      }),
      createLog({
        address: YETH_RECOVERY_VAULT,
        topics: encodeEventTopics({
          abi: ERC4626_WITHDRAW_ABI,
          eventName: "Withdraw",
          args: { sender: user, receiver: user, owner: user },
        }),
        data: encodeAbiParameters(
          [{ type: "uint256" }, { type: "uint256" }],
          [75n * ONE, 75n * ONE],
        ),
        txHash: fullWithdrawTx,
        blockNumber: 13,
        logIndex: 1,
      }),
    ];

    const rpc = createMockRpc({
      logs,
      txFromByHash: {
        [claimTx.toLowerCase()]: user,
      },
      txInputByHash: {
        [claimTx.toLowerCase()]: encodeFunctionData({
          abi: YETH_CLAIM_CALL_ABI,
          functionName: "claim",
          args: [false],
        }),
      },
    });

    const state = createEmptyYethStateForTest();
    const actions = await scanChunkForYethActions(rpc, 10, 13, state);

    const partialWithdrawAction = actions.find(
      (action) => action.txHash === partialWithdrawTx,
    );
    const fullWithdrawAction = actions.find(
      (action) => action.txHash === fullWithdrawTx,
    );

    expect(partialWithdrawAction?.kind).toBe("yeth_recovery_vault_withdraw");
    expect(partialWithdrawAction?.yethWithdrawalType).toBe("partial");
    expect(partialWithdrawAction?.amounts.yethSharesBurned).toBe(25n * ONE);
    expect(partialWithdrawAction?.amounts.yethOwnerSharesBefore).toBe(100n * ONE);
    expect(partialWithdrawAction?.amounts.yethOwnerSharesAfter).toBe(75n * ONE);
    expect(partialWithdrawAction?.amounts.yethSnapshotMoved).toBe(25n * ONE);

    expect(fullWithdrawAction?.kind).toBe("yeth_recovery_vault_withdraw");
    expect(fullWithdrawAction?.yethWithdrawalType).toBe("full");
    expect(fullWithdrawAction?.amounts.yethSharesBurned).toBe(75n * ONE);
    expect(fullWithdrawAction?.amounts.yethOwnerSharesBefore).toBe(75n * ONE);
    expect(fullWithdrawAction?.amounts.yethOwnerSharesAfter).toBe(0n);
    expect(fullWithdrawAction?.amounts.yethSnapshotMoved).toBe(75n * ONE);

    expect(state.snapshotExitedEth).toBe(100n * ONE);
    expect(state.snapshotStayedEth).toBe(0n);
    expect(state.snapshotUnclaimedEth).toBe(0n);
    expect(state.totalSnapshotDebtEth).toBe(100n * ONE);
  });
});
