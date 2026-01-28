# Global Data Schema (S3 JSON)

This document defines the **required** JSON schema served from S3 (or similar) and consumed by the frontend before a wallet connects. It powers global stats, inventory, and preview APR data without requiring any RPC.

## Source

- Env: `NEXT_PUBLIC_GLOBAL_DATA_URL`
- Validation: `lib/schemas/global.ts`
- Fetcher: `lib/clients/global.ts`

If the file is missing or invalid, the UI renders skeletons and waits for wallet‑based reads.

---

## Rules

- **Base units only:** Token amounts are **strings** in base units (wei).
- **APR in BPS:** All APR values are **integer** basis points (e.g., 6800 = 68.00%).
- **No floats for amounts:** No decimals for token amounts.
- **Price is decimal string:** `yfiPriceUsd` is a decimal string (e.g., `"3500.00"`).
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
    yfiPriceUsd: string;   // decimal string
    maxBoostBps: number | string;
    styfi: {
      totalSupply: string;
      totalStaked: string;
      aprBps: number | string;
    };
    veyfi: {
      migratedYfi: string;
      legacyYfiSupply: string;
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
  };
  rewards: {
    current: { totalRewards: string; pps: string };
    projected: { totalRewards: string; pps: string };
  };
  weight: {
    current: string;
    projected: string;
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
    staked: string;
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
    "version": 1,
    "timestamp": 1770257535,
    "epoch": 12,
    "blockNumber": 19999999
  },
  "global": {
    "yfiPriceUsd": "3500.00",
    "maxBoostBps": "20000",
    "styfi": {
      "totalSupply": "36666000000000000000000",
      "totalStaked": "2500000000000000000000",
      "aprBps": "6840"
    },
    "veyfi": {
      "migratedYfi": "4200000000000000000000",
      "legacyYfiSupply": "8000000000000000000000",
      "totalLlyfiStakedBps": "8500",
      "inventory": {
        "availableYfi": "600000000000000000000",
        "feeBps": "500"
      },
      "tokens": [
        {
          "symbol": "sdYFI",
          "redemption": {
            "capacity": "100000000000000000000",
            "used": "20000000000000000000",
            "inventory": "15000000000000000000"
          }
        }
      ]
    }
  },
  "rewards": {
    "current": { "totalRewards": "0", "pps": "0" },
    "projected": { "totalRewards": "0", "pps": "0" }
  },
  "weight": { "current": "0", "projected": "0" },
  "styfi": {
    "staked": "0",
    "unstaking": "0",
    "current": { "weight": "0", "rewards": "0", "aprBps": "0" },
    "projected": { "weight": "0", "rewards": "0", "aprBps": "0" }
  },
  "styfix": {
    "staked": "0",
    "unstaking": "0",
    "current": { "rewards": "0", "aprBps": "0" },
    "projected": { "rewards": "0", "aprBps": "0" }
  },
  "veyfi": {
    "staked": "0",
    "current": { "weight": "0", "rewards": "0" },
    "projected": { "weight": "0", "rewards": "0" }
  },
  "llyfi": [
    {
      "symbol": "sdYFI",
      "staked": "0",
      "unstaking": "0",
      "current": { "weight": "0", "rewards": "0", "aprBps": "0" },
      "projected": { "weight": "0", "rewards": "0", "aprBps": "0" }
    }
  ]
}
```

---

## Notes

- This schema intentionally includes both **global aggregates** (`global.*`) and the **legacy preview blocks** (`rewards`, `weight`, `styfi`, `styfix`, `veyfi`, `llyfi`) so the UI can render pre‑wallet “preview” cards without RPC.
- Account‑specific data must still come from the connected wallet’s RPC.
