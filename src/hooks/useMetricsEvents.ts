/**
 * useMetricsEvents Hook
 *
 * Read a project's raw event feed, paginated.
 */

import {
  FeedbackKitError,
  type MetricEventList,
  type MetricsEventsOptions
} from 'feedbackkit-js';
import { useMetricsOperation } from './internal/metricsOperation';

export interface UseMetricsEventsResult {
  /** The event feed page, or null before the first successful load. */
  events: MetricEventList | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if the fetch threw. A narrowed (scoped or clamped) response is NOT an error. */
  error: FeedbackKitError | null;
  /** Refetch the current page */
  refetch: () => Promise<void>;
  /** Current query */
  query: MetricsEventsOptions;
  /** Update the query — this is also how you page, by setting `page`. */
  setQuery: (query: MetricsEventsOptions) => void;
}

/**
 * Hook to read a project's raw event feed.
 *
 * `initialQuery` is REQUIRED and has no default: `measures` is a required option, so a
 * defaulted empty query would make the first render a guaranteed validation failure.
 *
 * ⚠️ The response carries TWO meta blocks and they are NOT interchangeable:
 * `events.meta` is PAGINATION (`total`, `page`, `perPage`, `totalPages`), and
 * `events.metrics` is the window/scope block every other operation puts under `meta`.
 * Reading `eventScope` off `events.meta` is the mistake this shape invites — it lives on
 * `events.metrics`.
 *
 * The raw feed is one of the three exclusively-custom requests, so on a plan without
 * custom metrics it raises a `PaymentRequiredError` (402) rather than returning a scoped
 * 200. This is the one metrics hook whose `error` is expected to be populated on a Free
 * project.
 *
 * Paging is `setQuery` with a new `page`; each page replaces the last rather than
 * appending, so a feed screen accumulates rows itself.
 *
 * @param initialQuery - Measures, filters, window and pagination.
 *
 * @example
 * ```tsx
 * function EventFeedScreen() {
 *   const { events, isLoading, error, refetch, query, setQuery } = useMetricsEvents({
 *     measures: [MetricMeasure.EventCount],
 *     days: 7,
 *     page: 1,
 *     perPage: 50
 *   });
 *
 *   if (isLoading) return <ActivityIndicator />;
 *   if (error) return <ErrorView error={error} onRetry={refetch} />;
 *   if (!events) return null;
 *
 *   const hasNextPage = events.meta.page < events.meta.totalPages;
 *
 *   return (
 *     <View>
 *       {events.items.map((event) => (
 *         <Text key={event.id}>{event.eventName}</Text>
 *       ))}
 *       {events.metrics.eventScope === MetricEventScope.PredefinedOnly && (
 *         <Text>Only FeedbackKit's own events are readable on this plan.</Text>
 *       )}
 *       {hasNextPage && (
 *         <Button
 *           title="Load more"
 *           onPress={() => setQuery({ ...query, page: events.meta.page + 1 })}
 *         />
 *       )}
 *     </View>
 *   );
 * }
 * ```
 */
export function useMetricsEvents(
  initialQuery: MetricsEventsOptions
): UseMetricsEventsResult {
  const { data, ...rest } = useMetricsOperation<MetricsEventsOptions, MetricEventList>(
    initialQuery,
    (client, query) => client.metrics.events(query)
  );
  return { events: data, ...rest };
}
