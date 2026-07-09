"use client";

import { useCallback, useEffect, useState } from "react";
import type { ViewToggleValue } from "@/components/ui/ViewToggle";

function isViewToggleValue(value: string | null): value is ViewToggleValue {
  return value === "visual" || value === "audit";
}

export function usePersistentViewToggle(
  storageKey: string,
  defaultValue: ViewToggleValue = "audit"
) {
  const [value, setValue] = useState<ViewToggleValue>(defaultValue);

  useEffect(() => {
    let timeoutId: number | null = null;

    try {
      const storedValue = window.localStorage.getItem(storageKey);
      if (isViewToggleValue(storedValue)) {
        timeoutId = window.setTimeout(() => {
          setValue(storedValue);
        }, 0);
      }
    } catch {
      // Storage can be blocked in embedded browsers. Keep the default view.
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [storageKey]);

  const setPersistentValue = useCallback(
    (nextValue: ViewToggleValue) => {
      setValue(nextValue);
      try {
        window.localStorage.setItem(storageKey, nextValue);
      } catch {
        // The view still changes for this session when storage is blocked.
      }
    },
    [storageKey]
  );

  return [value, setPersistentValue] as const;
}
