import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { setFixedNow } from "@/lib/mocks/time";
import { resetMockStyfiStore } from "@/lib/clients/styfi/mock";
import { resetMockVeyfiStore } from "@/lib/clients/veyfi/mock";
import { GLOBAL_WORLD_STATE } from "@/lib/mocks/world-state";

beforeEach(() => {
  process.env.NEXT_PUBLIC_USE_MOCKS = "true";
});

afterEach(() => {
  cleanup();
  setFixedNow(null);
  resetMockStyfiStore();
  resetMockVeyfiStore();
  GLOBAL_WORLD_STATE.reset();
});
