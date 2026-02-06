# Global Data Schema (S3 JSON)

This document defines the **required** JSON schema served from S3 (or similar) and consumed by the frontend before a wallet connects. It powers global stats, inventory, and preview APR data without requiring any RPC.

## Source

- Env: `NEXT_PUBLIC_GLOBAL_DATA_URL`
- Validation: `lib/schemas/global.ts`
- Fetcher: `lib/clients/global.ts`

If the file is missing or invalid, the UI renders skeletons and waits for wallet-based reads.

---

## Rules

- **Base units only:** Token amounts are **strings** in base units (wei).
- **APR in BPS:** APR values are integer basis points under `aprBps` (e.g., 6800 = 68.00%).
- **Reward APY in BPS:** `global.rewards.apyBps` is an integer basis points value for yvUSDC APY.
- **Schema version:** `meta.version` must be `>= 2`.
- **Clock sync:** `meta.timestamp` is used to align the canonical epoch clock before a wallet connects.
- **Price in cents:** `global.yfi.priceCts` is an integer string in USD cents (e.g., `"350000"` = $3,500.00).
- **No floats for amounts:** No decimals for token amounts.
- **All fields required:** The schema is strict; missing fields will be rejected.
- **Symbols required:** LLYFI entries must include `symbol` for deterministic mapping.

---

## Schema (Type Shape)

```ts
type GlobalData = {
  meta: {
    version: number;       // schema version
    timestamp: number;     // unix seconds
    epoch: number;         // current epoch number
    blockNumber: number;   // chain block number used for snapshot
  };
  global: {
    maxBoostBps: number | string;
    yfi: {
      totalSupply: string;
      priceCts: string;
    };
    veyfi: {
      lockedYfi: string;
      migratedYfi: string;
      totalLlyfiStakedBps: number | string;
      inventory: {
        availableYfi: string;
        feeBps: number | string;
      };
      tokens: Array<{
        symbol: string;
        redemption: {
          capacity: string;
          used: string;
          inventory: string;
        };
      }>;
    };
    weight: {
      current: string;
      projected: string;
    };
    rewards: {
      current: string;
      projected: string;
      pps: string;
      apyBps: number | string;
    };
  };
  styfi: {
    staked: string;
    unstaking: string;
    current: { weight: string; rewards: string; aprBps: number | string };
    projected: { weight: string; rewards: string; aprBps: number | string };
  };
  styfix: {
    staked: string;
    unstaking: string;
    current: { rewards: string; aprBps: number | string };
    projected: { rewards: string; aprBps: number | string };
  };
  veyfi: {
    current: { weight: string; rewards: string };
    projected: { weight: string; rewards: string };
  };
  llyfi: Array<{
    symbol: string;
    staked: string;
    unstaking: string;
    current: { weight: string; rewards: string; aprBps: number | string };
    projected: { weight: string; rewards: string; aprBps: number | string };
  }>;
};
```

---

## Example JSON (trimmed)

```json
{
  "meta": {
    "version": 2,
    "timestamp": 1770360042,
    "epoch": 0,
    "blockNumber": 24362448
  },
  "global": {
    "maxBoostBps": "20000",
    "yfi": {
      "totalSupply": "39806000000000000000000",
      "priceCts": "350000"
    },
    "veyfi": {
      "lockedYfi": "20000000000000000000",
      "migratedYfi": "10000000000000000000",
      "totalLlyfiStakedBps": "19",
      "inventory": {
        "availableYfi": "99100000000000000000",
        "feeBps": "1000"
      },
      "tokens": [
        {
          "symbol": "sdYFI",
          "redemption": {
            "capacity": "236764578940037056317",
            "used": "0",
            "inventory": "0"
          }
        }
      ]
    },
    "weight": {
      "current": "0",
      "projected": "4232200250576465475564"
    },
    "rewards": {
      "current": "0",
      "projected": "100000000000000000000000",
      "pps": "1095999000000000000",
      "apyBps": "624"
    }
  },
  "styfi": {
    "staked": "1000000000000000000",
    "unstaking": "0",
    "current": {
      "weight": "0",
      "rewards": "0",
      "aprBps": "0"
    },
    "projected": {
      "weight": "4000004000000000000",
      "rewards": "94513580718567412717",
      "aprBps": "7716"
    }
  },
  "styfix": {
    "staked": "1000000000000000000",
    "unstaking": "0",
    "current": {
      "rewards": "0",
      "aprBps": "0"
    },
    "projected": {
      "rewards": "94513486205081207635",
      "aprBps": "7716"
    }
  },
  "veyfi": {
    "current": {
      "weight": "0",
      "rewards": "0"
    },
    "projected": {
      "weight": "76538465538461538140",
      "rewards": "1808479301706866997442"
    }
  },
  "llyfi": [
    {
      "symbol": "sdYFI",
      "staked": "1000000000000000000",
      "unstaking": "0",
      "current": {
        "weight": "0",
        "rewards": "0",
        "aprBps": "0"
      },
      "projected": {
        "weight": "1894116631520296447091",
        "rewards": "44754891531002105790921",
        "aprBps": "3653818"
      }
    }
  ]
}
```

---

## Notes

- `global.*` provides protocol-wide aggregates (supply, inventory, weights, rewards) for pre-connect rendering.
- `styfi`, `styfix`, `veyfi`, and `llyfi` provide preview blocks for each dashboard area without RPC.
- The stYFI **Total Staked** UI value should use `styfi.staked` (excludes cooldown balances). `styfi.unstaking` is provided as the cooldown amount.
- During **epoch 0**, the UI may show `styfi.projected.aprBps` as **“Epoch 1 APR”** in the stats bar while keeping current APR elsewhere.
