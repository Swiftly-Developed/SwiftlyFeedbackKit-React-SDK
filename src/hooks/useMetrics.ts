/**
 * useMetrics Hook
 *
 * Read a project's aggregate metrics summary.
 */

import {
  FeedbackKitError,
  type MetricSummary,
  type MetricsQueryOptions
} from 'feedbackkit-js';
import { useMetricsOperation } from './internal/metricsOperation';

export interface UseMetricsResult {
  /** The summary, or null before the first successful load. */
  summary: MetricSummary | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if the fetch threw. A narrowed (scoped or clamped) response is NOT an error. */
  error: FeedbackKitError | null;
  /** Refetch the summary */
  refetch: () => Promise<void>;
  /** Current query */
  query: MetricsQueryOptions;
  /** Update the query */
  setQuery: (query: MetricsQueryOptions) => void;
}

/**
 * Hook to read a project's metrics summary.
 *
 * `initialQuery` is REQUIRED and has no default: `measures` is a required option, so a
 * defaulted empty query would make the first render a guaranteed validation failure.
 *
 * A narrowed response is a SUCCESS, not an error. When the plan restricts which events
 * are readable, or narrows the requested window, the server answers 200 and declares
 * what it did on `summary.meta` — read `eventScope`, `retentionClamped` and
 * `retentionWindowDays` off the meta block rather than inferring them from the plan, and
 * never hardcode a window length. `error` is populated only by a thrown
 * `FeedbackKitError`.
 *
 * @param initialQuery - Measures, filters and window. `measures` must be non-empty.
 *
 * @example
 * ```tsx
 * function MetricsScreen() {
 *   const { summary, isLoading, error, refetch } = useMetrics({
 *     measures: [MetricMeasure.FeedbackCount, MetricMeasure.EventCount],
 *     days: 7
 *   });
 *
 *   if (isLoading) return <LoadingSpinner />;
 *   if (error) return <ErrorView error={error} onRetry={refetch} />;
 *   if (!summary) return null;
 *
 *   // A project with no activity returns ZERO-valued entries, not an absent map, so
 *   // emptiness is a value check and not a null check on `summary`.
 *   const feedback = metricValue(summary.values, MetricMeasure.FeedbackCount) ?? 0;
 *
 *   return (
 *     <View>
 *       <Text>{feedback} items</Text>
 *       {summary.meta.eventScope === MetricEventScope.PredefinedOnly && (
 *         <Text>Custom events are not readable on this plan.</Text>
 *       )}
 *       {summary.meta.retentionClamped && (
 *         <Text>Showing the last {summary.meta.retentionWindowDays} days.</Text>
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useMetrics(initialQuery: MetricsQueryOptions): UseMetricsResult {
  const { data, ...rest } = useMetricsOperation<MetricsQueryOptions, MetricSummary>(
    initialQuery,
    (client, query) => client.metrics.summary(query)
  );
  return { summary: data, ...rest };
}
