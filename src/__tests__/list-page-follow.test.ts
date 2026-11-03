import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * RESILIENCE01 §9.1, React Native half. RN has no page-follow loop: its hooks call
 * `client.feedback.list` and `client.comments.list` on the JS SDK. Two checks hold that
 * up: no RN source follows pages itself, and the real JS package, when it is installed
 * the way the CI job installs it, stops a stale echo. Jest maps the bare module name to
 * `__mocks__`, so the real package is loaded by path.
 */

const srcRoot = join(__dirname, '..');
const installedSdk = join(__dirname, '..', '..', 'node_modules', 'feedbackkit-js');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return entry === '__tests__' ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe('page follow', () => {
  it('lives only in the JS SDK', () => {
    const following = sourceFiles(srcRoot).filter((path) =>
      /\b(total_pages|totalPages)\b.*\bnext\b|\bcollectList\b|\bpaged\b/.test(readFileSync(path, 'utf8'))
    );
    expect(following).toEqual([]);

    const read = (name: string) => readFileSync(join(srcRoot, 'hooks', name), 'utf8');
    expect(read('useFeedbackList.ts')).toContain('client.feedback.list(');
    expect(read('useComments.ts')).toContain('client.comments.list(');
  });

  const whenInstalled = existsSync(join(installedSdk, 'package.json')) ? it : it.skip;

  whenInstalled('stops a stale echo through the installed JS SDK', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires -- the real package, by path
    const { FeedbackKit } = require(installedSdk);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const originalFetch = global.fetch;
    let calls = 0;
    global.fetch = (async () => {
      calls += 1;
      if (calls > 300) {
        throw new Error('still following after 300 requests');
      }
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          items: [{ id: 'row-1', title: 'one', content: 'one', status: 'pending', vote_count: 1 }],
          meta: { page: 1, per_page: 1, total_pages: 3 },
        }),
      };
    }) as unknown as typeof fetch;

    try {
      const client = new FeedbackKit({ apiKey: 'sf_test_stub_key_not_a_credential', userId: 'reader' });

      const feedback = await client.feedback.list();
      expect(calls).toBe(2);
      expect(feedback).toHaveLength(1);
      expect(warn).toHaveBeenCalledTimes(1);

      calls = 0;
      const comments = await client.comments.list('11111111-1111-4111-8111-111111111111');
      expect(calls).toBe(2);
      expect(comments).toHaveLength(1);
      expect(warn).toHaveBeenCalledTimes(2);
    } finally {
      global.fetch = originalFetch;
      warn.mockRestore();
    }
  });
});
