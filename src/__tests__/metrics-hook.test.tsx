import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import {
  FeedbackKit,
  ValidationError,
  __metricsMock,
  __resetMetricsMock
} from 'feedbackkit-js';
import { FeedbackProvider } from '../provider';
import { useMetrics } from '../hooks/useMetrics';

/**
 * `METRICS03` phase 04 — `useMetrics`.
 *
 * Every assertion here runs against `__mocks__/feedbackkit-js.ts`, because the JS SDK is
 * a peer dependency and is not installed. That is a real limit and it is worth stating
 * at the top of the file a future reader will trust: jest CANNOT see a mismatch between
 * this hook and the SDK's actual types. The only thing that can is building the JS
 * package and symlinking it into `node_modules/` before `npx tsc --noEmit` — see
 * `docs/testing/suites/QA-UNIT10-SDK-PARITY.md` §7. Nothing below is a type gate.
 *
 * No source census lives in this file. The two helpers a census needs (`sourceFiles`,
 * `withoutComments`) are file-local and unexported in two sibling suites, so a census
 * here would be a third copy; the structural legs live in `sdk-parity.test.ts` instead,
 * beside the copy that already exists there.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FeedbackProvider apiKey="test-key">{children}</FeedbackProvider>
);

/** The eight fields a `summary` meta block carries. `granularity` is NOT among them. */
const SUMMARY_META_FIELDS = [
  'measures',
  'timezone',
  'dateFrom',
  'dateTo',
  'truncated',
  'eventScope',
  'retentionClamped',
  'retentionWindowDays'
];

const BASE_META = {
  measures: ['event_count'],
  timezone: 'UTC',
  dateFrom: '2026-08-01T00:00:00.000Z',
  dateTo: '2026-08-07T00:00:00.000Z',
  truncated: false,
  eventScope: 'all',
  retentionClamped: false,
  retentionWindowDays: 30
};

const QUERY = { measures: ['event_count'], days: 7 };
const OTHER_QUERY = { measures: ['feedback_count'], days: 30 };

beforeEach(() => {
  __resetMetricsMock();
});

describe('useMetrics · request behaviour', () => {
  it('calls metrics.summary exactly once on mount, with the initial query', async () => {
    const { result } = renderHook(() => useMetrics(QUERY), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // A hook that refetches on every render passes a "was it called" check and fails
    // this one.
    expect(__metricsMock.summary).toHaveBeenCalledTimes(1);
    expect(__metricsMock.summary).toHaveBeenCalledWith(QUERY);
  });

  it('refetches when the query changes and when refetch() is called', async () => {
    const { result } = renderHook(() => useMetrics(QUERY), { wrapper });
    await waitFor(() => expect(__metricsMock.summary).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.setQuery(OTHER_QUERY);
    });
    await waitFor(() => expect(__metricsMock.summary).toHaveBeenCalledTimes(2));
    // The new query reached the client, rather than the effect re-firing with the old one.
    expect(__metricsMock.summary).toHaveBeenLastCalledWith(OTHER_QUERY);
    expect(result.current.query).toEqual(OTHER_QUERY);

    await act(async () => {
      await result.current.refetch();
    });
    expect(__metricsMock.summary).toHaveBeenCalledTimes(3);
  });

  it('ignores a superseded response that lands after a newer one', async () => {
    // The interaction this guards is a user dragging a date range: two overlapping
    // requests, the first slower than the second. Without a request-sequence guard the
    // hook renders the FIRST query's numbers under the SECOND query's label.
    let resolveSlow: ((value: unknown) => void) | undefined;
    const slow = new Promise((resolve) => {
      resolveSlow = resolve;
    });

    __metricsMock.summary
      .mockImplementationOnce(() => slow)
      .mockImplementationOnce(() =>
        Promise.resolve({ meta: BASE_META, values: { feedback_count: 2 } })
      );

    const { result } = renderHook(() => useMetrics(QUERY), { wrapper });
    await waitFor(() => expect(__metricsMock.summary).toHaveBeenCalledTimes(1));

    await act(async () => {
      result.current.setQuery(OTHER_QUERY);
    });
    await waitFor(() => expect(result.current.summary?.values.feedback_count).toBe(2));

    // The superseded first request now completes, last.
    await act(async () => {
      resolveSlow?.({ meta: BASE_META, values: { event_count: 999 } });
      await slow;
    });

    expect(result.current.summary?.values.feedback_count).toBe(2);
    expect(result.current.summary?.values.event_count).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useMetrics · response handling', () => {
  it('treats a scoped, clamped response as a SUCCESS, not an error', async () => {
    // A plan that narrows the read answers 200 and declares the narrowing on `meta`.
    // Mapping that to `error` would pin the wrong contract.
    __metricsMock.summary.mockResolvedValue({
      meta: {
        ...BASE_META,
        eventScope: 'predefined_only',
        retentionClamped: true,
        retentionWindowDays: 30
      },
      values: { event_count: 3 }
    });

    const { result } = renderHook(() => useMetrics(QUERY), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.summary?.meta.eventScope).toBe('predefined_only');
    expect(result.current.summary?.meta.retentionClamped).toBe(true);
    // Read from the payload, never hardcoded at a render site.
    expect(result.current.summary?.meta.retentionWindowDays).toBe(30);
  });

  it('renders a summary whose meta OMITS granularity', async () => {
    const { result } = renderHook(() => useMetrics(QUERY), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const meta = result.current.summary?.meta;
    expect(meta).toBeDefined();
    // Set equality, so an added field reddens too. `granularity` is absent from the
    // object — an explicit null would still appear in `Object.keys`, which is why this
    // is a key-set comparison and not an `=== undefined` check.
    expect(Object.keys(meta ?? {}).sort()).toEqual([...SUMMARY_META_FIELDS].sort());
    expect('granularity' in (meta ?? {})).toBe(false);
  });

  it('surfaces a thrown FeedbackKitError and stops loading', async () => {
    const thrown = new ValidationError('measures must contain at least one measure');
    __metricsMock.summary.mockRejectedValue(thrown);

    const { result } = renderHook(() => useMetrics(QUERY), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe(thrown);
    expect(result.current.summary).toBeNull();
  });
});

describe('the jest mock of feedbackkit-js · metrics surface', () => {
  // A presence check cannot see an extra, so every leg here is a set equality.

  it('the client exposes exactly the six API groups plus the two user-id methods', () => {
    const client = new FeedbackKit({ apiKey: 'test-key' });

    // `setUserId`/`getUserId` are instance-field mocks mirroring the real client's two
    // methods — named here rather than filtered out, so a mock that silently dropped one
    // reddens as well.
    expect(Object.keys(client).sort()).toEqual(
      [
        'feedback',
        'votes',
        'comments',
        'users',
        'events',
        'metrics',
        'setUserId',
        'getUserId'
      ].sort()
    );
  });

  it('the metrics group exposes exactly the four operations', () => {
    const client = new FeedbackKit({ apiKey: 'test-key' });
    expect(Object.keys(client.metrics).sort()).toEqual(
      ['summary', 'timeseries', 'breakdown', 'events'].sort()
    );
  });

  it('granularity is present on timeseries and breakdown, absent on summary', async () => {
    const client = new FeedbackKit({ apiKey: 'test-key' });

    const series = await client.metrics.timeseries(QUERY);
    const breakdown = await client.metrics.breakdown(QUERY);
    const summary = await client.metrics.summary(QUERY);

    // The paired positive: without these two, the absence check above is satisfied by a
    // mock that never carries granularity anywhere.
    expect('granularity' in series.meta).toBe(true);
    expect('granularity' in breakdown.meta).toBe(true);
    expect('granularity' in summary.meta).toBe(false);
  });

  it('the event feed carries BOTH meta blocks, and they are not interchangeable', () => {
    // `meta` is pagination; `metrics` is the window/scope block every other operation
    // puts under `meta`. A mock with one block would make a wrong hook green.
    return new FeedbackKit({ apiKey: 'test-key' }).metrics
      .events(QUERY)
      .then((feed: Record<string, Record<string, unknown>>) => {
        expect(Object.keys(feed).sort()).toEqual(['items', 'meta', 'metrics'].sort());
        expect(Object.keys(feed.meta).sort()).toEqual(
          ['total', 'page', 'perPage', 'totalPages'].sort()
        );
        expect(Object.keys(feed.metrics).sort()).toEqual([...SUMMARY_META_FIELDS].sort());
      });
  });
});
