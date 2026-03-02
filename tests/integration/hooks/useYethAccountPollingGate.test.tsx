import { afterEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";
import { renderHookWithProviders } from "@/tests/test-utils";
import { useYethAccountState, yethKeys } from "@/lib/hooks/useYeth";

const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(
  document,
  "visibilityState"
);

function setPathname(pathname: string) {
  window.history.replaceState({}, "", pathname);
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

function restoreVisibilityDescriptor() {
  if (originalVisibilityDescriptor) {
    Object.defineProperty(
      document,
      "visibilityState",
      originalVisibilityDescriptor
    );
    return;
  }
  delete (document as { visibilityState?: DocumentVisibilityState })
    .visibilityState;
}

describe("useYethAccountState polling gate", () => {
  afterEach(() => {
    restoreVisibilityDescriptor();
    setPathname("/styfi");
  });

  it("keeps 15s polling on /yeth when the page is visible", async () => {
    setPathname("/yeth");
    setVisibility("visible");

    const { result, queryClient } = renderHookWithProviders(() =>
      useYethAccountState()
    );

    await waitFor(() => {
      expect(result.current.data?.address).toBe(E2E_MOCK_ADDRESS);
    });

    const query = queryClient.getQueryCache().find({
      queryKey: yethKeys.account(E2E_MOCK_ADDRESS),
    });

    expect(query?.options).toEqual(
      expect.objectContaining({ refetchInterval: 15_000 })
    );
  });

  it("disables polling off-route while preserving the initial read", async () => {
    setPathname("/styfi");
    setVisibility("visible");

    const { result, queryClient } = renderHookWithProviders(() =>
      useYethAccountState()
    );

    await waitFor(() => {
      expect(result.current.data?.address).toBe(E2E_MOCK_ADDRESS);
    });

    const query = queryClient.getQueryCache().find({
      queryKey: yethKeys.account(E2E_MOCK_ADDRESS),
    });

    expect(query?.options).toEqual(
      expect.objectContaining({ refetchInterval: false })
    );
  });

  it("disables polling when the tab is hidden", async () => {
    setPathname("/yeth");
    setVisibility("hidden");

    const { result, queryClient } = renderHookWithProviders(() =>
      useYethAccountState()
    );

    await waitFor(() => {
      expect(result.current.data?.address).toBe(E2E_MOCK_ADDRESS);
    });

    const query = queryClient.getQueryCache().find({
      queryKey: yethKeys.account(E2E_MOCK_ADDRESS),
    });

    expect(query?.options).toEqual(
      expect.objectContaining({ refetchInterval: false })
    );
  });
});
