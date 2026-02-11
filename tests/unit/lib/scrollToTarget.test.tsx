import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scrollToTargetWhenReady } from "@/lib/scrollToTarget";

describe("scrollToTargetWhenReady", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => undefined;
    }
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = (cb: FrameRequestCallback) =>
        window.setTimeout(() => cb(0), 16);
    }
    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("scrolls immediately when the target exists", () => {
    const scrollSpy = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => undefined);
    const element = document.createElement("div");
    element.id = "immediate-target";
    document.body.appendChild(element);

    const cleanup = scrollToTargetWhenReady("immediate-target");

    expect(scrollSpy).toHaveBeenCalled();
    cleanup();
  });

  it("waits for a DOM mutation when the target does not exist yet", async () => {
    const scrollSpy = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => undefined);

    const cleanup = scrollToTargetWhenReady("deferred-target", {
      timeoutMs: 1000,
    });
    expect(scrollSpy).not.toHaveBeenCalled();

    const element = document.createElement("div");
    element.id = "deferred-target";
    document.body.appendChild(element);

    await Promise.resolve();

    expect(scrollSpy).toHaveBeenCalled();
    cleanup();
  });

  it("stops observing after cleanup", async () => {
    const scrollSpy = vi
      .spyOn(Element.prototype, "scrollIntoView")
      .mockImplementation(() => undefined);

    const cleanup = scrollToTargetWhenReady("late-target", { timeoutMs: 1000 });
    cleanup();

    const element = document.createElement("div");
    element.id = "late-target";
    document.body.appendChild(element);

    await Promise.resolve();

    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
