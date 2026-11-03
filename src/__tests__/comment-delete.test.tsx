import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { __httpControl, __resetHttpControl, ForbiddenError } from 'feedbackkit-js';
import { FeedbackProvider } from '../provider';
import { useComments } from '../hooks/useComments';

const rows = ['comment-1', 'comment-2'].map((id) => ({
  id,
  content: id,
  userId: 'user-1',
  isAdmin: false,
  createdAt: '2026-01-01T00:00:00.000Z',
}));

function mount(userId: string | undefined = 'user-1') {
  return renderHook(() => useComments('fb-1'), {
    wrapper: ({ children }) => (
      <FeedbackProvider apiKey="sf_test" userId={userId}>
        {children}
      </FeedbackProvider>
    ),
  });
}

describe('useComments.deleteComment', () => {
  beforeEach(() => {
    __resetHttpControl();
    __httpControl.commentsList = async () => rows;
  });

  afterEach(() => __resetHttpControl());

  it('deletes through the client and removes the row', async () => {
    const calls: string[][] = [];
    __httpControl.commentsDelete = async (feedbackId, commentId) => {
      calls.push([feedbackId, commentId]);
    };
    const { result } = mount();
    await waitFor(() => expect(result.current.comments).toHaveLength(2));

    await act(async () => {
      await result.current.deleteComment('comment-1');
    });

    expect(calls).toEqual([['fb-1', 'comment-1']]);
    expect(result.current.comments.map((row) => row.id)).toEqual(['comment-2']);
    expect(result.current.deleteError).toBeNull();
  });

  it('keeps the row and records the failure', async () => {
    __httpControl.commentsDelete = async () => {
      throw new ForbiddenError('You can only delete your own comments');
    };
    const { result } = mount();
    await waitFor(() => expect(result.current.comments).toHaveLength(2));

    await act(async () => {
      await expect(result.current.deleteComment('comment-1')).rejects.toThrow(
        'You can only delete your own comments'
      );
    });

    expect(result.current.comments).toHaveLength(2);
    expect(result.current.deleteError?.message).toBe('You can only delete your own comments');
  });
});
