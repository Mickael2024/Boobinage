import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Charge des données asynchrones au montage (et quand `deps` change).
 * `reload()` relance le chargement sans vider l'affichage actuel.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const id = ++seq.current;
    setLoading(true);
    try {
      const r = await fnRef.current();
      if (id === seq.current) {
        setData(r);
        setError(null);
      }
    } catch (e) {
      console.error(e);
      if (id === seq.current) setError(e);
    } finally {
      if (id === seq.current) setLoading(false);
    }
  }, []);

  useEffect(() => void reload(), deps);

  return { data, error, loading, reload, setData };
}
