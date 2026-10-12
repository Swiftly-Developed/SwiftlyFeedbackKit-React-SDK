import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { ValidationError, __metricsMock, __resetMetricsMock } from 'feedbackkit-js';
import { FeedbackProvider } from '../provider';
import { useMetrics } from '../hooks/useMetrics';
import { useMetricsTimeseries } from '../hooks/useMetricsTimeseries';
import { useMetricsBreakdown } from '../hooks/useMetricsBreakdown';
import { useMetricsEvents } from '../hooks/useMetricsEvents';

/**
 * `METRICS03` §22 — the other three key-family operations, as hooks.
 *
 * Phase `04` shipped `useMetrics` (summary) only and flagged the question in its §11‑3.
 * This suite covers the three hooks that close it. Phase `04`'s own suite,
 * `metrics-hook.test.tsx`, is deliberately NOT edited: the four hooks now share one
 * implementation (`hooks/internal/metricsOperation.ts`), and that suite passing
 * unchanged is the evidence the shared implementation preserved summary's behaviour.
 *
 * Same standing limit as that suite, and it is worth repeating rather than assuming a
 * reader followed the cross-reference: every assertion here runs against
 * `__mocks__/feedbackkit-js.ts`, because the JS SDK is a peer dependency and is not
 * installed. Jest CANNOT see a mismatch between these hooks and the SDK's real types.
 * The only thing that can is building the JS package and symlinking it into
 * `node_modules/` before `npx tsc --noEmit` — see
 * `docs/testing/suites/QA-UNIT10-SDK-PARITY.md` §7. Nothing below is a type gate.
 *
 * What IS gated here and nowhere else: which client method each hook calls. The type
 * oracle proves `useMetricsEvents` cannot return a `MetricSummary`; only these runtime
 * legs prove it did not call `summary` and discard the result.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FeedbackProvider apiKey="test-key">{children}</FeedbackProvider>
);

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

/** The five control fields every metrics hook carries, whatever it is named. */
const CONTROL_FIELDS = ['isLoading', 'error', 'refetch', 'query', 'setQuery'];

const SERIES_QUERY = { measures: ['event_count'], granularity: 'day', days: 7 };
const OTHER_SERIES_QUERY = { measures: ['event_count'], granularity: 'week', days: 30 };
const BREAKDOWN_QUERY = { measures: ['event_count'], dimension: 'event_name', days: 30 };
const OTHER_BREAKDOWN_QUERY = { measures: ['event_count'], dimension: 'status', days: 30 };
const EVENTS_QUERY = { measures: ['event_count'], days: 7, page: 1, perPage: 50 };
const OTHER_EVENTS_QUERY = { measures: ['event_count'], days: 7, page: 2, perPage: 50 };

/**
 * The four hooks under one description, so every leg below runs four times rather than
 * once with three copy-pasted near-twins. `payload` is the field each hook renames
 * `data` to; `operation` is the client method it must reach.
 */
const HOOKS = [
  { name: 'useMetrics', hook: useMetrics, operation: 'summary', payload: 'summary', query: { measures: ['event_count'], days: 7 }, otherQuery: { measures: ['feedback_count'], days: 30 } },
  { name: 'useMetricsTimeseries', hook: useMetricsTimeseries, operation: 'timeseries', payload: 'series', query: SERIES_QUERY, otherQuery: OTHER_SERIES_QUERY },
  { name: 'useMetricsBreakdown', hook: useMetricsBreakdown, operation: 'breakdown', payload: 'breakdown', query: BREAKDOWN_QUERY, otherQuery: OTHER_BREAKDOWN_QUERY },
  { name: 'useMetricsEvents', hook: useMetricsEvents, operation: 'events', payload: 'events', query: EVENTS_QUERY, otherQuery: OTHER_EVENTS_QUERY }
] as const;

const OPERATIONS = ['summary', 'timeseries', 'breakdown', 'events'] as const;

beforeEach(() => {
  __resetMetricsMock();
});

describe('the four metrics hooks · one per key-family operation', () => {
  it('covers every operation the client exposes, exactly once each', () => {
    // The parity claim this whole suite exists to discharge, asserted as a set equality
    // rather than a count: a fifth hook, or two hooks racing for one operation, reddens.
    expect(HOOKS.map((h) => h.operation).sort()).toEqual([...OPERATIONS].sort());
    expect(new Set(HOOKS.map((h) => h.payload)).size).toBe(4);
  });

  describe.each(HOOKS)('$name', ({ hook, operation, payload, query, otherQuery }) => {
    it('calls its OWN operation exactly once on mount, and no other', async () => {
      const { result } = renderHook(() => hook(query as never), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(__metricsMock[operation]).toHaveBeenCalledTimes(1);
      expect(__metricsMock[operation]).toHaveBeenCalledWith(query);

      // The routing leg. A hook wired to the wrong sibling is caught by `tsc` only when
      // the two return types differ; `timeseries` and `breakdown` both return a `meta`
      // plus a list, so this is the assertion that separates them.
      for (const other of OPERATIONS.filter((o) => o !== operation)) {
        expect(__metricsMock[other]).not.toHaveBeenCalled();
      }
    });

    it('exposes the five control fields plus its own payload field, and nothing else', () => {
      const { result } = renderHook(() => hook(query as never), { wrapper });
      // Set equality: a hook that also leaked the shared `data` field reddens here, and
      // a presence check for the payload name could never see it.
      expect(Object.keys(result.current).sort()).toEqual(
        [...CONTROL_FIELDS, payload].sort()
      );
    });

    it('refetches when the query changes and when refetch() is called', async () => {
      const { result } = renderHook(() => hook(query as never), { wrapper });
      await waitFor(() => expect(__metricsMock[operation]).toHaveBeenCalledTimes(1));

      await act(async () => {
        result.current.setQuery(otherQuery as never);
      });
      await waitFor(() => expect(__metricsMock[operation]).toHaveBeenCalledTimes(2));
      // The NEW query reached the client, rather than the effect re-firing with the old.
      expect(__metricsMock[operation]).toHaveBeenLastCalledWith(otherQuery);
      expect(result.current.query).toEqual(otherQuery);

      await act(async () => {
        await result.current.refetch();
      });
      expect(__metricsMock[operation]).toHaveBeenCalledTimes(3);
    });

    it('ignores a superseded response that lands after a newer one', async () => {
      // The shared request-sequence guard, asserted per hook rather than once on the
      // helper: a hook that hand-rolled its own fetch would pass every other leg here.
      let resolveSlow: ((value: unknown) => void) | undefined;
      const slow = new Promise((resolve) => {
        resolveSlow = resolve;
      });

      const stale = { meta: BASE_META, values: {}, series: [], items: [], metrics: BASE_META, dimension: 'event_name', __mark: 'stale' };
      const fresh = { meta: BASE_META, values: {}, series: [], items: [], metrics: BASE_META, dimension: 'event_name', __mark: 'fresh' };

      __metricsMock[operation]
        .mockImplementationOnce(() => slow)
        .mockImplementationOnce(() => Promise.resolve(fresh));

      const { result } = renderHook(() => hook(query as never), { wrapper });
      await waitFor(() => expect(__metricsMock[operation]).toHaveBeenCalledTimes(1));

      await act(async () => {
        result.current.setQuery(otherQuery as never);
      });
      await waitFor(() =>
        expect((result.current as Record<string, { __mark: string }>)[payload]?.__mark).toBe('fresh')
      );

      // The superseded first request now completes, last.
      await act(async () => {
        resolveSlow?.(stale);
        await slow;
      });

      expect((result.current as Record<string, { __mark: string }>)[payload]?.__mark).toBe('fresh');
      expect(result.current.isLoading).toBe(false);
    });

    it('treats a scoped, clamped response as a SUCCESS, not an error', async () => {
      // A plan that narrows the read answers 200 and declares the narrowing on the meta
      // block. Mapping that to `error` would pin the wrong contract — in all four hooks,
      // not just the one phase 04 shipped.
      const narrowedMeta = {
        ...BASE_META,
        eventScope: 'predefined_only',
        retentionClamped: true
      };
      __metricsMock[operation].mockResolvedValue({
        meta: operation === 'events' ? { total: 0, page: 1, perPage: 50, totalPages: 0 } : narrowedMeta,
        metrics: narrowedMeta,
        values: {},
        series: [],
        items: [],
        dimension: 'event_name'
      });

      const { result } = renderHook(() => hook(query as never), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeNull();
      expect((result.current as Record<string, unknown>)[payload]).not.toBeNull();
    });

    it('surfaces a thrown FeedbackKitError and stops loading', async () => {
      const thrown = new ValidationError('measures must contain at least one measure');
      __metricsMock[operation].mockRejectedValue(thrown);

      const { result } = renderHook(() => hook(query as never), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBe(thrown);
      expect((result.current as Record<string, unknown>)[payload]).toBeNull();
    });
  });
});

describe('the three new hooks · the shape each operation returns', () => {
  it('useMetricsTimeseries surfaces a meta that CARRIES granularity', async () => {
    // The paired positive to phase 04's absence leg on summary. `granularity` is present
    // on timeseries and breakdown and absent on summary, so a hook family that dropped
    // it everywhere would satisfy that suite and fail here.
    const { result } = renderHook(() => useMetricsTimeseries(SERIES_QUERY as never), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect('granularity' in (result.current.series?.meta ?? {})).toBe(true);
    // Empty buckets are PRESENT and zero-valued, so the array is the wrong emptiness
    // check — pinned as the shape, not as a claim that it is non-empty.
    expect(Array.isArray(result.current.series?.series)).toBe(true);
  });

  it('useMetricsBreakdown surfaces the dimension echo and a sparse overflow row', async () => {
    __metricsMock.breakdown.mockResolvedValue({
      meta: { ...BASE_META, granularity: 'day', truncated: true },
      dimension: 'event_name',
      items: [
        { key: 'checkout_completed', values: { event_count: 9, unique_event_users: 4 }, isOverflow: false },
        // The overflow row's map OMITS `unique_event_users` — the sparsity that bites.
        { key: 'other', values: { event_count: 3 }, isOverflow: true }
      ]
    });

    const { result } = renderHook(() => useMetricsBreakdown(BREAKDOWN_QUERY as never), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.breakdown?.dimension).toBe('event_name');
    expect(result.current.breakdown?.meta.truncated).toBe(true);
    const overflow = result.current.breakdown?.items.find((i) => i.isOverflow);
    expect(overflow?.values.event_count).toBe(3);
    // Read with `metricValue`, never asserted non-null: this key is genuinely absent.
    expect(overflow?.values.unique_event_users).toBeUndefined();
  });

  it('useMetricsEvents keeps the TWO meta blocks distinct and non-interchangeable', async () => {
    // `meta` is pagination; `metrics` is the window/scope block every other operation
    // puts under `meta`. Reading `eventScope` off `events.meta` is the mistake this
    // shape invites, so both key sets are pinned as equalities.
    const { result } = renderHook(() => useMetricsEvents(EVENTS_QUERY as never), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(Object.keys(result.current.events?.meta ?? {}).sort()).toEqual(
      ['total', 'page', 'perPage', 'totalPages'].sort()
    );
    expect(Object.keys(result.current.events?.metrics ?? {}).sort()).toEqual(
      [
        'measures',
        'timezone',
        'dateFrom',
        'dateTo',
        'truncated',
        'eventScope',
        'retentionClamped',
        'retentionWindowDays'
      ].sort()
    );
    // The window/scope block is NOT on `meta`, and pagination is NOT on `metrics`.
    expect('eventScope' in (result.current.events?.meta ?? {})).toBe(false);
    expect('totalPages' in (result.current.events?.metrics ?? {})).toBe(false);
  });
});

describe('the shared implementation is internal, and stays internal', () => {
  const hooksDir = join(__dirname, '..', 'hooks');

  it('all four metrics hooks route through hooks/internal/metricsOperation.ts', () => {
    // If one of them stopped sharing the implementation, the stale-guard legs above
    // would still pass on whatever it hand-rolled. This is the leg that says they are
    // one thing.
    for (const file of [
      'useMetrics.ts',
      'useMetricsTimeseries.ts',
      'useMetricsBreakdown.ts',
      'useMetricsEvents.ts'
    ]) {
      const source = readFileSync(join(hooksDir, file), 'utf8');
      expect(source).toContain("from './internal/metricsOperation'");
    }
  });

  it('the internal directory is deliberately outside the exported hook set', () => {
    // `sdk-parity.test.ts` derives the exported hook set from the files directly inside
    // `src/hooks/`, so a subdirectory is excluded — by design, not by accident. Pinned
    // here so nobody "fixes" the barrel by exporting an implementation detail.
    const barrel = readFileSync(join(hooksDir, 'index.ts'), 'utf8');
    expect(barrel).not.toContain('internal/');

    const internal = readdirSync(join(hooksDir, 'internal'));
    expect(internal).toContain('metricsOperation.ts');
    // Non-vacuity: the directory really was read.
    expect(internal.length).toBeGreaterThan(0);
  });
});
