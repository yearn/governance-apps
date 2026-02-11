"use client";

type ScrollCleanup = () => void;

function scrollToElement(targetId: string) {
  const target = document.getElementById(targetId);
  if (!target) return null;

  target.scrollIntoView({ behavior: "smooth", block: "start" });

  // Perform a second pass after layout settles to avoid partial scrolls.
  let raf2 = 0;
  const raf1 = window.requestAnimationFrame(() => {
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

    raf2 = window.requestAnimationFrame(() => {
      document
        .getElementById(targetId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  return () => {
    if (raf1) window.cancelAnimationFrame(raf1);
    if (raf2) window.cancelAnimationFrame(raf2);
  };
}

export function scrollToTargetWhenReady(
  targetId: string,
  options?: { timeoutMs?: number }
): ScrollCleanup {
  if (typeof window === "undefined" || !targetId) {
    return () => undefined;
  }

  const immediateScrollCleanup = scrollToElement(targetId);
  if (immediateScrollCleanup) {
    return immediateScrollCleanup;
  }

  const timeoutMs = options?.timeoutMs ?? 4000;
  let settled = false;
  let scrollCleanup: ScrollCleanup = () => undefined;

  const observer = new MutationObserver(() => {
    const nextCleanup = scrollToElement(targetId);
    if (nextCleanup) {
      scrollCleanup = nextCleanup;
      cleanup();
    }
  });

  if (document.body) {
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: false,
    });
  }

  const timeoutId = window.setTimeout(() => {
    cleanup();
  }, timeoutMs);

  const cleanup = () => {
    if (settled) return;
    settled = true;
    observer.disconnect();
    window.clearTimeout(timeoutId);
    scrollCleanup();
  };

  return cleanup;
}
