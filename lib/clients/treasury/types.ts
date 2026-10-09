import type { TreasuryFeed } from "@/lib/schemas/treasury-feed";

export type TreasuryHolding = TreasuryFeed["holdings"][number];
export type TreasuryAllocation = TreasuryFeed["allocations"][number];
export type TreasuryClient = { read: () => Promise<TreasuryFeed> };
export type TreasuryViewState = "loading" | "ready" | "error";
export type TreasuryFilter = { accountId: string; teamId: string };
export type TreasuryTab = "portfolio" | "allocations";
