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
  /** The base error class, its seven subclasses, the three response/value types, the
   *  config type, and the client class — everything RN must import, never redeclare. */
  const GUARDED_NAMES = [
    'FeedbackKitError',
    'AuthenticationError',
    'PaymentRequiredError',
    'ForbiddenError',
    'NotFoundError',
    'ConflictError',
    'ValidationError',
    'NetworkError',
    'VoteResponse',
    'SDKUser',
    'TrackedEvent',
    'FeedbackKitConfig',
    'FeedbackKit'
  ];

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
