import type { TestBridge } from "@/lib/test-bridge";

declare global {
  interface Window {
    __TEST__?: TestBridge;
  }
}

export {};
