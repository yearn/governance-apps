"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyfiMode } from "../components/types";

const LAST_MODE_KEY = "styfi-last-mode";
const ONBOARDED_KEY = "styfi_onboarded";

type StyfiModeContextValue = {
  mode: StyfiMode;
  isOnboarded: boolean;
  isDrawerOpen: boolean;
  selectMode: (
    mode: StyfiMode,
    options?: { collapseDrawer?: boolean; markOnboarded?: boolean }
  ) => void;
  toggleDrawer: () => void;
  quickSwitch: () => void;
};

const StyfiModeContext = createContext<StyfiModeContextValue | null>(null);

function readPersistedSettings() {
  if (typeof window === "undefined") {
    return { mode: undefined as StyfiMode | undefined, onboarded: false };
  }

  try {
    const rawMode = window.localStorage.getItem(LAST_MODE_KEY);
    const mode =
      rawMode === "styfi" || rawMode === "x" ? (rawMode as StyfiMode) : undefined;
    const onboarded = window.localStorage.getItem(ONBOARDED_KEY) === "true";
    return { mode, onboarded };
  } catch {
    return { mode: undefined, onboarded: false };
  }
}

export function StyfiModeProvider({
  initialMode,
  children,
}: {
  initialMode?: StyfiMode;
  children: ReactNode;
}) {
  // Default to a deterministic mode for server render; hydrate from storage on mount.
  const [mode, setMode] = useState<StyfiMode>(initialMode ?? "styfi");
  const [isOnboarded, setIsOnboarded] = useState<boolean>(!!initialMode);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(!initialMode);

  // Hydrate from localStorage once on the client when no explicit mode was provided.
  useEffect(() => {
    if (initialMode) return;
    const { mode: storedMode, onboarded } = readPersistedSettings();
    if (storedMode) {
      setMode(storedMode);
    }
    setIsOnboarded(onboarded);
    setIsDrawerOpen(!onboarded);
  }, [initialMode]);

  // Persist selections.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(LAST_MODE_KEY, mode);
    } catch {
      // best effort only
    }
  }, [mode]);

  useEffect(() => {
    if (!isOnboarded || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(ONBOARDED_KEY, "true");
    } catch {
      // best effort only
    }
  }, [isOnboarded]);

  const selectMode = useCallback(
    (
      nextMode: StyfiMode,
      options: { collapseDrawer?: boolean; markOnboarded?: boolean } = {}
    ) => {
      setMode(nextMode);
      if (options.markOnboarded ?? true) {
        setIsOnboarded(true);
      }
      if (options.collapseDrawer ?? true) {
        setIsDrawerOpen(false);
      }
    },
    []
  );

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  const quickSwitch = useCallback(() => {
    const next = mode === "styfi" ? "x" : "styfi";
    selectMode(next, { collapseDrawer: false, markOnboarded: true });
  }, [mode, selectMode]);

  const value = useMemo(
    () => ({
      mode,
      isOnboarded,
      isDrawerOpen,
      selectMode,
      toggleDrawer,
      quickSwitch,
    }),
    [isDrawerOpen, isOnboarded, mode, quickSwitch, selectMode, toggleDrawer]
  );

  return (
    <StyfiModeContext.Provider value={value}>
      {children}
    </StyfiModeContext.Provider>
  );
}

export function useStyfiMode() {
  const context = useContext(StyfiModeContext);
  if (!context) {
    throw new Error("useStyfiMode must be used within a StyfiModeProvider");
  }
  return context;
}
