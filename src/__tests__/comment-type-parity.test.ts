import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * `QA-UNIT04-COMMENTS` `-11`, React Native half.
 *
 * React Native declares **no** comment value type of its own — it imports the JS SDK's.
 * That is why `-11` covers two SDKs with one decode case, and this file is the guard that
 * keeps it true: the moment RN declares a local `Comment`, the JS decode case stops saying
 * anything about React Native and nothing else in the repo would notice.
 *
 * These are source-text assertions on purpose. The runtime alternative — decoding the
 * corpus here — would prove the JS SDK's transform a second time (the redundancy the
 * balance principle forbids) and would in any case run against `__mocks__/feedbackkit-js`,
 * since the JS SDK is a peer dependency that is not installed in this package.
 */

const srcRoot = join(__dirname, '..');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      out.push(...sourceFiles(full));
      continue;
    }
    if (entry.endsWith('.ts') || entry.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** Every property `src/` reads off a comment value. Must be a subset of the JS SDK's
 *  `Comment` interface, which the corpus decode case in `feedbackkit-js` pins. */
const CONSUMED_COMMENT_FIELDS = ['id', 'content', 'userId', 'isAdmin', 'createdAt'];

describe('QA-UNIT04 -11 · RN comment type parity', () => {
  it('declares no comment value type of its own anywhere under src/', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(srcRoot)) {
      const source = readFileSync(file, 'utf8');
      // A local declaration of the shape, in any of the three forms TypeScript offers.
      if (/(^|\n)\s*(export\s+)?(interface|class)\s+Comment\b/.test(source)) {
        offenders.push(file);
      }
      if (/(^|\n)\s*(export\s+)?type\s+Comment\s*[=<]/.test(source)) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('imports the comment type from feedbackkit-js at every site that names it', () => {
    const importers: string[] = [];

    for (const file of sourceFiles(srcRoot)) {
      const source = readFileSync(file, 'utf8');
      const importsComment = /import\s*\{[^}]*\bComment\b[^}]*\}\s*from\s*'feedbackkit-js'/.test(
        source
      );
      if (importsComment) importers.push(file.replace(srcRoot + '/', ''));
    }

    // Paired positive: the negative above is satisfied by a package that never mentions
    // comments at all. These are the two files that actually consume the type today.
    expect(importers.sort()).toEqual(
      ['components/FeedbackDetailView.tsx', 'hooks/useComments.ts'].sort()
    );
  });

  it('declares feedbackkit-js as a peer dependency so the imported type resolves', () => {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8')
    );
    expect(pkg.peerDependencies['feedbackkit-js']).toBeDefined();
  });

  it('reads only fields the JS Comment interface declares', () => {
    const detailView = readFileSync(
      join(srcRoot, 'components', 'FeedbackDetailView.tsx'),
      'utf8'
    );

    // The lookbehind excludes a quote, which is what separates a property access on the
    // `comment` value from an i18n key that happens to start `comment.` — the component
    // contains `t('comment.author.team')`, and without the guard this scan reports
    // `author` as a field the component reads off a comment.
    const read = new Set<string>();
    for (const match of detailView.matchAll(/(?<!['"`\w.])comment\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
      read.add(match[1]);
    }

    // Positive: the component genuinely reads comment fields, so an empty set below would
    // be a broken regex rather than a clean bill of health.
    expect(read.size).toBeGreaterThan(0);
    expect(read.has('isAdmin')).toBe(true);

    for (const field of read) {
      expect(CONSUMED_COMMENT_FIELDS).toContain(field);
    }
  });

  it('the source scan reaches the files it claims to scan', () => {
    const files = sourceFiles(srcRoot).map((f) => f.replace(srcRoot + '/', ''));
    expect(files.length).toBeGreaterThan(15);
    expect(files).toContain('hooks/useComments.ts');
    expect(files).toContain('components/FeedbackDetailView.tsx');
    // The mock under __mocks__ does declare its own `Comment`, deliberately — a jest
    // moduleNameMapper stub for an uninstalled peer dependency has to. It is outside
    // src/ and outside the published `files` list, and the scan must not reach it.
    expect(files.some((f) => f.includes('__mocks__'))).toBe(false);
  });
});
