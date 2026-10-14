import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { Appearance, Dimensions, Platform, StyleSheet, Text } from 'react-native';
import { Feedback, FeedbackCategory, FeedbackStatus } from 'feedbackkit-js';
import { FeedbackProvider } from '../provider';
import { ShowcaseCard } from '../components/showcase/ShowcaseCard';
import { FilterSummaryRow } from '../components/showcase/FilterSummaryRow';

const card: Feedback = {
  id: 'fb-1',
  title: 'Offline mode with background sync for long trips',
  description: 'Let me read and draft feedback without a connection, then sync later.',
  status: FeedbackStatus.InProgress,
  category: FeedbackCategory.Improvement,
  userId: 'user-1',
  voteCount: 1860,
  hasVoted: true,
  commentCount: 24,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const originalWindow = Dimensions.get('window');

function setFontScale(fontScale: number) {
  act(() => {
    Dimensions.set({ window: { ...originalWindow, fontScale }, screen: { ...originalWindow, fontScale } });
  });
}

function renderCard() {
  return render(
    <FeedbackProvider apiKey="sf_test" userId="user-1">
      <ShowcaseCard feedback={card} onPress={() => undefined} />
    </FeedbackProvider>
  );
}

function iconSize(testID: string) {
  const node = screen.getAllByTestId(testID, { includeHiddenElements: true })[0];
  return StyleSheet.flatten(node.props.style).width as number;
}

afterEach(() => {
  setFontScale(originalWindow.fontScale);
  jest.restoreAllMocks();
});

describe('Showcase at large text sizes', () => {
  it('never truncates text and lets the footer wrap', () => {
    setFontScale(2);
    renderCard();
    for (const text of screen.UNSAFE_getAllByType(Text)) {
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.allowFontScaling).not.toBe(false);
    }
    const footer = StyleSheet.flatten(screen.getByTestId('fbk-card-footer-fb-1').props.style);
    expect(footer).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' });
  });

  it('scales drawn glyphs with the text beside them', () => {
    setFontScale(1);
    renderCard();
    const glyphAt1 = iconSize('fbk-status-glyph-in_progress');
    const factAt1 = iconSize('fbk-icon-tune');
    screen.unmount();

    setFontScale(2);
    renderCard();
    expect(iconSize('fbk-status-glyph-in_progress')).toBe(glyphAt1 * 2);
    expect(iconSize('fbk-icon-tune')).toBeGreaterThanOrEqual(factAt1 * 2 - 1);
  });

  it('keeps the capsule hit area at the platform minimum at every size', () => {
    for (const scale of [0.85, 1, 2, 3]) {
      setFontScale(scale);
      renderCard();
      const capsule = screen.getByTestId('fbk-vote-capsule-fb-1');
      const { minHeight } = StyleSheet.flatten(capsule.props.style) as { minHeight: number };
      expect(minHeight + capsule.props.hitSlop.top + capsule.props.hitSlop.bottom).toBeGreaterThanOrEqual(44);
      screen.unmount();
    }
  });

  it('matches the snapshot at fontScale 1 (iOS, light)', () => {
    setFontScale(1);
    expect(renderCard().toJSON()).toMatchSnapshot();
  });

  it('matches the snapshot at fontScale 2 (iOS, light)', () => {
    setFontScale(2);
    expect(renderCard().toJSON()).toMatchSnapshot();
  });

  it('matches the snapshot at fontScale 2 (iOS, dark)', () => {
    jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('dark');
    setFontScale(2);
    expect(renderCard().toJSON()).toMatchSnapshot();
  });

  it('matches the snapshot at fontScale 2 (Android, light)', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    setFontScale(2);
    expect(renderCard().toJSON()).toMatchSnapshot();
  });

  it('matches the filter row snapshot at fontScale 2', () => {
    setFontScale(2);
    const tree = render(
      <FeedbackProvider apiKey="sf_test" userId="user-1">
        <FilterSummaryRow
          filter={{ status: FeedbackStatus.InProgress, category: FeedbackCategory.BugReport }}
          onClear={() => undefined}
        />
      </FeedbackProvider>
    ).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
