/**
 * useFeedback Hook
 *
 * Fetch a single feedback item by ID.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Feedback, FeedbackKitError } from 'feedbackkit-js';
import { useFeedbackKitContext } from '../provider';

export interface UseFeedbackResult {
  /** The feedback item */
  feedback: Feedback | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if fetch failed */
  error: FeedbackKitError | null;
  /** Refetch the feedback */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch a single feedback item
 *
 * @param feedbackId - The feedback UUID
 *
 * @example
 * ```tsx
 * function FeedbackDetailScreen({ route }) {
 *   const { feedbackId } = route.params;
 *   const { feedback, isLoading, error, refetch } = useFeedback(feedbackId);
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorView error={error} onRetry={refetch} />;
 *   if (!feedback) return <NotFoundView />;
 *
 *   return <FeedbackDetail feedback={feedback} />;
 * }
 * ```
 */
export function useFeedback(feedbackId: string): UseFeedbackResult {
  const { client, isInitialized } = useFeedbackKitContext();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<FeedbackKitError | null>(null);
  // Bumped at the start of each read and again on unmount, so a response for an
  // id the caller has already left cannot replace the current item.
  const requestId = useRef(0);

  const fetchFeedback = useCallback(async () => {
    if (!isInitialized || !feedbackId) return;

    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await client.feedback.get(feedbackId);
      if (id !== requestId.current) return;
      setFeedback(result);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err as FeedbackKitError);
      setFeedback(null);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [client, feedbackId, isInitialized]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  useEffect(() => {
    return () => {
      requestId.current += 1;
    };
  }, []);

  const refetch = useCallback(async () => {
    await fetchFeedback();
  }, [fetchFeedback]);

  return {
    feedback,
    isLoading,
    error,
    refetch
  };
}
