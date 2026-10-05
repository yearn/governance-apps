import type { Hex } from "viem";
import { createDaoRawSha256Cid, parseDaoProposalContent } from "../../../../../lib/clients/dao/content";
import { readDaoContentBytes } from "../../../../../lib/clients/dao/content-bytes";
import { getDaoDiscussionUrl } from "../../../../../lib/clients/dao/read-display";
import { DAO_CONTENT_MAX_BYTES } from "../../../../../lib/schemas/dao-feed";

export interface DaoAlertContent {
  readonly title: string | null;
  readonly summary: string | null;
  readonly discussionUrl: string | null;
}

/** Optional enrichment. Only digest-verified canonical app content reaches Telegram. */
export async function readDaoAlertContent(digest: string): Promise<DaoAlertContent | null> {
  try {
    const cid = createDaoRawSha256Cid(digest as Hex);
    const response = await fetch(`https://ipfs.io/ipfs/${cid}`, {
      signal: AbortSignal.timeout(3_000), redirect: "error",
    });
    if (!response.ok || !response.body) { await response.body?.cancel(); return null; }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > DAO_CONTENT_MAX_BYTES) { await reader.cancel(); return null; }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const content = readDaoContentBytes(btoa(binary), digest as Hex);
    if (content.state !== "available" || !content.value) return null;
    const parsed = parseDaoProposalContent(content.value);
    return { title: parsed.title, summary: parsed.summary, discussionUrl: getDaoDiscussionUrl(content.value.discussionUrl) };
  } catch { return null; }
}
