/**
 * useMetricsTimeseries Hook
 *
 * Read a project's metrics bucketed over the window.
 */

import {
  FeedbackKitError,
  type MetricSeries,
  type MetricsSeriesOptions
} from 'feedbackkit-js';
import { useMetricsOperation } from './internal/metricsOperation';

export interface UseMetricsTimeseriesResult {
  /** The bucketed series, or null before the first successful load. */
  series: MetricSeries | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if the fetch threw. A narrowed (scoped or clamped) response is NOT an error. */
  error: FeedbackKitError | null;
  /** Refetch the series */
  refetch: () => Promise<void>;
  /** Current query */
  query: MetricsSeriesOptions;
  /** Update the query */
  setQuery: (query: MetricsSeriesOptions) => void;
}

/**
 * Hook to read a project's metrics as an ordered list of buckets.
 *
 * `initialQuery` is REQUIRED and has no default: `measures` is a required option, so a
 * defaulted empty query would make the first render a guaranteed validation failure.
 * `granularity` IS optional and defaults to daily server-side.
 *
 * Empty buckets are PRESENT and zero-valued, not omitted, so `series.series.length === 0`
 * is a branch that never fires for a valid window — check the bucket VALUES for
 * emptiness, not the array length.
 *
 * A narrowed response is a SUCCESS, not an error. Read `eventScope`, `retentionClamped`
 * and `retentionWindowDays` off `series.meta` rather than inferring them from the plan,
 * and never hardcode a window length. `error` is populated only by a thrown
 * `FeedbackKitError`.
 *
 * @param initialQuery - Measures, filters, window and bucket width. `measures` must be
 *   non-empty.
 *
 * @example
 * ```tsx
 * function TrendScreen() {
 *   const { series, isLoading, error, refetch } = useMetricsTimeseries({
 *     measures: [MetricMeasure.EventCount],
 *     granularity: MetricGranularity.Day,
 *     days: 7
 *   });
 *
 *   if (isLoading) return <ActivityIndicator />;
 *   if (error) return <ErrorView error={error} onRetry={refetch} />;
 *   if (!series) return null;
 *
 *   return (
 *     <View>
 *       {series.series.map((point) => (
 *         <Text key={point.bucket}>
 *           {point.bucket}: {metricValue(point.values, MetricMeasure.EventCount) ?? 0}
 *         </Text>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
export function useMetricsTimeseries(
  initialQuery: MetricsSeriesOptions
): UseMetricsTimeseriesResult {
  const { data, ...rest } = useMetricsOperation<MetricsSeriesOptions, MetricSeries>(
    initialQuery,
    (client, query) => client.metrics.timeseries(query)
  );
  return { series: data, ...rest };
}
