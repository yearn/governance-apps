import { createRef } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DaoMarkdownEditor } from "@/app/dao/propose/DaoMarkdownEditor";

describe("DaoMarkdownEditor", () => {
  it("numbers source lines, including blank and trailing lines, without adding an accessible control", () => {
    const editorRef = createRef<HTMLTextAreaElement>();
    const { rerender } = render(<DaoMarkdownEditor editorRef={editorRef} value={"# Title\r\n\r\nSummary.\n"} aria-label="Proposal Markdown" onChange={() => {}} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    const gutter = screen.getByTestId("dao-markdown-line-numbers");
    expect(Array.from(gutter.children).map((node) => node.textContent)).toEqual(["1", "2", "3", "4"]);
    expect(gutter.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(editorRef.current).toBe(screen.getByRole("textbox"));
    rerender(<DaoMarkdownEditor editorRef={editorRef} value="" aria-label="Proposal Markdown" onChange={() => {}} />);
    expect(gutter.children).toHaveLength(1);
  });

  it("synchronizes scrolling and preserves the native editing callbacks", () => {
    const editorRef = createRef<HTMLTextAreaElement>();
    const onChange = vi.fn();
    render(<DaoMarkdownEditor editorRef={editorRef} value="Source" aria-label="Proposal Markdown" onChange={onChange} />);
    const editor = screen.getByRole("textbox");
    fireEvent.change(editor, { target: { value: "Updated source" } });
    expect(onChange).toHaveBeenCalledOnce();
    fireEvent.scroll(editor, { target: { scrollTop: 144 } });
    expect(screen.getByTestId("dao-markdown-line-numbers")).toHaveStyle({ transform: "translateY(-144px)" });
    expect(editor).toHaveAttribute("wrap", "soft");
  });
});
