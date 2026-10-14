import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Appearance, FlatList, Platform, Pressable, StyleSheet } from 'react-native';
import {
  Feedback,
  FeedbackCategory,
  FeedbackKit,
  FeedbackSort,
  FeedbackStatus,
  __httpControl,
  __resetHttpControl
} from 'feedbackkit-js';
import { FeedbackProvider, FeedbackProviderProps, useFeedbackKitContext } from '../provider';
import { FeedbackList } from '../components/FeedbackList';
import { FeedbackListProps } from '../components/feedbackListProps';
import { clearOverrideStrings, setLocale, t } from '../i18n';
import { darkTheme, defaultTheme } from '../styles/theme';

function item(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: 'fb-1',
    title: 'Offline mode',
    description: 'Let me read and draft feedback without a connection, then sync later.',
    status: FeedbackStatus.InProgress,
    category: FeedbackCategory.FeatureRequest,
    userId: 'user-1',
    voteCount: 3,
    hasVoted: false,
    commentCount: 24,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

const ITEMS: Feedback[] = [
  item(),
  item({
    id: 'fb-2',
    title: 'Faster sync',
    description: 'Sync should finish before the app is backgrounded.',
    status: FeedbackStatus.Approved,
    category: FeedbackCategory.Improvement,
    commentCount: 0,
    voteCount: 12
  }),
  item({
    id: 'fb-3',
    title: 'Crash on launch',
    description: 'The app crashes on an iPad in split view.',
    status: FeedbackStatus.Completed,
    category: FeedbackCategory.BugReport,
    voteCount: 1,
    commentCount: 1
  })
];

let client: FeedbackKit | null = null;

function ClientProbe() {
  client = useFeedbackKitContext().client;
  return null;
}

function renderList(
  props: Partial<FeedbackListProps> = {},
  providerProps: Partial<Omit<FeedbackProviderProps, 'children'>> = {}
) {
  return render(
    <FeedbackProvider apiKey="sf_test" userId="user-1" {...providerProps}>
      <ClientProbe />
      <FeedbackList onFeedbackPress={() => undefined} {...props} />
    </FeedbackProvider>
  );
}

/** The composite Pressable behind a host element, where `android_ripple` is still visible. */
function pressableFor(testID: string) {
  return screen.UNSAFE_getAllByType(Pressable).find((node) => node.props.testID === testID);
}

function flatStyle(node: { props: { style?: unknown } }) {
  return StyleSheet.flatten(node.props.style as never) ?? {};
}

beforeEach(() => {
  __httpControl.feedbackList = async () => ITEMS;
});

afterEach(() => {
  setLocale('en');
  clearOverrideStrings();
  __resetHttpControl();
  client = null;
  jest.restoreAllMocks();
});

describe('Showcase card', () => {
  it('is the default style and shows eyebrow, title, full description and facts', async () => {
    renderList();
    await screen.findByText('Offline mode');

    expect(screen.getByText('In Progress')).toBeTruthy();
    const description = screen.getByText(ITEMS[0].description);
    expect(description.props.numberOfLines).toBeUndefined();
    expect(screen.getByText('Feature Request')).toBeTruthy();
    expect(screen.getByText('24')).toBeTruthy();
    expect(screen.getByTestId('fbk-status-glyph-in_progress', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(t('sort.label'))).toBeNull();
  });

  it('reads as one element in status, title, description, category, comments, votes order', async () => {
    renderList();
    await screen.findByText('Offline mode');

    const card = screen.getByTestId('fbk-feedback-card-fb-1');
    expect(card.props.accessibilityRole).toBe('button');
    expect(card.props.accessibilityLabel).toBe(
      `In Progress, Offline mode, ${ITEMS[0].description}, Feature Request, 24 comments, 3 votes, Not voted`
    );
    expect(card.props.accessibilityHint).toBe('View details');
    expect(card.props.accessibilityActions).toEqual([
      { name: 'activate' },
      { name: 'vote', label: 'Vote' }
    ]);
  });

  it('hides the comment fact at zero and the improvement fact uses the tune glyph', async () => {
    renderList();
    await screen.findByText('Faster sync');
    const card = screen.getByTestId('fbk-feedback-card-fb-2');
    const hidden = { includeHiddenElements: true };
    expect(within(card).queryByTestId('fbk-icon-comment', hidden)).toBeNull();
    expect(within(card).getByTestId('fbk-icon-tune', hidden)).toBeTruthy();
  });

  it('drops hidden parts from the card and its label', async () => {
    renderList({ showStatusBadge: false, showCategoryBadge: false, showCommentCount: false, showVoteCount: false });
    await screen.findByText('Offline mode');
    expect(screen.queryByText('In Progress')).toBeNull();
    expect(screen.queryByTestId('fbk-vote-capsule-fb-1')).toBeNull();
    expect(screen.queryByTestId('fbk-card-footer-fb-1')).toBeNull();
    expect(screen.getByTestId('fbk-feedback-card-fb-1').props.accessibilityLabel).toBe(
      `Offline mode, ${ITEMS[0].description}`
    );
  });

  it('opens details on press', async () => {
    const onFeedbackPress = jest.fn();
    renderList({ onFeedbackPress });
    await screen.findByText('Offline mode');
    fireEvent.press(screen.getByTestId('fbk-feedback-card-fb-1'));
    expect(onFeedbackPress).toHaveBeenCalledWith(expect.objectContaining({ id: 'fb-1' }));
  });
});

describe('Showcase vote capsule', () => {
  it('names the count and carries the vote state in the value', async () => {
    renderList();
    await screen.findByText('Offline mode');
    const capsule = screen.getByTestId('fbk-vote-capsule-fb-1');
    expect(capsule.props.accessibilityRole).toBe('button');
    expect(capsule.props.accessibilityLabel).toBe('3 votes');
    expect(capsule).toHaveAccessibilityValue({ text: 'Not voted' });
    expect(capsule.props.accessibilityHint).toBe('Adds your vote');
  });

  it('votes on press and turns filled', async () => {
    renderList();
    await screen.findByText('Offline mode');
    await act(async () => {
      fireEvent.press(screen.getByTestId('fbk-vote-capsule-fb-1'));
    });
    expect(client!.votes.vote).toHaveBeenCalledWith('fb-1', expect.objectContaining({ userId: 'user-1' }));
    const capsule = screen.getByTestId('fbk-vote-capsule-fb-1');
    expect(capsule.props.accessibilityLabel).toBe('1 vote');
    expect(capsule).toHaveAccessibilityValue({ text: 'Voted' });
    expect(capsule.props.accessibilityHint).toBe('Removes your vote');
    expect(flatStyle(capsule).backgroundColor).toBe(defaultTheme.primaryColor);
  });

  it('votes from the card accessibility action', async () => {
    renderList();
    await screen.findByText('Offline mode');
    await act(async () => {
      fireEvent(screen.getByTestId('fbk-feedback-card-fb-1'), 'accessibilityAction', {
        nativeEvent: { actionName: 'vote' }
      });
    });
    expect(client!.votes.vote).toHaveBeenCalledTimes(1);
  });

  it('shows a closed request as plain text with a "Voting is closed" value', async () => {
    renderList();
    await screen.findByText('Crash on launch');
    expect(screen.queryByTestId('fbk-vote-capsule-fb-3')).toBeNull();
    const closed = screen.getByTestId('fbk-vote-closed-fb-3');
    expect(closed.props.accessibilityRole).toBe('text');
    expect(closed.props.accessibilityLabel).toBe('1 vote');
    expect(closed).toHaveAccessibilityValue({ text: 'Voting is closed' });
    expect(screen.getByTestId('fbk-feedback-card-fb-3').props.accessibilityActions).toEqual([{ name: 'activate' }]);
  });

  it('locks a cast vote when undo is not allowed', async () => {
    __httpControl.feedbackList = async () => [item({ hasVoted: true })];
    renderList({ allowUndoVote: false });
    await screen.findByText('Offline mode');
    const capsule = screen.getByTestId('fbk-vote-capsule-fb-1');
    expect(capsule).toBeDisabled();
    expect(capsule).toHaveAccessibilityValue({ text: 'Voted' });
    expect(capsule.props.accessibilityHint).toBe("You've voted. Votes can't be removed");
    fireEvent.press(capsule);
    expect(client!.votes.unvote).not.toHaveBeenCalled();
  });

  it('keeps a 44pt hit area on iOS', async () => {
    renderList();
    await screen.findByText('Offline mode');
    const capsule = screen.getByTestId('fbk-vote-capsule-fb-1');
    const { minHeight } = flatStyle(capsule) as { minHeight: number };
    expect(minHeight + capsule.props.hitSlop.top + capsule.props.hitSlop.bottom).toBeGreaterThanOrEqual(44);
    expect(pressableFor('fbk-vote-capsule-fb-1')?.props.android_ripple).toBeUndefined();
  });
});

describe('Showcase on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it('uses a bounded ripple, a 48dp hit area, and an elevated card', async () => {
    renderList();
    await screen.findByText('Offline mode');
    const capsule = screen.getByTestId('fbk-vote-capsule-fb-1');
    expect(pressableFor('fbk-vote-capsule-fb-1')?.props.android_ripple).toEqual(
      expect.objectContaining({ foreground: true })
    );
    const { minHeight } = flatStyle(capsule) as { minHeight: number };
    expect(minHeight + capsule.props.hitSlop.top + capsule.props.hitSlop.bottom).toBeGreaterThanOrEqual(48);

    const card = screen.getByTestId('fbk-feedback-card-fb-1');
    expect(pressableFor('fbk-feedback-card-fb-1')?.props.android_ripple).toBeDefined();
    expect(flatStyle(card)).toMatchObject({ elevation: 1, borderRadius: 12 });
  });
});

describe('Sort & Filter', () => {
  async function openSheet() {
    await screen.findByText('Offline mode');
    fireEvent.press(screen.getByTestId('fbk-sort-filter-menu'));
    await screen.findByTestId('fbk-sort-filter-done');
  }

  it('reports the sort as its value while nothing is filtered', async () => {
    renderList();
    await screen.findByText('Offline mode');
    const button = screen.getByTestId('fbk-sort-filter-menu');
    expect(button.props.accessibilityLabel).toBe('Sort & Filter');
    expect(button).toHaveAccessibilityValue({ text: 'Most Votes' });
    expect(screen.getByTestId('fbk-icon-filter', { includeHiddenElements: true })).toBeTruthy();
  });

  it('filters by category and status client-side and summarises the filter', async () => {
    renderList();
    await openSheet();
    const listCalls = (client!.feedback.list as jest.Mock).mock.calls.length;

    fireEvent.press(screen.getByTestId('fbk-filter-category-improvement'));
    expect(screen.getByTestId('fbk-filter-category-improvement')).toBeChecked();
    fireEvent.press(screen.getByTestId('fbk-sort-filter-done'));

    expect(screen.queryByText('Offline mode')).toBeNull();
    expect(screen.getByText('Faster sync')).toBeTruthy();
    const summary = screen.getByTestId('fbk-filter-summary');
    expect(within(summary).getByLabelText('Filtered by Improvements')).toBeTruthy();
    expect(screen.getByTestId('fbk-sort-filter-menu')).toHaveAccessibilityValue({
      text: 'Filtered by Improvements'
    });
    expect(within(screen.getByTestId('fbk-sort-filter-menu')).getByTestId('fbk-icon-filterActive', { includeHiddenElements: true })).toBeTruthy();

    fireEvent.press(screen.getByTestId('fbk-sort-filter-menu'));
    fireEvent.press(screen.getByTestId('fbk-filter-status-approved'));
    expect(within(screen.getByTestId('fbk-filter-summary')).getByLabelText('Filtered by Improvements · Approved')).toBeTruthy();

    expect((client!.feedback.list as jest.Mock).mock.calls.length).toBe(listCalls);
  });

  it('Clear removes both filters and keeps the sort', async () => {
    renderList();
    await openSheet();
    fireEvent.press(screen.getByTestId('fbk-sort-option-newest'));
    fireEvent.press(screen.getByTestId('fbk-filter-category-bug_report'));
    fireEvent.press(screen.getByTestId('fbk-filter-status-completed'));
    fireEvent.press(screen.getByTestId('fbk-sort-filter-done'));
    await screen.findByText('Crash on launch');
    expect(screen.queryByText('Faster sync')).toBeNull();

    fireEvent.press(screen.getByTestId('fbk-filter-clear'));
    expect(screen.queryByTestId('fbk-filter-summary')).toBeNull();
    expect(await screen.findByText('Faster sync')).toBeTruthy();
    expect(screen.getByTestId('fbk-sort-filter-menu')).toHaveAccessibilityValue({ text: 'Newest' });
  });

  it('the summary carries a "Clear filters" action', async () => {
    renderList();
    await openSheet();
    fireEvent.press(screen.getByTestId('fbk-filter-status-pending'));
    fireEvent.press(screen.getByTestId('fbk-sort-filter-done'));
    const sentence = within(screen.getByTestId('fbk-filter-summary')).getByLabelText('Filtered by Pending');
    expect(sentence.props.accessibilityActions).toEqual([{ name: 'clear', label: 'Clear filters' }]);
    fireEvent(sentence, 'accessibilityAction', { nativeEvent: { actionName: 'clear' } });
    expect(screen.queryByTestId('fbk-filter-summary')).toBeNull();
  });

  it('shows the filtered-empty state when nothing matches, with a Clear Filters button', async () => {
    renderList();
    await openSheet();
    fireEvent.press(screen.getByTestId('fbk-filter-status-pending'));
    fireEvent.press(screen.getByTestId('fbk-sort-filter-done'));

    expect(screen.getByText('No Matching Requests')).toBeTruthy();
    expect(screen.queryByText(t('feedback.list.empty'))).toBeNull();
    fireEvent.press(screen.getByTestId('fbk-filtered-empty-clear'));
    expect(await screen.findByText('Offline mode')).toBeTruthy();
  });

  it('sorts server-side from the sheet', async () => {
    renderList();
    await openSheet();
    await act(async () => {
      fireEvent.press(screen.getByTestId('fbk-sort-option-comments'));
    });
    await waitFor(() =>
      expect(client!.feedback.list).toHaveBeenLastCalledWith(expect.objectContaining({ sort: FeedbackSort.Comments }))
    );
    expect(screen.getByTestId('fbk-sort-option-comments')).toBeChecked();
  });

  it('hides a section the host fixed with a prop or turned off', async () => {
    renderList({ filterByStatus: FeedbackStatus.InProgress, showCategoryFilter: false });
    await openSheet();
    expect(screen.queryByTestId('fbk-filter-status-all')).toBeNull();
    expect(screen.queryByTestId('fbk-filter-category-all')).toBeNull();
    expect(screen.getByTestId('fbk-sort-option-votes')).toBeTruthy();
  });
});

describe('Showcase states', () => {
  it('shows an accessible skeleton while the first load is in flight', async () => {
    __httpControl.feedbackList = () => new Promise(() => undefined);
    renderList();
    const skeleton = await screen.findByTestId('fbk-feedback-skeleton');
    expect(skeleton.props.accessibilityRole).toBe('progressbar');
    expect(skeleton.props.accessibilityLabel).toBe('Loading feedback');
  });

  it('keeps the project-empty state for an empty project', async () => {
    __httpControl.feedbackList = async () => [];
    renderList({ showAddButton: true, onAddPress: () => undefined });
    expect(await screen.findByText(t('feedback.list.empty'))).toBeTruthy();
    expect(screen.queryByTestId('fbk-sort-filter-menu')).toBeNull();
    expect(screen.getByRole('button', { name: t('feedback.submit.title') })).toBeTruthy();
  });
});

describe('appearance and direction', () => {
  function containerBackground() {
    const list = screen.UNSAFE_getByType(FlatList);
    return StyleSheet.flatten(list.parent?.props.style).backgroundColor;
  }

  it('follows a dark system scheme', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    renderList();
    await screen.findByText('Offline mode');
    expect(containerBackground()).toBe(darkTheme.backgroundColor);
    expect(flatStyle(screen.getByTestId('fbk-feedback-card-fb-1')).backgroundColor).toBe(
      darkTheme.cardBackgroundColor
    );
  });

  it('stays light when the host pins colorScheme="light"', async () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    renderList({}, { colorScheme: 'light' });
    await screen.findByText('Offline mode');
    expect(containerBackground()).toBe(defaultTheme.backgroundColor);
  });

  it('lays out Arabic from the right', async () => {
    setLocale('ar');
    renderList({}, { locale: 'ar' });
    await screen.findByText('Offline mode');
    const list = screen.UNSAFE_getByType(FlatList);
    expect(StyleSheet.flatten(list.parent?.props.style).direction).toBe('rtl');
  });

  it('a provider listStyle of classic restores the pre-2.1.0 list', async () => {
    renderList({}, { listStyle: 'classic' });
    await screen.findByText('Offline mode');
    expect(screen.getByText(t('sort.label'))).toBeTruthy();
    expect(screen.queryByTestId('fbk-sort-filter-menu')).toBeNull();
  });

  it('a host renderIcon replaces the built-in glyphs', async () => {
    const renderIcon = jest.fn(() => null);
    renderList({}, { renderIcon });
    await screen.findByText('Offline mode');
    expect(renderIcon).toHaveBeenCalledWith('tune', expect.objectContaining({ size: expect.any(Number) }));
  });
});
