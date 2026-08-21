import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Address, Hex } from "viem";
import {
  DaoProposalMarkdown,
  DaoProposalMarkdownSource,
} from "@/app/dao/components/DaoProposalMarkdown";
import {
  createDaoRawSha256Cid,
  parseDaoProposalContent,
  type DaoProposalAsset,
  type DaoProposalContent,
} from "@/lib/clients/dao";

const digest = `0x${"ab".repeat(32)}` as Hex;
const cid = createDaoRawSha256Cid(digest);
const asset: DaoProposalAsset = {
  path: "./assets/diagram.svg",
  mediaType: "image/svg+xml",
  byteLength: 2_048,
  digest,
  width: 1_200,
  height: 800,
};

function parsed(): ReturnType<typeof parseDaoProposalContent> {
  const content: DaoProposalContent = {
    schema: "yearn.dao.proposal.v1",
    markdown: `# Improve governance clarity\n\nExplain the decision in one paragraph.\n\n## Specification\n\nUse **one renderer** and [safe source](https://example.com/source).\n\n### Data\n\n| Field | Value |\n| --- | --- |\n| CID | ${cid} |\n\n\`\`\`text\n${"long".repeat(80)}\n\`\`\`\n\n![Architecture diagram](./assets/diagram.svg)\n`,
    discussionUrl: "https://gov.yearn.fi/t/proposal/1001",
    proposalType: "signal",
    createdBy: "0x4444444444444444444444444444444444444444" as Address,
    createdAt: "2026-08-18T12:00:00.000Z",
    assets: [asset],
  };
  const result = parseDaoProposalContent(content);
  expect(result.errors).toEqual([]);
  return result;
}

describe("DaoProposalMarkdown", () => {
  it("maps preview headings below the authoring route H1", () => {
    render(<DaoProposalMarkdown parsed={parsed()} context="preview" />);

    expect(screen.getByRole("heading", { level: 3, name: "Improve governance clarity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Specification" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 5, name: "Data" })).toBeInTheDocument();
    expect(screen.getByText("Explain the decision in one paragraph.")).toBeInTheDocument();
  });

  it("omits the title and summary on detail while offsetting source H2 to H3", () => {
    render(
      <DaoProposalMarkdown
        parsed={parsed()}
        context="detail"
        omitTitle
        omitSummary
      />
    );

    expect(screen.queryByRole("heading", { name: "Improve governance clarity" })).not.toBeInTheDocument();
    expect(screen.queryByText("Explain the decision in one paragraph.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Specification" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "Data" })).toBeInTheDocument();
  });

  it("renders attachment facts and never creates an image-producing element", () => {
    const { container } = render(
      <DaoProposalMarkdown parsed={parsed()} context="detail" />
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[style*="background-image"]')).toBeNull();
    expect(screen.getByText("Architecture diagram")).toBeInTheDocument();
    expect(screen.getByText("image/svg+xml")).toBeInTheDocument();
    expect(screen.getByText("2 KiB")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open attachment/i })).toHaveAttribute(
      "href",
      `https://ipfs.io/ipfs/${cid}`
    );
  });

  it("copies the authenticated absolute URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<DaoProposalMarkdown parsed={parsed()} context="detail" />);

    fireEvent.click(screen.getByRole("button", { name: "Copy immutable link" }));
    expect(writeText).toHaveBeenCalledWith(`https://ipfs.io/ipfs/${cid}`);
  });

  it("contains tables, code, and long links inside the content region", () => {
    render(<DaoProposalMarkdown parsed={parsed()} context="detail" />);
    expect(
      screen.getByRole("region", { name: "Proposal Markdown table" })
    ).toHaveClass("overflow-x-auto");
    expect(screen.getByRole("columnheader", { name: "Field" })).toHaveAttribute(
      "scope",
      "col"
    );
    expect(
      screen.getByRole("region", { name: "Proposal Markdown code block" })
    ).toHaveClass("overflow-x-auto");
    const link = screen.getByRole("link", { name: "safe source" });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveClass("[overflow-wrap:anywhere]");
  });

  it("labels and contains the byte-exact source region", () => {
    render(<DaoProposalMarkdownSource source={parsed().source} />);

    fireEvent.click(screen.getByText("View Markdown source"));
    expect(
      screen.getByRole("region", { name: "Exact Markdown source" })
    ).toHaveClass("overflow-x-auto");
  });
});
