import { afterEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";
import { renderHookWithProviders } from "@/tests/test-utils";
import { useVeyfiAccount, veyfiKeys } from "@/lib/hooks/useVeyfi";

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
  delete (document as Document & { visibilityState?: string }).visibilityState;
}

describe("useVeyfiAccount polling gate", () => {
  afterEach(() => {
    restoreVisibilityDescriptor();
    setPathname("/styfi");
  });

  it("keeps 30s polling on /veyfi when the page is visible", async () => {
    setPathname("/veyfi");
    setVisibility("visible");

    const { result, queryClient } = renderHookWithProviders(() =>
      useVeyfiAccount()
    );

    await waitFor(() => {
      expect(result.current.data?.address).toBe(E2E_MOCK_ADDRESS);
    });

    const query = queryClient.getQueryCache().find({
      queryKey: veyfiKeys.account(E2E_MOCK_ADDRESS),
    });

    expect(query?.options.refetchInterval).toBe(30_000);
  });

  it("disables polling on /styfi while preserving the initial read", async () => {
    setPathname("/styfi");
    setVisibility("visible");

    const { result, queryClient } = renderHookWithProviders(() =>
      useVeyfiAccount()
    );

    await waitFor(() => {
      expect(result.current.data?.address).toBe(E2E_MOCK_ADDRESS);
    });

    const query = queryClient.getQueryCache().find({
      queryKey: veyfiKeys.account(E2E_MOCK_ADDRESS),
    });

    expect(query?.options.refetchInterval).toBe(false);
  });

  it("disables polling when the tab is hidden", async () => {
    setPathname("/veyfi");
    setVisibility("hidden");

    const { result, queryClient } = renderHookWithProviders(() =>
      useVeyfiAccount()
    );

    await waitFor(() => {
      expect(result.current.data?.address).toBe(E2E_MOCK_ADDRESS);
    });

    const query = queryClient.getQueryCache().find({
      queryKey: veyfiKeys.account(E2E_MOCK_ADDRESS),
    });

    expect(query?.options.refetchInterval).toBe(false);
  });
});
