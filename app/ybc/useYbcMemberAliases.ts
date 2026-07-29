"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAddress } from "viem";
import {
  clearYbcMemberAliases,
  loadYbcMemberAliases,
  normalizeYbcMemberAlias,
  saveYbcMemberAliases,
  YBC_MEMBER_ALIASES_STORAGE_KEY,
  type YbcMemberAliases,
} from "./memberAliases";

export type YbcMemberAliasMutationResult =
  | "saved"
  | "invalid"
  | "storage-error";

export function useYbcMemberAliases() {
  const [aliases, setAliases] = useState<YbcMemberAliases>({});
  const aliasesRef = useRef<YbcMemberAliases>({});

  useEffect(() => {
    const storage = getLocalStorage();
    const syncAliases = () => {
      const nextAliases = loadYbcMemberAliases(storage);
      aliasesRef.current = nextAliases;
      setAliases(nextAliases);
    };
    const handleStorage = (event: StorageEvent) => {
      if (
        event.storageArea === storage &&
        (event.key === YBC_MEMBER_ALIASES_STORAGE_KEY || event.key === null)
      ) {
        syncAliases();
      }
    };

    syncAliases();
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setAlias = useCallback(
    (address: string, value: string): YbcMemberAliasMutationResult => {
      const normalizedAlias = normalizeYbcMemberAlias(value);
      if (!isAddress(address) || !normalizedAlias) return "invalid";

      const nextAliases = {
        ...aliasesRef.current,
        [address.toLowerCase()]: normalizedAlias,
      };
      if (!saveYbcMemberAliases(getLocalStorage(), nextAliases)) {
        return "storage-error";
      }

      aliasesRef.current = nextAliases;
      setAliases(nextAliases);
      return "saved";
    },
    []
  );

  const resetAlias = useCallback(
    (address: string): YbcMemberAliasMutationResult => {
      if (!isAddress(address)) return "invalid";

      const nextAliases = { ...aliasesRef.current };
      delete nextAliases[address.toLowerCase()];
      if (!saveYbcMemberAliases(getLocalStorage(), nextAliases)) {
        return "storage-error";
      }

      aliasesRef.current = nextAliases;
      setAliases(nextAliases);
      return "saved";
    },
    []
  );

  const clearAliases = useCallback((): YbcMemberAliasMutationResult => {
    if (!clearYbcMemberAliases(getLocalStorage())) {
      return "storage-error";
    }

    aliasesRef.current = {};
    setAliases({});
    return "saved";
  }, []);

  return {
    aliases,
    clearAliases,
    resetAlias,
    setAlias,
  };
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
