import { describe, expect, it, vi } from "vitest";
import {
  DAO_FEED_MAX_EVENTS,
  DAO_FEED_MAX_PROPOSALS,
  DaoFeedSchema,
  DaoProposalWireSchema,
} from "@/lib/schemas/dao-feed";

const collections = [
  { name: "DAO proposals", schema: DaoFeedSchema.shape.proposals, maximum: DAO_FEED_MAX_PROPOSALS },
  { name: "DAO events", schema: DaoProposalWireSchema.shape.events, maximum: DAO_FEED_MAX_EVENTS },
  { name: "DAO deployments", schema: DaoFeedSchema.shape.deployments, maximum: 8 },
];

describe.each(collections)("$name collection boundary", ({ schema, maximum }) => {
  it("rejects an oversized collection before reading any element", () => {
    const readElement = vi.fn(() => null);
    const input = new Array(maximum + 1);
    Object.defineProperty(input, 0, { get: readElement, enumerable: true });

    const result = schema.safeParse(input);

    expect(result.success).toBe(false);
    expect(readElement).not.toHaveBeenCalled();
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ code: "too_big", maximum, path: [] }),
      ]);
    }
  });

  it("still validates elements within the collection limit", () => {
    const result = schema.safeParse([null]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual([
        expect.objectContaining({ code: "invalid_type", path: [0] }),
      ]);
    }
  });
});
