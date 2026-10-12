import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import {
  Feedback,
  FeedbackCategory,
  FeedbackStatus,
  __httpControl,
  __resetHttpControl,
} from 'feedbackkit-js';
import { FeedbackProvider } from '../provider';
import { FeedbackList } from '../components/FeedbackList';
import { SubmitFeedbackView } from '../components/SubmitFeedbackView';
import { clearOverrideStrings, setLocale, t } from '../i18n';
import { en } from '../i18n/strings';

const SORT_KEYS = [
  'sort.label',
  'sort.votes',
  'sort.newest',
  'sort.oldest',
  'sort.comments',
] as const;

const NON_ENGLISH = ['es', 'fr', 'de', 'ja', 'zh-Hans', 'pt-BR', 'ko', 'it', 'ar', 'ru'];

function item(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: 'fb-1',
    title: 'Keep me',
    description: 'Still here',
    status: FeedbackStatus.Pending,
    category: FeedbackCategory.FeatureRequest,
    userId: 'user-1',
    voteCount: 3,
    hasVoted: false,
    commentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  setLocale('en');
  clearOverrideStrings();
  __resetHttpControl();
});

describe('sort catalogs', () => {
  it('translates sort labels in every non-English catalog', () => {
    for (const locale of NON_ENGLISH) {
      setLocale(locale);
      for (const key of SORT_KEYS) {
        expect(t(key)).not.toBe(en[key]);
      }
    }
  });
});

describe('FeedbackList accessibility and direction', () => {
  it('names the add button, marks the active sort chip, and lays out Arabic from the right', async () => {
    __httpControl.feedbackList = async () => [item()];
    setLocale('ar');

    render(
      <FeedbackProvider apiKey="sf_test" userId="user-1" locale="ar">
        <FeedbackList
          showAddButton
          onAddPress={() => undefined}
          onFeedbackPress={() => undefined}
        />
      </FeedbackProvider>
    );

    await screen.findByText('Keep me');

    const list = screen.UNSAFE_getByType(FlatList);
    const containerStyle = list.parent?.props.style;
    const flat = Array.isArray(containerStyle) ? containerStyle : [containerStyle];
    expect(flat).toEqual(
      expect.arrayContaining([expect.objectContaining({ direction: 'rtl' })])
    );

    expect(
      screen.getByRole('button', { name: t('sort.votes'), selected: true })
    ).toBeTruthy();
    const add = screen.getByRole('button', { name: t('feedback.submit.title') });
    expect(JSON.stringify(add.props.style)).toContain('"end":');

    expect(screen.getByRole('button', { name: 'Keep me' })).toBeTruthy();
    expect(screen.getByRole('button', { name: `${t('button.vote')}, 3` })).toBeTruthy();
  });
});

describe('SubmitFeedbackView checkboxes', () => {
  it('exposes checkbox state and indents the nested options from the start edge', () => {
    render(
      <FeedbackProvider apiKey="sf_test" userId="user-1">
        <SubmitFeedbackView />
      </FeedbackProvider>
    );

    fireEvent.changeText(
      screen.getByPlaceholderText('For follow-up questions'),
      'ada@example.com'
    );
    fireEvent.press(screen.getByRole('checkbox', { name: 'Keep me updated via email newsletter' }));

    const operational = screen.getByRole('checkbox', {
      name: 'Operational emails',
      checked: true,
    });
    let node: { props?: { style?: unknown }; parent?: typeof operational.parent } | null = operational;
    let foundIndent = false;
    for (let depth = 0; depth < 8 && node; depth += 1) {
      if (JSON.stringify(node.props?.style)?.includes('"marginStart":28')) {
        foundIndent = true;
        break;
      }
      node = node.parent ?? null;
    }
    expect(foundIndent).toBe(true);
  });
});
