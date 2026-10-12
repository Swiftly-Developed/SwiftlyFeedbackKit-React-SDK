/**
 * useMetricsBreakdown Hook
 *
 * Read a project's metrics grouped by a dimension.
 */

import {
  FeedbackKitError,
  type MetricBreakdown,
  type MetricsBreakdownOptions
} from 'feedbackkit-js';
import { useMetricsOperation } from './internal/metricsOperation';

export interface UseMetricsBreakdownResult {
  /** The grouped totals, or null before the first successful load. */
  breakdown: MetricBreakdown | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if the fetch threw. A narrowed (scoped or clamped) response is NOT an error. */
  error: FeedbackKitError | null;
  /** Refetch the breakdown */
  refetch: () => Promise<void>;
  /** Current query */
  query: MetricsBreakdownOptions;
  /** Update the query */
  setQuery: (query: MetricsBreakdownOptions) => void;
}

/**
 * Hook to read a project's metrics grouped by a dimension.
 *
 * `initialQuery` is REQUIRED and has no default, and this operation needs TWO required
 * options rather than one: `measures` and `dimension`. That is the reason this is its own
 * hook rather than a mode of `useMetrics` — the requirement is carried by the type.
 *
 * `items` arrives ordered by the first requested measure, descending. Do not re-sort
 * unless you mean to. Past the server's cardinality ceiling the tail collapses into a
 * single item with `isOverflow: true` and `meta.truncated` goes true, and THAT item's
 * `values` omits `unique_event_users` — so read values with `metricValue()` and never
 * assert non-null.
 *
 * Grouping by `event_name` on a plan without custom metrics is one of the three requests
 * that has no honest narrower answer: it raises a `PaymentRequiredError` (402) rather
 * than returning a scoped 200. The other two dimensions narrow silently and succeed.
 *
 * @param initialQuery - Measures, filters, window and the required dimension.
 *
 * @example
 * ```tsx
 * function TopEventsScreen() {
 *   const { breakdown, isLoading, error, refetch } = useMetricsBreakdown({
 *     measures: [MetricMeasure.EventCount, MetricMeasure.UniqueEventUsers],
 *     dimension: MetricDimension.EventName,
 *     days: 30
 *   });
 *
 *   if (isLoading) return <ActivityIndicator />;
 *   if (error) return <ErrorView error={error} onRetry={refetch} />;
 *   if (!breakdown) return null;
 *
 *   return (
 *     <View>
 *       {breakdown.items.map((item) => (
 *         <Text key={item.key}>
 *           {item.isOverflow ? 'Everything else' : item.key}:{' '}
 *           {metricValue(item.values, MetricMeasure.EventCount) ?? 0}
 *         </Text>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 *
 * `breakdown.meta.granularity` is PRESENT here (`'day'` by default) even though it
 * buckets nothing on this surface — its presence does not mean the response is a series.
 */
export function useMetricsBreakdown(
  initialQuery: MetricsBreakdownOptions
): UseMetricsBreakdownResult {
  const { data, ...rest } = useMetricsOperation<MetricsBreakdownOptions, MetricBreakdown>(
    initialQuery,
    (client, query) => client.metrics.breakdown(query)
  );
  return { breakdown: data, ...rest };
}
