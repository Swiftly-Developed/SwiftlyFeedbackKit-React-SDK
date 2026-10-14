import React from 'react';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { Feedback, FeedbackCategory, FeedbackStatus, __httpControl, __resetHttpControl } from 'feedbackkit-js';
import { FeedbackProvider } from '../provider';
import { useComments } from '../hooks/useComments';
import { FeedbackDetailView } from '../components/FeedbackDetailView';

const existing = {
  id: 'comment-1',
  content: 'Already here',
  userId: 'user-1',
  isAdmin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function feedback(): Feedback {
  return {
    id: 'fb-1',
    title: 'Dark mode',
    description: 'Please',
    status: FeedbackStatus.Pending,
    category: FeedbackCategory.FeatureRequest,
    userId: 'user-1',
    voteCount: 1,
    hasVoted: false,
    commentCount: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

afterEach(() => {
  __resetHttpControl();
});

describe('comment send failures', () => {
  it('keeps the loaded comments and records addError when create rejects', async () => {
    __httpControl.commentsList = async () => [existing];
    __httpControl.commentsCreate = async () => {
      throw new Error('nope');
    };

    const { result } = renderHook(() => useComments('fb-1'), {
      wrapper: ({ children }) => (
        <FeedbackProvider apiKey="sf_test" userId="user-1">
          {children}
        </FeedbackProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.comments.map((item) => item.id)).toEqual(['comment-1']);
    });

    await expect(
      act(async () => {
        await result.current.addComment('Hello');
      })
    ).rejects.toThrow('nope');

    expect(result.current.comments.map((item) => item.id)).toEqual(['comment-1']);
    expect(result.current.error).toBeNull();
    expect(result.current.addError?.message).toBe('nope');
  });

  it('shows the send failure on the detail screen without replacing the comment list', async () => {
    __httpControl.commentsList = async () => [existing];
    __httpControl.commentsCreate = async () => {
      throw new Error('nope');
    };

    render(
      <FeedbackProvider apiKey="sf_test" userId="user-1">
        <FeedbackDetailView feedback={feedback()} />
      </FeedbackProvider>
    );

    await screen.findByText('Already here');

    fireEvent.changeText(screen.getByPlaceholderText('Add a comment...'), 'Hello');
    await act(async () => {
      fireEvent.press(screen.getByText('Send'));
    });

    expect(screen.getByText('Could not send your comment')).toBeTruthy();
    expect(screen.getByText('Already here')).toBeTruthy();
    expect(screen.queryByText('Failed to load comments')).toBeNull();
  });
});
