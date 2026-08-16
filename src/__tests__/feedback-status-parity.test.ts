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
 * It carries the sixth entry in the can-vote census (finding **F1**). RN's rule is neither a
 * predicate nor a shared constant — it is an inline expression **in a component body**
 * (`VoteButton.tsx`), so there is nothing for a runtime test to call. It is asserted where it
 * lives, as source text, and the assertion is that it names exactly the terminal pair
 * `{completed, rejected}` — the same set the Swift SDK, the Vapor SDK, Kotlin and Flutter each
 * compute independently.
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

  it('the rule is an inline negation in a component body, naming exactly the terminal pair', () => {
    // The whole expression IS the terminal set, because RN negates rather than including.
    // Add `TestFlight` to it, or drop `Rejected`, and this reddens naming React Native — and
    // nothing else in the workspace could see it, because there is no symbol to call.
    const predicate = voteButton.split('const canVote =')[1]?.split('const handlePress')[0];
    expect(predicate).toBeDefined();

    const named = ['Pending', 'Approved', 'InProgress', 'TestFlight', 'Completed', 'Rejected']
      .filter((member) => predicate!.includes(`FeedbackStatus.${member}`));

    expect(named.sort()).toEqual(['Completed', 'Rejected']);
    // A negation, not an inclusion list — recorded as it ships. AGENTS.md requires an
    // inclusion list; five of the six shipped declarations negate, and §20 owns the fix.
    expect(predicate).toContain('!==');
    expect(predicate).not.toContain('switch');
  });

  it('exactly one RN site reimplements the rule, and it is VoteButton', () => {
    // A second inline copy in another component would be a declaration of the rule that no
    // census names. The two `theme.ts` maps are excluded deliberately: they are keyed on the
    // *whole* enum, not on the terminal pair, so they are tint/label maps rather than copies
    // of the can-vote rule. Counting them here would make this assertion say nothing.
    const offenders: string[] = [];
    for (const file of sourceFiles(srcRoot)) {
      const source = withoutComments(readFileSync(file, 'utf8'));
      if (/status\s*!==\s*FeedbackStatus\.Completed/.test(source)) {
        offenders.push(file.replace(srcRoot, 'src'));
      }
    }

    expect(offenders).toHaveLength(1);
    expect(offenders[0]).toContain('VoteButton.tsx');
  });
});
