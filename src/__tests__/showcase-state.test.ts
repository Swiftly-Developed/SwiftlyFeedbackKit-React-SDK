import { Feedback, FeedbackCategory, FeedbackStatus } from 'feedbackkit-js';
import {
  applyUserFilter,
  filterSummaryNames,
  filterSummaryText,
  isFiltered,
  resolveVotePresentation,
  voteCountText
} from '../components/showcase/feedbackListState';
import { contrastRatio, ensureContrast, mix, onColor, parseColor } from '../styles/color';
import { resolveShowcaseMetrics, resolveShowcasePalette } from '../styles/showcasePalette';
import { darkTheme, defaultTheme, mergeTheme } from '../styles/theme';
import { resolveBaseTheme } from '../provider';
import { clearOverrideStrings, formatString, setLocale, setOverrideStrings } from '../i18n';

function item(id: string, status: FeedbackStatus, category: FeedbackCategory): Feedback {
  return {
    id,
    title: id,
    description: '',
    status,
    category,
    userId: 'u',
    voteCount: 0,
    hasVoted: false,
    commentCount: 0,
    createdAt: '',
    updatedAt: ''
  };
}

afterEach(() => {
  setLocale('en');
  clearOverrideStrings();
});

describe('formatString', () => {
  it('fills bare and positional arguments, so a translation can reorder them', () => {
    expect(formatString('Filtered by %@', 'Bugs')).toBe('Filtered by Bugs');
    expect(formatString('%1$@ · %2$@', 'A', 'B')).toBe('A · B');
    expect(formatString('%2$@ ← %1$@', 'A', 'B')).toBe('B ← A');
    expect(formatString('%d votes', 3)).toBe('3 votes');
  });
});

describe('session filter', () => {
  const items = [
    item('a', FeedbackStatus.Pending, FeedbackCategory.Improvement),
    item('b', FeedbackStatus.InProgress, FeedbackCategory.Improvement),
    item('c', FeedbackStatus.InProgress, FeedbackCategory.BugReport)
  ];

  it('returns everything when nothing is filtered', () => {
    expect(isFiltered({})).toBe(false);
    expect(applyUserFilter(items, {}).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('combines status and category with AND', () => {
    expect(applyUserFilter(items, { category: FeedbackCategory.Improvement }).map((i) => i.id)).toEqual(['a', 'b']);
    expect(applyUserFilter(items, { status: FeedbackStatus.InProgress }).map((i) => i.id)).toEqual(['b', 'c']);
    expect(
      applyUserFilter(items, { status: FeedbackStatus.InProgress, category: FeedbackCategory.Improvement }).map(
        (i) => i.id
      )
    ).toEqual(['b']);
    expect(applyUserFilter(items, { status: FeedbackStatus.Completed })).toEqual([]);
  });
});

describe('filter summary', () => {
  it('is absent when nothing is filtered', () => {
    expect(filterSummaryNames({})).toBeNull();
    expect(filterSummaryText({})).toBeNull();
  });

  it('uses the plural category name, category first, joined by the catalog pattern', () => {
    expect(filterSummaryText({ category: FeedbackCategory.BugReport })).toBe('Filtered by Bug Reports');
    expect(filterSummaryText({ status: FeedbackStatus.InProgress })).toBe('Filtered by In Progress');
    expect(
      filterSummaryText({ status: FeedbackStatus.InProgress, category: FeedbackCategory.BugReport })
    ).toBe('Filtered by Bug Reports · In Progress');
  });

  it('lets a translation reorder the join', () => {
    setOverrideStrings({ 'list.filter.join': '%2$@ / %1$@' });
    expect(
      filterSummaryNames({ status: FeedbackStatus.Approved, category: FeedbackCategory.Improvement })
    ).toBe('Approved / Improvements');
  });
});

describe('vote count text', () => {
  it('picks the singular for one and the plural otherwise', () => {
    expect(voteCountText(1)).toBe('1 vote');
    expect(voteCountText(0)).toBe('0 votes');
    expect(voteCountText(186)).toBe('186 votes');
  });
});

describe('vote presentation resolver', () => {
  const base = { hasVoted: false, showVoteCount: true, allowUndoVote: true };

  it.each([
    ['hidden', { ...base, status: FeedbackStatus.Pending, showVoteCount: false }, false, null],
    ['skeleton', { ...base, status: FeedbackStatus.Pending, isSkeleton: true }, false, null],
    ['closed', { ...base, status: FeedbackStatus.Completed }, false, 'a11y.vote.closed'],
    ['closed', { ...base, status: FeedbackStatus.Rejected, hasVoted: true }, false, 'a11y.vote.closed'],
    ['votable', { ...base, status: FeedbackStatus.Approved }, true, 'a11y.vote.notVoted'],
    ['voted', { ...base, status: FeedbackStatus.TestFlight, hasVoted: true }, true, 'a11y.vote.voted'],
    [
      'votedLocked',
      { ...base, status: FeedbackStatus.InProgress, hasVoted: true, allowUndoVote: false },
      true,
      'a11y.vote.voted'
    ]
  ] as const)('resolves the %s cell', (kind, input, isButton, valueKey) => {
    const presentation = resolveVotePresentation(input);
    expect(presentation.kind).toBe(kind);
    expect(presentation.isButton).toBe(isButton);
    expect(presentation.valueKey).toBe(valueKey);
  });

  it('a locked vote is a button that does nothing and says why', () => {
    const locked = resolveVotePresentation({
      status: FeedbackStatus.Pending,
      hasVoted: true,
      showVoteCount: true,
      allowUndoVote: false
    });
    expect(locked.isActionable).toBe(false);
    expect(locked.isFilled).toBe(true);
    expect(locked.hintKey).toBe('a11y.vote.lockedHint');
  });

  it('an unknown status is closed, never votable', () => {
    expect(
      resolveVotePresentation({ ...base, status: 'scheduled' as FeedbackStatus }).kind
    ).toBe('closed');
  });
});

describe('colour helpers', () => {
  it('parses hex and rgb forms', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#007AFF')).toEqual({ r: 0, g: 122, b: 255, a: 1 });
    expect(parseColor('rgba(0, 0, 0, 0.5)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(parseColor('papayawhip')).toBeNull();
  });

  it('mixes toward the bottom colour and leaves unparseable input alone', () => {
    expect(mix('#000000', '#FFFFFF', 0.5).toUpperCase()).toBe('#808080');
    expect(mix('systemBlue', '#FFFFFF', 0.5)).toBe('systemBlue');
  });

  it('raises a low-contrast foreground to AA and leaves a passing one untouched', () => {
    const lifted = ensureContrast('#8E8E93', '#FFFFFF');
    expect(contrastRatio(lifted, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(ensureContrast('#000000', '#FFFFFF')).toBe('#000000');
  });

  it('keeps white on the default tint and switches to black on a pale one', () => {
    expect(onColor('#007AFF')).toBe('#FFFFFF');
    expect(onColor('#FFE066')).toBe('#000000');
  });
});

describe('Showcase palette', () => {
  it('meets AA for body text and eyebrows in light and dark', () => {
    for (const [theme, scheme] of [
      [defaultTheme, 'light'],
      [darkTheme, 'dark']
    ] as const) {
      const palette = resolveShowcasePalette(theme, scheme);
      expect(contrastRatio(palette.body, palette.card)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.onTonal, palette.tonal)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(palette.primaryOnBackground, palette.background)).toBeGreaterThanOrEqual(4.5);
      for (const status of Object.values(FeedbackStatus)) {
        expect(contrastRatio(palette.statusText(status), palette.card)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps the host tint for glyphs and fills', () => {
    const palette = resolveShowcasePalette(mergeTheme(defaultTheme, { primaryColor: '#6750A4' }), 'light');
    expect(palette.primary).toBe('#6750A4');
    expect(palette.statusGlyph(FeedbackStatus.InProgress)).toBe(defaultTheme.statusColors.inProgress);
  });

  it('uses Material targets on Android and HIG targets on iOS', () => {
    expect(resolveShowcaseMetrics('android')).toMatchObject({ minTarget: 48, cardRadius: 12, cardElevation: 1 });
    expect(resolveShowcaseMetrics('ios')).toMatchObject({ minTarget: 44, cardRadius: 20, cardElevation: 0 });
    for (const os of ['android', 'ios']) {
      const metrics = resolveShowcaseMetrics(os);
      expect(metrics.capsuleHeight + 2 * ((metrics.minTarget - metrics.capsuleHeight) / 2)).toBe(metrics.minTarget);
    }
  });
});

describe('provider base theme', () => {
  it('follows the system scheme by default', () => {
    expect(resolveBaseTheme('system', 'dark').scheme).toBe('dark');
    expect(resolveBaseTheme('system', 'dark').base).toBe(darkTheme);
    expect(resolveBaseTheme('system', 'light').base).toBe(defaultTheme);
  });

  it('pins the scheme when the host asks', () => {
    expect(resolveBaseTheme('light', 'dark').base).toBe(defaultTheme);
    expect(resolveBaseTheme('dark', 'light').base).toBe(darkTheme);
  });

  it('leaves a host that set its own surfaces on the light base under system', () => {
    expect(resolveBaseTheme('system', 'dark', { cardBackgroundColor: '#FAFAFA' }).scheme).toBe('light');
    expect(resolveBaseTheme('system', 'dark', { primaryColor: '#6750A4' }).scheme).toBe('dark');
  });
});
