/**
 * useFeedbackList Hook
 *
 * Fetch and manage a list of feedback items.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Feedback,
  FeedbackStatus,
  FeedbackCategory,
  FeedbackSort,
  FeedbackKitError
} from 'feedbackkit-js';
import { useFeedbackKitContext } from '../provider';

export interface FeedbackListFilter {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  includeMerged?: boolean;
  sort?: FeedbackSort;
}

export interface UseFeedbackListResult {
  /** List of feedback items */
  feedbacks: Feedback[];
  /** Loading state */
  isLoading: boolean;
  /** Error if fetch failed */
  error: FeedbackKitError | null;
  /** Refetch the list */
  refetch: () => Promise<void>;
  /** Current filter */
  filter: FeedbackListFilter;
  /**
   * Update the filter. An updater function receives the current filter, so a
   * caller can change one field without dropping the others.
   */
  setFilter: (
    filter: FeedbackListFilter | ((current: FeedbackListFilter) => FeedbackListFilter)
  ) => void;
}

/**
 * Hook to fetch and manage feedback list
 *
 * @param initialFilter - Initial filter options
 *
 * @example
 * ```tsx
 * function FeedbackScreen() {
 *   const {
 *     feedbacks,
 *     isLoading,
 *     error,
 *     refetch,
 *     filter,
 *     setFilter
 *   } = useFeedbackList({ status: FeedbackStatus.Approved });
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorView error={error} onRetry={refetch} />;
 *
 *   return (
 *     <FlatList
 *       data={feedbacks}
 *       renderItem={({ item }) => <FeedbackCard feedback={item} />}
 *       onRefresh={refetch}
 *       refreshing={isLoading}
 *     />
 *   );
 * }
 * ```
 */
export function useFeedbackList(
  initialFilter: FeedbackListFilter = {}
): UseFeedbackListResult {
  const { client, isInitialized } = useFeedbackKitContext();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FeedbackKitError | null>(null);
  const [filter, setFilter] = useState<FeedbackListFilter>(initialFilter);
  // Bumped at the start of each read and again on unmount, so a slower response
  // (or one that lands after the screen is gone) cannot paint over a newer one.
  const requestId = useRef(0);

  const fetchFeedbacks = useCallback(async () => {
    if (!isInitialized) return;

    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await client.feedback.list({
        status: filter.status,
        category: filter.category,
        includeMerged: filter.includeMerged,
        sort: filter.sort
      });
      if (id !== requestId.current) return;
      setFeedbacks(result);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err as FeedbackKitError);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [client, filter, isInitialized]);

  // Fetch on mount and when filter changes
  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  useEffect(() => {
    return () => {
      requestId.current += 1;
    };
  }, []);

  const refetch = useCallback(async () => {
    await fetchFeedbacks();
  }, [fetchFeedbacks]);

  return {
    feedbacks,
    isLoading,
    error,
    refetch,
    filter,
    setFilter
  };
}
