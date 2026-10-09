import { TreasuryFeedReader } from "./feed";
import type { TreasuryClient } from "./types";

/** The producer owns chain reads; the browser only reads the validated same-origin feed. */
export function createLiveTreasuryClient(): TreasuryClient {
  const reader = new TreasuryFeedReader();
  return { read: () => reader.refresh() };
}
