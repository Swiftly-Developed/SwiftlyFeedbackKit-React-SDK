import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { FeedbackStatus } from 'feedbackkit-js';
import { defaultTheme, getStatusColor } from '../styles/theme';

/**
 * `QA-UNIT05-FEEDBACK`, React Native half — `-04`, `-06`, `-09`, `-11`.
 *
 * React Native declares **no** `FeedbackStatus`, no `FeedbackCategory` and no `Feedback` of
 * its own; it imports the JS SDK's. That is why the JS lane's `-04` and `-12` cases cover two
 * SDKs, and the parity group below is the guard that keeps it true: the moment RN declares a
 * local status enum, the JS cases stop saying anything about React Native and nothing else in
 * the repo would notice.
 *
 * It carries the sixth entry in the can-vote census (finding **F1**). As of 2026-10-11 the
 * rule is `VOTABLE_STATUSES` in `VoteButton.tsx`: an inclusion list of `pending`, `approved`,
 * `in_progress`, and `testflight`. An unknown token is not votable. The list is asserted as
 * source text, and a second copy or a return to negating `completed` / `rejected` fails here.
 *
 * It also carries a `status → tint` declaration the spec's nine-site census does not name,
 * because that census counted `.swift` files only: `styles/theme.ts` maps all six statuses to
 * hex colours and resolves them through `getStatusColor`. Same six semantic colours, a tenth
 * copy, and until now asserted by nothing.
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

/** Strip line and block comments, so a scan cannot find this file's own prose or a
 *  component's explanatory comment and report it as product code. */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('QA-UNIT05 -11 · RN feedback type parity', () => {
  it('declares no feedback status, category or item type of its own under src/', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(srcRoot)) {
      const source = withoutComments(readFileSync(file, 'utf8'));
      for (const name of ['FeedbackStatus', 'FeedbackCategory', 'Feedback']) {
        if (
          new RegExp(`(^|\\n)\\s*(export\\s+)?(enum|interface|class)\\s+${name}\\b`).test(source)
        ) {
          offenders.push(`${file} declares ${name}`);
        }
        if (new RegExp(`(^|\\n)\\s*(export\\s+)?type\\s+${name}\\s*[=<]`).test(source)) {
          offenders.push(`${file} declares type ${name}`);
        }
      }
    }

    expect(offenders).toEqual([]);
    // Non-vacuity: the sweep really walked the package.
    expect(sourceFiles(srcRoot).length).toBeGreaterThan(5);
  });

  it('imports the feedback types from feedbackkit-js at every site that names them', () => {
    const importers: string[] = [];

    for (const file of sourceFiles(srcRoot)) {
      const source = withoutComments(readFileSync(file, 'utf8'));
      if (!/\bFeedbackStatus\b/.test(source)) continue;
      importers.push(file);
      expect(source).toMatch(/from\s+'feedbackkit-js'/);
    }

    // The paired positive: files really do name the type, so the loop above is not vacuously
    // satisfied by an empty list.
    expect(importers.length).toBeGreaterThan(0);
  });

  it('the jest mock of feedbackkit-js matches the enum surface the SDK ships', () => {
    // ⚠️ FLIPPED 2026-08-15 by QA-UNIT10-SDK-PARITY. This case previously PINNED a measured
    // drift: the mock declared a fifth `FeedbackCategory` member, `Question`, that the JS
    // SDK has never had (plus a wrong `Comment` shape, a `VoteResult` type, a required
    // `projectId`, and no `setUserId` — which is why the provider crashed against it).
    // The mock was rewritten to mirror the shipped surface, and this case is now the GATE
    // that keeps it mirrored: every RN test resolves `feedbackkit-js` to
    // `__mocks__/feedbackkit-js.ts` (the package is a peer dependency and is not
    // installed), so a drifted mock silently substitutes a vocabulary the server would
    // reject. That is why this assertion reads the JS SDK's *source* rather than importing
    // it — importing would resolve right back to the mock under test.
    const jsTypes = readFileSync(
      join(srcRoot, '..', '..', 'SwiftlyFeedbackKit-JS', 'src', 'models', 'types.ts'),
      'utf8'
    );
    const mock = readFileSync(join(srcRoot, '..', '__mocks__', 'feedbackkit-js.ts'), 'utf8');

    const enumMembers = (source: string, enumName: string): string[] => {
      const body = (
        withoutComments(source).split(`export enum ${enumName}`)[1] ?? ''
      ).split('}')[0];
      return [...body.matchAll(/([A-Za-z_][A-Za-z0-9_]*)\s*=\s*'([^']*)'/g)].map(
        (m) => `${m[1]}=${m[2]}`
      );
    };

    // Set equality, member names AND wire values, both enums. A presence check cannot see
    // an extra member — `Question` was exactly that.
    for (const enumName of ['FeedbackStatus', 'FeedbackCategory']) {
      const shipped = enumMembers(jsTypes, enumName);
      const mocked = enumMembers(mock, enumName);
      expect(mocked.sort()).toEqual(shipped.sort());
      // Non-vacuity: the extractor really found members on both sides.
      expect(shipped.length).toBeGreaterThan(0);
    }

    expect(enumMembers(mock, 'FeedbackCategory')).not.toContain('Question=question');

    // The runtime import (which resolves to the mock) agrees with the six-member canon.
    for (const member of [
      'Pending', 'Approved', 'InProgress', 'TestFlight', 'Completed', 'Rejected'
    ]) {
      expect(FeedbackStatus[member as keyof typeof FeedbackStatus]).toBeDefined();
    }
    expect(Object.keys(FeedbackStatus)).toHaveLength(6);
  });
});

describe('QA-UNIT10 -13 · RN mock error-class surface (METRICS03 04)', () => {
  // ⚠️ ADDED 2026-08-25. The enum gate above shipped while a DIFFERENT drift in the same
  // file went unnoticed for months, because that gate reads enums and nothing else:
  // `ValidationError` defaulted to 'Validation failed' and `NetworkError` to 'Network
  // request failed' where the real classes say 'Validation error' and 'Network error',
  // and `RateLimitError` (phase 02) was absent outright. Both were reconciled with this
  // case; the case is what keeps them reconciled. Same reasoning as the enum gate: read
  // the JS SDK's SOURCE, because importing it resolves back to the mock under test.

  const errorsSource = readFileSync(
    join(srcRoot, '..', '..', 'SwiftlyFeedbackKit-JS', 'src', 'models', 'errors.ts'),
    'utf8'
  );
  const mockSource = readFileSync(
    join(srcRoot, '..', '__mocks__', 'feedbackkit-js.ts'),
    'utf8'
  );

  /** Exported ERROR class names, in file order: the base (which extends `Error`) and
   *  every subclass of it. Derived from the `extends` clause rather than by excluding
   *  known non-errors, so the mock's `FeedbackKit` client class drops out on its own and
   *  a tenth error class does not need this helper edited. */
  const classNames = (source: string): string[] =>
    [
      ...withoutComments(source).matchAll(
        /export\s+class\s+([A-Za-z0-9_]+)\s+extends\s+(Error|FeedbackKitError)\b/g
      )
    ].map((m) => m[1]);

  /** class name → the constructor's default `message`, or undefined when it has none
   *  (the base class takes a required message). */
  const defaultMessages = (source: string): Record<string, string | undefined> => {
    const stripped = withoutComments(source);
    const out: Record<string, string | undefined> = {};
    const segments = stripped.split(/export\s+class\s+/).slice(1);
    for (const segment of segments) {
      const name = /^([A-Za-z0-9_]+)/.exec(segment);
      if (!name) continue;
      const body = segment.split('\n}')[0];
      const message = /message\s*=\s*'((?:[^'\\]|\\.)*)'/.exec(body);
      out[name[1]] = message ? message[1] : undefined;
    }
    return out;
  };

  it('the mock declares exactly the error classes the JS SDK exports', () => {
    const shipped = classNames(errorsSource);
    const mocked = classNames(mockSource);

    // Set equality. A presence check for `RateLimitError` would not see the removal of
    // `ConflictError`, and the count is derived from the JS file rather than pinned —
    // phase 02 already moved it from 8 to 9.
    expect(mocked.sort()).toEqual([...shipped].sort());
    // Non-vacuity: the extractor really found classes on both sides.
    expect(shipped.length).toBeGreaterThan(5);
    expect(shipped).toContain('RateLimitError');
  });

  it('every error class carries the same default message in the mock as in the SDK', () => {
    // This is where the two shipped drifts lived: the names matched and the messages did
    // not, so a name-only gate would have stayed green through both.
    const shipped = defaultMessages(errorsSource);
    const mocked = defaultMessages(mockSource);

    const divergent = classNames(errorsSource)
      .filter((name) => shipped[name] !== mocked[name])
      .map((name) => `${name}: SDK ${String(shipped[name])} / mock ${String(mocked[name])}`);

    expect(divergent).toEqual([]);
    // Non-vacuity: real messages were extracted, not a map of undefineds.
    expect(shipped.ValidationError).toBe('Validation error');
    expect(shipped.NetworkError).toBe('Network error');
    expect(
      Object.values(shipped).filter((message) => message !== undefined).length
    ).toBeGreaterThan(5);
  });
});

describe('QA-UNIT05 -06 · RN status tint map', () => {
  /** The canon in RN's vocabulary: the six semantic colours of root CLAUDE.md's
   *  Feedback Statuses table, as the hex literals `defaultTheme` declares. */
  const expectedTints: ReadonlyArray<readonly [FeedbackStatus, string]> = [
    [FeedbackStatus.Pending, '#8E8E93'],
    [FeedbackStatus.Approved, '#007AFF'],
    [FeedbackStatus.InProgress, '#FF9500'],
    [FeedbackStatus.TestFlight, '#5AC8FA'],
    [FeedbackStatus.Completed, '#34C759'],
    [FeedbackStatus.Rejected, '#FF3B30']
  ];

  it('getStatusColor returns the declared tint for each of the six statuses', () => {
    for (const [status, hex] of expectedTints) {
      expect(getStatusColor(status, defaultTheme)).toBe(hex);
    }
    expect(expectedTints).toHaveLength(6);
  });

  it('the six tints are pairwise distinct', () => {
    // A map that returned one colour six times would satisfy every "returns a colour" check
    // ever written and would render six statuses as one badge.
    const tints = expectedTints.map(([status]) => getStatusColor(status, defaultTheme));
    expect(new Set(tints).size).toBe(6);
  });

  it('getStatusColor resolves through the overridable theme, not a hardcoded literal', () => {
    // `defaultTheme` is public API a host app overrides. A resolver that ignored the theme
    // would pass both cases above and silently discard every override — a failure only ever
    // visible on someone else's screen.
    const retinted = {
      ...defaultTheme,
      statusColors: { ...defaultTheme.statusColors, testflight: '#123456' }
    };
    expect(getStatusColor(FeedbackStatus.TestFlight, retinted)).toBe('#123456');
    // Paired: the untouched entries still resolve to their defaults.
    expect(getStatusColor(FeedbackStatus.Completed, retinted)).toBe('#34C759');
  });

  it('the tint map is total over the enum — no status falls through', () => {
    // Computed over the enum's own members rather than the table, so a seventh status added
    // to the JS SDK reddens here rather than resolving to `undefined` at a render site.
    for (const value of Object.values(FeedbackStatus)) {
      const tint = getStatusColor(value as FeedbackStatus, defaultTheme);
      expect(tint).toBeDefined();
      expect(tint).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('QA-UNIT05 -09/-11 · RN can-vote census (finding F1)', () => {
  const voteButton = withoutComments(
    readFileSync(join(srcRoot, 'components', 'VoteButton.tsx'), 'utf8')
  );

  it('the rule is an inclusion list of the four votable statuses', () => {
    const predicate = voteButton.split('const VOTABLE_STATUSES')[1]?.split('export function VoteButton')[0];
    expect(predicate).toBeDefined();

    const named = ['Pending', 'Approved', 'InProgress', 'TestFlight', 'Completed', 'Rejected']
      .filter((member) => predicate!.includes(`FeedbackStatus.${member}`));

    expect(named.sort()).toEqual(['Approved', 'InProgress', 'Pending', 'TestFlight']);
    expect(predicate).not.toContain('!==');
  });

  it('exactly one RN site declares the votable set, and none negate the terminal pair', () => {
    const declarations: string[] = [];
    const negations: string[] = [];
    for (const file of sourceFiles(srcRoot)) {
      const source = withoutComments(readFileSync(file, 'utf8'));
      if (source.includes('VOTABLE_STATUSES')) {
        declarations.push(file.replace(srcRoot, 'src'));
      }
      if (/!==\s*FeedbackStatus\.Completed/.test(source)) {
        negations.push(file.replace(srcRoot, 'src'));
      }
    }

    expect(declarations).toHaveLength(1);
    expect(declarations[0]).toContain('VoteButton.tsx');
    expect(negations).toEqual([]);
  });
});
