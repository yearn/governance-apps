"use client";

import { Address } from "viem";

export const GLOBAL_WORLD_STATE = {
  users: new Map<
    string,
    {
      yfiBalance: bigint;
      isBlacklisted: boolean;
    }
  >(),

  get(address: Address) {
    const key = address.toLowerCase();
    if (!this.users.has(key)) {
      this.users.set(key, {
        yfiBalance: 100n * 10n ** 18n,
        isBlacklisted: false,
      });
    }
    return this.users.get(key)!;
  },

  updateYfi(address: Address, delta: bigint) {
    const state = this.get(address);
    state.yfiBalance += delta;
    this.save();
  },

  setYfi(address: Address, amount: bigint) {
    const state = this.get(address);
    state.yfiBalance = amount;
    this.save();
  },

  setBlacklisted(address: Address, value: boolean) {
    const state = this.get(address);
    state.isBlacklisted = value;
    this.save();
  },

  save() {
    if (typeof window === "undefined") return;
    const data = Array.from(this.users.entries());
    window.sessionStorage.setItem(
      "mock_world_identity",
      JSON.stringify(data, (k, v) =>
        typeof v === "bigint" ? `BIGINT::${v.toString()}` : v
      )
    );
  },

  load() {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("mock_world_identity");
    if (!raw) return;
    try {
      const data = JSON.parse(raw, (k, v) =>
        typeof v === "string" && v.startsWith("BIGINT::")
          ? BigInt(v.split("::")[1])
          : v
      );
      this.users = new Map(data);
    } catch {
      /* Best effort */
    }
  },

  reset() {
    this.users = new Map();
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.removeItem("mock_world_identity");
    } catch {
      /* Best effort */
    }
  },
};

GLOBAL_WORLD_STATE.load();
