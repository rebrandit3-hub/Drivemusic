import { useCallback, useEffect, useState } from "react";

const cache = new Map<string, { data: unknown; at: number }>();
const FRESH_MS = 5 * 60 * 1000;

/** Tiny fetch cache: shows cached data at once, refetches when stale. */
export function useQuery<T>(key: string | null, fn: () => Promise<T>) {
  const cached = key ? (cache.get(key) as { data: T; at: number } | undefined) : undefined;
  const [data, setData] = useState<T | undefined>(cached?.data);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cached && key !== null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!key) return;
    const hit = cache.get(key) as { data: T; at: number } | undefined;
    setData(hit?.data);
    setError(null);
    if (hit && Date.now() - hit.at < FRESH_MS && attempt === 0) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(!hit);
    fn()
      .then((result) => {
        cache.set(key, { data: result, at: Date.now() });
        if (alive) setData(result);
      })
      .catch((err: unknown) => {
        if (alive && !hit) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // fn is recreated each render; the key identifies the request
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data, error, loading, retry };
}
