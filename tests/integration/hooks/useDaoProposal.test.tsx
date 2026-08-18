import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { daoKeys } from "@/lib/hooks/daoKeys";
import { useDaoProposal } from "@/lib/hooks/useDao";

describe("useDaoProposal", () => {
  it("keeps an invalid route ID not-found when the shared feed cache errored", async () => {
    const feedError = new Error("seeded feed failure");
    let feedReads = 0;
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    await expect(
      queryClient.fetchQuery({
        queryKey: daoKeys.feed(),
        queryFn: () => {
          feedReads += 1;
          throw feedError;
        },
      })
    ).rejects.toBe(feedError);

    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useDaoProposal("invalid"), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual({ state: "not_found" });
      expect(result.current.isPending).toBe(false);
    });
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(feedReads).toBe(1);
  });
});
