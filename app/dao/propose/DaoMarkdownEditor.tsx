"use client";

import {
  useLayoutEffect,
  useRef,
  type RefObject,
  type TextareaHTMLAttributes,
} from "react";

type DaoMarkdownEditorProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className" | "value" | "ref"
> & {
  value: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
};

/** Keep the native textarea so selection, undo, spelling and Tab retain browser behavior. */
export function DaoMarkdownEditor({
  editorRef,
  value,
  onScroll,
  ...props
}: DaoMarkdownEditorProps) {
  const mirrorRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = value.split(/\r\n|\r|\n/u);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    const mirror = mirrorRef.current;
    const gutter = gutterRef.current;
    if (!editor || !mirror || !gutter) return;

    const measureLines = () => {
      // clientWidth excludes a classic scrollbar, unlike the outer editor width.
      mirror.style.width = `${editor.clientWidth}px`;
      const measuredLines = Array.from(mirror.children);
      Array.from(gutter.children).forEach((line, index) => {
        (line as HTMLElement).style.height = `${measuredLines[index]?.getBoundingClientRect().height || 24}px`;
      });
      gutter.style.transform = `translateY(${-editor.scrollTop}px)`;
    };

    measureLines();
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(measureLines)
      : null;
    observer?.observe(editor);
    observer?.observe(mirror);
    document.fonts?.addEventListener("loadingdone", measureLines);
    return () => {
      observer?.disconnect();
      document.fonts?.removeEventListener("loadingdone", measureLines);
    };
  }, [editorRef, value]);

  return (
    <div
      className="relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)] overflow-hidden rounded-box border border-border bg-surface shadow-sm transition-[border-color,box-shadow] duration-150 ease-out focus-within:border-text-primary focus-within:ring-2 focus-within:ring-text-primary focus-within:ring-offset-2 focus-within:ring-offset-app motion-reduce:transition-none"
      data-testid="dao-markdown-editor"
    >
      <div
        aria-hidden="true"
        className="relative select-none overflow-hidden border-r border-border bg-surface-secondary/60 text-right font-number text-sm leading-6 tabular-nums text-text-secondary"
        style={{ width: `calc(${Math.max(2, String(lines.length).length)}ch + 1rem + 1px)` }}
      >
        <div ref={gutterRef} className="absolute inset-x-0 top-0 py-3" data-testid="dao-markdown-line-numbers">
          {lines.map((_, index) => (
            <div key={index} className="h-6 px-2">{index + 1}</div>
          ))}
        </div>
      </div>
      <div className="relative min-w-0">
        <div
          ref={mirrorRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute left-0 top-0 whitespace-pre-wrap break-words px-3 py-3 font-number text-sm leading-6 [tab-size:8]"
          data-testid="dao-markdown-line-mirror"
        >
          {lines.map((line, index) => (
            <div key={index}>{line || "\u200b"}</div>
          ))}
        </div>
        <textarea
          {...props}
          ref={editorRef}
          value={value}
          wrap="soft"
          className="relative block min-h-80 w-full resize-y whitespace-pre-wrap break-words border-0 bg-transparent px-3 py-3 font-number text-sm leading-6 text-text-primary outline-none [tab-size:8] placeholder:text-text-secondary"
          onScroll={(event) => {
            if (gutterRef.current) {
              gutterRef.current.style.transform = `translateY(${-event.currentTarget.scrollTop}px)`;
            }
            onScroll?.(event);
          }}
        />
      </div>
    </div>
  );
}
