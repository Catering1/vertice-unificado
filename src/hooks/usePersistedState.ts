import { useState, useCallback, useRef } from "react";

// Module-level cache to persist state across unmounts
const cache = new Map<string, any>();

export function usePersistedState<T>(key: string, initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => cache.has(key) ? cache.get(key) : initialValue);

  const setPersistedState = useCallback((val: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof val === "function" ? (val as (prev: T) => T)(prev) : val;
      cache.set(key, next);
      return next;
    });
  }, [key]);

  return [state, setPersistedState];
}
