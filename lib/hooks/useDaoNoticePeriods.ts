"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DAO_FEED_TRANSPORT_POLICY } from "@/lib/clients/dao/feed";
import { DaoNoticePeriodsSchema, type DaoNoticePeriods } from "@/lib/clients/dao/voting-notice";
import { readBoundedJson, withFeedRequest } from "@/lib/feed-transport";

const key = ["dao", "notice-periods", process.env.NEXT_PUBLIC_DAO_DEPLOYMENTS ?? ""] as const;

export function useDaoNoticePeriods(enabled: boolean) {
  const client = useQueryClient();
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: () => withFeedRequest("/api/dao-data?view=voting-periods", DAO_FEED_TRANSPORT_POLICY, async (response, context) => {
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error("The DAO voting notice is unavailable.");
      }
      const next = DaoNoticePeriodsSchema.parse(await readBoundedJson(response, context, DAO_FEED_TRANSPORT_POLICY));
      const previous = client.getQueryData<DaoNoticePeriods>(key);
      if (next.generatedAt > Date.now() / 1000 + 60 ||
          (previous && (next.generatedAt < previous.generatedAt ||
          (next.generatedAt === previous.generatedAt && JSON.stringify(previous) !== JSON.stringify(next))))) {
        throw new Error("The DAO voting observation is inconsistent.");
      }
      return next;
    }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
}
