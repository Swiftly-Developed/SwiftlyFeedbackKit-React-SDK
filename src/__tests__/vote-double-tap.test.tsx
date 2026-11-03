import React from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  ConflictError,
  Feedback,
  FeedbackCategory,
  FeedbackStatus,
  ForbiddenError,
  __httpControl,
  __resetHttpControl,
} from 'feedbackkit-js';
import { FeedbackProvider } from '../provider';
import { VoteButton } from '../components/VoteButton';

function item(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: 'fb-1',
    title: 'Dark mode',
    description: 'Please',
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

function renderButton(onVoteChange?: (hasVoted: boolean, voteCount: number) => void) {
  return render(
    <FeedbackProvider apiKey="sf_test" userId="user-1">
      <VoteButton feedback={item()} onVoteChange={onVoteChange} />
    </FeedbackProvider>
  );
}

describe('VoteButton while a vote is in flight', () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    __resetHttpControl();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alert.mockRestore();
    __resetHttpControl();
  });

  it('sends one request for two presses in the same tick', async () => {
    let answer: (value: unknown) => void = () => {};
    let calls = 0;
    __httpControl.votesVote = () => {
      calls += 1;
      return new Promise((resolve) => {
        answer = resolve;
      });
    };
    renderButton();

    // Both presses read the same render, before `isVoting` can have updated.
    const { onPress } = screen.UNSAFE_getByType(TouchableOpacity).props;
    act(() => {
      onPress();
      onPress();
    });
    expect(calls).toBe(1);

    await act(async () => {
      answer({ feedbackId: 'fb-1', hasVoted: true, voteCount: 2 });
    });
    expect(screen.getByText('2')).toBeTruthy();
    expect(alert).not.toHaveBeenCalled();
  });

  it('accepts a press again once the request has finished', async () => {
    let calls = 0;
    __httpControl.votesVote = async () => {
      calls += 1;
      return { feedbackId: 'fb-1', hasVoted: true, voteCount: 2 };
    };
    __httpControl.votesUnvote = async () => {
      calls += 1;
      return { feedbackId: 'fb-1', hasVoted: false, voteCount: 1 };
    };
    renderButton();

    await act(async () => {
      fireEvent.press(screen.getByRole('button'));
    });
    await waitFor(() => expect(screen.getByText('2')).toBeTruthy());
    await act(async () => {
      fireEvent.press(screen.getByRole('button'));
    });
    await waitFor(() => expect(screen.getByText('1')).toBeTruthy());
    expect(calls).toBe(2);
  });

  it('shows the failure', async () => {
    __httpControl.votesVote = async () => {
      throw new ForbiddenError('Cannot vote on feedback that is completed');
    };
    renderButton();

    await act(async () => {
      fireEvent.press(screen.getByRole('button'));
    });

    await waitFor(() => expect(alert).toHaveBeenCalledTimes(1));
    expect(alert.mock.calls[0][1]).toBe('Cannot vote on feedback that is completed');
  });

  it('refreshes the row on a conflict instead of reporting it', async () => {
    __httpControl.votesVote = async () => {
      throw new ConflictError('Already voted');
    };
    __httpControl.feedbackGet = async () => item({ voteCount: 7, hasVoted: true });
    const onVoteChange = jest.fn();
    renderButton(onVoteChange);

    await act(async () => {
      fireEvent.press(screen.getByRole('button'));
    });

    await waitFor(() => expect(screen.getByText('7')).toBeTruthy());
    expect(onVoteChange).toHaveBeenCalledWith(true, 7);
    expect(alert).not.toHaveBeenCalled();
  });
});
