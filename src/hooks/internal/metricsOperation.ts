/**
 * Shared implementation behind the four metrics hooks.
 *
 * This is INTERNAL. It lives in a subdirectory rather than beside the hooks because
 * `src/__tests__/sdk-parity.test.ts` derives the exported hook set from the files
 * directly inside `src/hooks/`, and this file is an implementation detail, not a hook
 * the package exports. That suite pins the exclusion explicitly so it stays a decision
 * rather than an accident.
 *
 * Why one implementation rather than four copies: the request-sequence guard below is
 * the subtle part of every one of these hooks, and a hand-copy is a place for it to be
 * quietly wrong in three of four surfaces while the one suite that tests it stays green.
 * The four public hooks are thin wrappers that each pin their own operation's option and
 * result types, so the type oracle still sees each surface separately.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { FeedbackKit, FeedbackKitError } from 'feedbackkit-js';
import { useFeedbackKitContext } from '../../provider';

/** The fields every metrics hook's result shares. Each public hook renames `data`. */
export interface MetricsOperationResult<TQuery, TResult> {
  /** The response, or null before the first successful load. */
  data: TResult | null;
  isLoading: boolean;
  error: FeedbackKitError | null;
  refetch: () => Promise<void>;
  query: TQuery;
  setQuery: (query: TQuery) => void;
}

/**
 * Run one `client.metrics.*` operation, keyed on a query held in state.
 *
 * @param initialQuery - Required, never defaulted: `measures` has no sensible default,
 *   so a defaulted query would make the first render a guaranteed validation failure.
 * @param run - Delegates to a single `client.metrics.*` call. Typed rather than keyed by
 *   an operation name, so TypeScript checks each hook's option and result types against
 *   the real client method instead of a cast. Every call site is a one-liner closing over
 *   nothing, which is why the ref below never needs reassigning.
 */
export function useMetricsOperation<TQuery, TResult>(
  initialQuery: TQuery,
  run: (client: FeedbackKit, query: TQuery) => Promise<TResult>
): MetricsOperationResult<TQuery, TResult> {
  const { client, isInitialized } = useFeedbackKitContext();
  const [data, setData] = useState<TResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FeedbackKitError | null>(null);
  const [query, setQuery] = useState<TQuery>(initialQuery);
  const requestId = useRef(0);

  // Held in a ref so an inline arrow at the call site does not re-key the effect on
  // every render. It is never reassigned: each call site's closure captures nothing, so
  // the first one is the only one there is.
  const runRef = useRef(run);

  const fetchData = useCallback(async () => {
    if (!isInitialized) return;

    // A request-sequence guard, the same shape as `useFeedbackList`, `useFeedback`,
    // and `useComments`. Two overlapping reads are the expected interaction, and the
    // slower one must not paint over the newer one. It is a sequence check rather than
    // an `AbortController` because `HttpClient` owns its controller for the timeout and
    // exposes no cancellation; adding one is a change to the JS package.
    const id = ++requestId.current;

    setIsLoading(true);
    setError(null);

    try {
      const result = await runRef.current(client, query);
      if (id !== requestId.current) return;
      setData(result);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err as FeedbackKitError);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [client, query, isInitialized]);

  // Fetch on mount and when the query changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch, query, setQuery };
}
