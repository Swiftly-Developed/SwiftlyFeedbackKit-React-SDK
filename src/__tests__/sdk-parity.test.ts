import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { defaultTheme, darkTheme } from '../styles/theme';

/**
 * `QA-UNIT10-SDK-PARITY`, React Native half — `-13` and `-19`.
 *
 * `-13` extends the single-definition guard the existing parity files established:
 * `feedback-status-parity.test.ts` already guards `FeedbackStatus`/`FeedbackCategory`/
 * `Feedback`, and `comment-type-parity.test.ts` guards `Comment` — those are cited, not
 * duplicated here. This file sweeps the REST of the shared vocabulary: the error class
 * family, `VoteResponse`, `SDKUser`, `TrackedEvent`, `FeedbackKitConfig`, and the
 * `FeedbackKit` client class itself. RN's whole parity story is that it declares none of
 * these — it re-exports the JS SDK's — and the moment a local twin appears, every JS-lane
 * case silently stops covering React Native.
 *
 * One deliberate exception, documented rather than swept under: `src/styles/theme.ts` IS
 * a legitimate second definition — of the THEME only (`Theme`, `StatusColors`,
 * `CategoryColors`). The JS SDK ships no theme, so there is nothing upstream for it to
 * re-export; the theme is `-19`'s subject below, not a `-13` violation.
 *
 * `-19` is the RN arm of the theme field census. RN's palette is iOS system colors
 * (`#007AFF`, `#34C759`, ...), deliberately NOT the Tailwind palette Flutter and Kotlin
 * share — so RN is EXCLUDED from the cross-SDK tint VALUE comparison (`-20`) and
 * participates in the field census (`-19`) only: same fields, same sub-map key sets,
 * light and dark structurally identical.
 */

const srcRoot = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || entry === '__mocks__') continue;
      out.push(...sourceFiles(full));
      continue;
    }
    if (entry.endsWith('.ts') || entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** Strip line and block comments, so a scan cannot find a component's explanatory
 *  comment (or this file's own prose) and report it as a product declaration. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('QA-UNIT10 -13 · RN single-definition guard (client vocabulary)', () => {
  /** The base error class, its EIGHT subclasses (`RateLimitError` joined them), the three
   *  response/value types, the config type, the client class, and the whole metrics
   *  vocabulary — everything RN must import, never redeclare.
   *
   *  The metrics entries are not decoration: `useMetrics` consumes a paid, tier-scoped
   *  surface, and a local `MetricsMeta` would type-check against RN's hand-written jest
   *  mock while disagreeing with the server. The case below this one derives the metrics
   *  names from the JS barrel and asserts this array covers them, so a type the JS SDK
   *  adds later cannot silently escape the sweep. */
  const GUARDED_NAMES = [
    'FeedbackKitError',
    'AuthenticationError',
    'PaymentRequiredError',
    'ForbiddenError',
    'NotFoundError',
    'ConflictError',
    'ValidationError',
    'RateLimitError',
    'NetworkError',
    'VoteResponse',
    'SDKUser',
    'TrackedEvent',
    'FeedbackKitConfig',
    'FeedbackKit',
    'PaginationMeta',
    'MetricMeasure',
    'MetricGranularity',
    'MetricDimension',
    'MetricEventScope',
    'MetricValues',
    'MetricsMeta',
    'MetricSummary',
    'MetricSeriesPoint',
    'MetricSeries',
    'MetricBreakdownItem',
    'MetricBreakdown',
    'MetricEventList',
    'MetricsQueryOptions',
    'MetricsSeriesOptions',
    'MetricsBreakdownOptions',
    'MetricsEventsOptions'
  ];

  /** Names the JS SDK's barrel exports, comment-stripped. Read as SOURCE rather than
   *  imported, because importing `feedbackkit-js` from a test resolves to RN's mock. */
  const jsBarrelExports = (): string[] => {
    const barrel = withoutComments(
      readFileSync(
        join(srcRoot, '..', '..', 'SwiftlyFeedbackKit-JS', 'src', 'index.ts'),
        'utf8'
      )
    );
    const names: string[] = [];
    for (const match of barrel.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
      for (const raw of match[1].split(',')) {
        const name = raw.trim();
        if (name) names.push(name);
      }
    }
    return names;
  };

  it('declares none of the shared client vocabulary anywhere under src/', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(srcRoot)) {
      const source = withoutComments(readFileSync(file, 'utf8'));
      for (const name of GUARDED_NAMES) {
        // `\b` after the name keeps `FeedbackKit` from matching inside
        // `FeedbackKitError` or `FeedbackKitTheme` — only the exact symbol counts.
        if (
          new RegExp(`(^|\\n)\\s*(export\\s+)?(enum|interface|class)\\s+${name}\\b`).test(
            source
          )
        ) {
          offenders.push(`${file} declares ${name}`);
        }
        if (new RegExp(`(^|\\n)\\s*(export\\s+)?type\\s+${name}\\s*[=<]`).test(source)) {
          offenders.push(`${file} declares type ${name}`);
        }
      }
    }

    expect(offenders).toEqual([]);
    // Non-vacuity: the sweep really walked the package. (The jest mock under
    // `__mocks__/feedbackkit-js.ts` DOES declare these names — it must, as the stand-in
    // for an uninstalled peer dependency — and it is outside src/ and skipped.)
    expect(sourceFiles(srcRoot).length).toBeGreaterThan(15);
  });

  it('the guard covers every metrics name the JS barrel exports, derived not retyped', () => {
    // Retyping the vocabulary here would make this array a second hand-maintained list of
    // the JS type surface — the exact drift class this whole file exists to prevent.
    const exported = jsBarrelExports();
    const metricsNames = exported.filter(
      (name) => name.startsWith('Metric') || name === 'PaginationMeta'
    );

    const unguarded = metricsNames.filter((name) => !GUARDED_NAMES.includes(name));
    expect(unguarded).toEqual([]);

    // Non-vacuity, both halves: the barrel really parsed, and it really carries the
    // metrics family. A regex that matched nothing would satisfy the check above.
    expect(exported.length).toBeGreaterThan(20);
    expect(metricsNames.length).toBeGreaterThan(10);
    expect(metricsNames).toContain('MetricsMeta');
    // The error family the guard also covers grew by one in phase 02.
    expect(exported).toContain('RateLimitError');
    expect(GUARDED_NAMES).toContain('RateLimitError');
  });

  it('re-exports the JS SDK wholesale and imports VoteResponse at the consuming hook', () => {
    // Paired positive for the negative above: RN not declaring the vocabulary only means
    // parity if it actually ships the JS SDK's. Both facts are source text.
    const barrel = readFileSync(join(srcRoot, 'index.ts'), 'utf8');
    expect(barrel).toContain("export * from 'feedbackkit-js'");

    const useVote = withoutComments(
      readFileSync(join(srcRoot, 'hooks', 'useVote.ts'), 'utf8')
    );
    expect(useVote).toMatch(
      /import\s*\{[^}]*\bVoteResponse\b[^}]*\}\s*from\s*'feedbackkit-js'/
    );
  });
});

describe('QA-UNIT10 -19 · RN theme field census', () => {
  /** The complete field set `Theme` declares and `defaultTheme` ships — pinned as an
   *  equality so a field added to one theme but not the other reddens here. */
  const THEME_FIELDS = [
    'primaryColor',
    'backgroundColor',
    'cardBackgroundColor',
    'textColor',
    'secondaryTextColor',
    'borderColor',
    'errorColor',
    'successColor',
    'statusColors',
    'categoryColors',
    'borderRadius',
    'spacing'
  ];

  it('defaultTheme and darkTheme carry the same, pinned field set', () => {
    expect(Object.keys(defaultTheme).sort()).toEqual([...THEME_FIELDS].sort());
    expect(Object.keys(darkTheme).sort()).toEqual(Object.keys(defaultTheme).sort());
  });

  it('statusColors covers exactly the six statuses, categoryColors exactly the four categories', () => {
    // NOTE: the sub-keys are the theme's own camelCase spellings (`inProgress`,
    // `featureRequest`), NOT the wire spellings (`in_progress`, `feature_request`) —
    // `getStatusColor` owns the enum→key mapping. Pinned as shipped.
    expect(Object.keys(defaultTheme.statusColors).sort()).toEqual(
      ['pending', 'approved', 'inProgress', 'testflight', 'completed', 'rejected'].sort()
    );
    expect(Object.keys(defaultTheme.categoryColors).sort()).toEqual(
      ['featureRequest', 'bugReport', 'improvement', 'other'].sort()
    );
    // The six status tints are pairwise distinct — a census over a map that painted six
    // statuses one color would count fields of a broken palette.
    expect(new Set(Object.values(defaultTheme.statusColors)).size).toBe(6);
  });

  it('darkTheme is a real variant: surfaces flip, status/category tints are shared', () => {
    // Paired positive for the field-set equality: identical keys could be satisfied by
    // `darkTheme === defaultTheme`. It is not — the four surface colors differ — while
    // the status and category sub-maps are deliberately shared between modes (pinned as
    // shipped; a mode-specific tint would redden here and is a design change, not drift).
    expect(darkTheme.backgroundColor).not.toBe(defaultTheme.backgroundColor);
    expect(darkTheme.cardBackgroundColor).not.toBe(defaultTheme.cardBackgroundColor);
    expect(darkTheme.textColor).not.toBe(defaultTheme.textColor);
    expect(darkTheme.borderColor).not.toBe(defaultTheme.borderColor);
    expect(darkTheme.statusColors).toEqual(defaultTheme.statusColors);
    expect(darkTheme.categoryColors).toEqual(defaultTheme.categoryColors);
  });
});

describe('METRICS03 04 · RN hook barrel parity', () => {
  const hooksDir = join(srcRoot, 'hooks');

  /** Every hook MODULE on disk, derived from the directory rather than listed.
   *
   *  Deliberately NOT recursive. `hooks/internal/` holds the shared implementation the
   *  four metrics hooks route through — an implementation detail, not an exported hook —
   *  and excluding it is a decision, pinned in `metrics-operation-hooks.test.ts`, rather
   *  than a side effect of this filter. A `.ts` file added directly in `src/hooks/` is
   *  still a hook and still has to appear in both barrels. */
  const hookModules = (): string[] =>
    readdirSync(hooksDir)
      .filter((entry) => entry.endsWith('.ts') && entry !== 'index.ts')
      .map((entry) => entry.replace(/\.tsx?$/, ''));

  /** The hook NAMES a barrel block exports — types in the same block are ignored, since
   *  `src/index.ts` re-exports the functions only. */
  const hookNames = (block: string): string[] =>
    block
      .split(',')
      .map((raw) => raw.trim())
      .filter((name) => /^use[A-Z]/.test(name));

  it('src/hooks/index.ts exports exactly the hook modules on disk', () => {
    // Set equality, not containment: an eighth hook file nobody exported reddens here,
    // and a presence check for `useMetrics` could never see it.
    const barrel = withoutComments(readFileSync(join(hooksDir, 'index.ts'), 'utf8'));
    const exported = hookNames(
      [...barrel.matchAll(/export\s*\{([^}]*)\}/g)].map((m) => m[1]).join(',')
    );

    expect(exported.sort()).toEqual(hookModules().sort());
    // Non-vacuity: the directory really has hooks and the barrel really parsed.
    expect(hookModules().length).toBeGreaterThan(5);
    expect(exported).toContain('useMetrics');
  });

  it('the package barrel re-exports exactly the same hook set', () => {
    const rootBarrel = withoutComments(readFileSync(join(srcRoot, 'index.ts'), 'utf8'));
    const block = /export\s*\{([^}]*)\}\s*from\s*'\.\/hooks'/.exec(rootBarrel);
    expect(block).not.toBeNull();

    expect(hookNames(block ? block[1] : '').sort()).toEqual(hookModules().sort());
  });

  /** Each metrics hook, and the operation-specific vocabulary it must IMPORT rather
   *  than redeclare. The four option types are the whole reason these are four hooks and
   *  not one parameterised one: `breakdown` requires a `dimension` that `summary` has no
   *  field for, and the event feed's result puts the window/scope block under `metrics`
   *  where the other three put it under `meta`. A hook holding a local twin of any of
   *  these would type-check against RN's hand-written jest mock while disagreeing with
   *  the server, which is exactly what the sweep above exists to prevent. */
  const METRICS_HOOK_TYPES: Array<[string, string[]]> = [
    ['useMetrics.ts', ['MetricSummary', 'MetricsQueryOptions']],
    ['useMetricsTimeseries.ts', ['MetricSeries', 'MetricsSeriesOptions']],
    ['useMetricsBreakdown.ts', ['MetricBreakdown', 'MetricsBreakdownOptions']],
    ['useMetricsEvents.ts', ['MetricEventList', 'MetricsEventsOptions']]
  ];

  it('every metrics hook imports its types from feedbackkit-js and declares none', () => {
    // Same shape as the `VoteResponse` assertion above: RN's parity story is that it
    // imports the vocabulary rather than owning a twin.
    for (const [file, names] of METRICS_HOOK_TYPES) {
      const hook = withoutComments(readFileSync(join(hooksDir, file), 'utf8'));
      for (const name of [...names, 'FeedbackKitError']) {
        expect(hook).toMatch(
          new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*'feedbackkit-js'`)
        );
      }
    }
    // Non-vacuity: a table that lost its rows would satisfy the loop above silently.
    expect(METRICS_HOOK_TYPES).toHaveLength(4);
  });

  it('the metrics hooks cover all four operations the JS client exposes', () => {
    // The METRICS03 §22 parity claim, read off source rather than asserted in prose:
    // one hook per key-family operation, derived from the JS SDK's own MetricsApi.
    const api = withoutComments(
      readFileSync(
        join(srcRoot, '..', '..', 'SwiftlyFeedbackKit-JS', 'src', 'api', 'metrics.ts'),
        'utf8'
      )
    );
    const operations = [...api.matchAll(/^\s{2}async\s+(\w+)\s*\(/gm)].map((m) => m[1]);
    expect(operations.sort()).toEqual(['breakdown', 'events', 'summary', 'timeseries']);

    // Every operation is reached by exactly one hook, and no hook reaches two.
    const calls = new Map<string, string>();
    for (const [file] of METRICS_HOOK_TYPES) {
      const hook = withoutComments(readFileSync(join(hooksDir, file), 'utf8'));
      const reached = operations.filter((op) =>
        new RegExp(`client\\.metrics\\.${op}\\b`).test(hook)
      );
      expect(reached).toHaveLength(1);
      calls.set(reached[0], file);
    }
    expect([...calls.keys()].sort()).toEqual(operations.sort());
  });
});
