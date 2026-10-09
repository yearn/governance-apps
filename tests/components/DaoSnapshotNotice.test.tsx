import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DaoSnapshotNotice } from "@/app/dao/components/DaoSnapshotNotice";
import { DAO_MOCK_FEED } from "@/lib/clients/dao";
import { DAO_FEED_STALE_SECONDS } from "@/lib/clients/dao/feed";
import { formatUtcDateTime } from "@/lib/date";

afterEach(() => vi.useRealTimers());

describe("DAO snapshot notice", () => {
  it("keeps freshness compact and makes exact chain time available on demand", () => {
    vi.useFakeTimers();
    vi.setSystemTime((DAO_MOCK_FEED.canonicalBlock.timestamp + 120) * 1_000);
    const feed = { ...DAO_MOCK_FEED, generatedAt: "2030-01-02T03:04:05Z" };
    render(<DaoSnapshotNotice snapshot={feed} error={null} onRetry={vi.fn()} />);

    expect(screen.getByText("Snapshot · 2m ago")).toBeVisible();
    const exactTime = screen.getByText(formatUtcDateTime(feed.canonicalBlock.timestamp));
    expect(exactTime).not.toBeVisible();
    fireEvent.click(screen.getByText("Snapshot · 2m ago"));
    expect(exactTime).toBeVisible();
    expect(exactTime).toHaveAttribute("datetime", new Date(feed.canonicalBlock.timestamp * 1_000).toISOString());
    expect(screen.queryByText(feed.generatedAt)).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText("Snapshot · 3m ago")).toBeVisible();
  });

  it("keeps a delayed snapshot warning and refresh action visible when collapsed", () => {
    vi.useFakeTimers();
    vi.setSystemTime((DAO_MOCK_FEED.canonicalBlock.timestamp + DAO_FEED_STALE_SECONDS + 1) * 1_000);
    const onRetry = vi.fn();
    render(<DaoSnapshotNotice snapshot={DAO_MOCK_FEED} error={null} onRetry={onRetry} />);

    expect(screen.getByText("Updates delayed. Check again before relying on this snapshot.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("identifies retained data during an outage without exposing transport errors", () => {
    vi.useFakeTimers();
    vi.setSystemTime(DAO_MOCK_FEED.canonicalBlock.timestamp * 1_000);
    render(<DaoSnapshotNotice snapshot={DAO_MOCK_FEED} error={new Error("Upstream internal transport error")} onRetry={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Updates unavailable. Showing the last valid snapshot.");
    expect(screen.getByRole("button", { name: "Refresh" })).toBeVisible();
    expect(screen.queryByText(/internal transport error/)).not.toBeInTheDocument();
  });

  it("leaves the initial loading or error state to the route when there is no snapshot", () => {
    const { container } = render(<DaoSnapshotNotice snapshot={undefined} error={new Error("Unavailable")} onRetry={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
