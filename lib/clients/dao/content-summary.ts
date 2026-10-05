import type { DaoMarkdownNode, DaoParsedProposalContent } from "./content";

function nodeText(node: DaoMarkdownNode): string {
  if (node.type === "text" || node.type === "inlineCode") return node.value ?? "";
  if (node.type === "break") return " ";
  if (node.type === "code" || node.type === "image") return "";
  const separator = ["list", "listItem", "blockquote"].includes(node.type) ? " " : "";
  return (node.children ?? []).map(nodeText).join(separator);
}

/** Prefer an explicit Summary section over author attribution below the title. */
export function getDaoProposalSummary(parsed: DaoParsedProposalContent): string | null {
  const nodes = parsed.ast.children;
  const start = nodes.findIndex((node) => node.type === "heading" &&
    /^(?:\d+[.)]?\s+)?summary$/i.test(nodeText(node).trim()));
  if (start >= 0) {
    const section: string[] = [];
    for (const node of nodes.slice(start + 1)) {
      if (node.type === "heading") break;
      if (["paragraph", "list", "blockquote"].includes(node.type)) section.push(nodeText(node));
    }
    const text = section.join(" ").trim();
    if (text) return text;
  }
  return parsed.summary;
}
