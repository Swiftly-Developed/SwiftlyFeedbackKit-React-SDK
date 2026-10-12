import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { FlatList, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Feedback,
  FeedbackCategory,
  FeedbackStatus,
  __httpControl,
  __resetHttpControl,
} from 'feedbackkit-js';
import { FeedbackProvider } from '../provider';
import { FeedbackList } from '../components/FeedbackList';
import { defaultTheme, getStatusColor, getStatusDisplayName } from '../styles/theme';

function item(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: 'fb-1',
    title: 'Keep me',
    description: 'Still here',
    status: FeedbackStatus.Pending,
    category: FeedbackCategory.FeatureRequest,
    userId: 'user-1',
    voteCount: 1,
    hasVoted: false,
    commentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  __resetHttpControl();
});

describe('FeedbackProvider user id storage', () => {
  it('persists a userId passed as a prop', async () => {
    render(
      <FeedbackProvider apiKey="sf_test" userId="user-abc">
        <Text>hi</Text>
      </FeedbackProvider>
    );

    await waitFor(async () => {
      expect(await AsyncStorage.getItem('@feedbackkit/userId')).toBe('user-abc');
    });
  });
});

describe('FeedbackList refresh errors', () => {
  it('keeps the loaded rows and shows the refresh error', async () => {
    __httpControl.feedbackList = async () => [item()];

    render(
      <FeedbackProvider apiKey="sf_test" userId="user-1">
        <FeedbackList showSortPicker={false} />
      </FeedbackProvider>
    );

    await screen.findByText('Keep me');

    __httpControl.feedbackList = async () => {
      throw new Error('offline');
    };

    const list = screen.UNSAFE_getByType(FlatList);
    await act(async () => {
      await list.props.refreshControl.props.onRefresh();
    });

    expect(screen.getByText('Keep me')).toBeTruthy();
    expect(screen.getByText('offline')).toBeTruthy();
  });
});

describe('unknown status chrome', () => {
  it('gives an unknown status a readable name and a fallback color', () => {
    const status = 'quantum_launch' as FeedbackStatus;
    expect(getStatusDisplayName(status)).toBe('quantum_launch');
    expect(getStatusColor(status, defaultTheme)).toBe(defaultTheme.secondaryTextColor);
  });
});
