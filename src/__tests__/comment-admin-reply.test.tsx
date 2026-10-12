import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { FeedbackProvider, useFeedbackKitContext } from '../provider';
import { useComments } from '../hooks/useComments';

function useProbe(feedbackId: string) {
  const comments = useComments(feedbackId);
  const { client, canPostAdminReply } = useFeedbackKitContext();
  return { comments, client, canPostAdminReply };
}

describe('useComments admin replies', () => {
  it('refuses isAdmin when the provider has only the project API key', async () => {
    const { result } = renderHook(() => useProbe('feedback-id'), {
      wrapper: ({ children }) => (
        <FeedbackProvider apiKey="sf_public_key" userId="rn-user-120">
          {children}
        </FeedbackProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.comments.isLoading).toBe(false);
    });
    expect(result.current.canPostAdminReply).toBe(false);

    await expect(
      act(async () => {
        await result.current.comments.addComment('Works on my device.', true);
      })
    ).rejects.toThrow(/bearer token/);
    expect(result.current.client.comments.create).not.toHaveBeenCalled();
  });

  it('forwards isAdmin when the provider was given a bearer token', async () => {
    const { result } = renderHook(() => useProbe('feedback-id'), {
      wrapper: ({ children }) => (
        <FeedbackProvider
          apiKey="sf_public_key"
          userId="rn-user-120"
          bearerToken="server-credential"
        >
          {children}
        </FeedbackProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.canPostAdminReply).toBe(true);
    });

    result.current.client.comments.create.mockResolvedValueOnce({
      id: 'comment-id',
      content: 'Works on my device.',
      userId: 'rn-user-120',
      isAdmin: true,
      createdAt: '2026-10-10T00:00:00.000Z',
    });

    await act(async () => {
      await result.current.comments.addComment('Works on my device.', true);
    });

    expect(result.current.client.comments.create).toHaveBeenCalledWith('feedback-id', {
      content: 'Works on my device.',
      userId: 'rn-user-120',
      isAdmin: true,
    });
  });

  it('posts an end-user comment with isAdmin false', async () => {
    const { result } = renderHook(() => useProbe('feedback-id'), {
      wrapper: ({ children }) => (
        <FeedbackProvider apiKey="sf_public_key" userId="rn-user-120">
          {children}
        </FeedbackProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.comments.isLoading).toBe(false);
    });

    result.current.client.comments.create.mockResolvedValueOnce({
      id: 'comment-id',
      content: 'Works on my device.',
      userId: 'rn-user-120',
      isAdmin: false,
      createdAt: '2026-10-10T00:00:00.000Z',
    });

    await act(async () => {
      await result.current.comments.addComment('Works on my device.');
    });

    expect(result.current.client.comments.create).toHaveBeenCalledWith('feedback-id', {
      content: 'Works on my device.',
      userId: 'rn-user-120',
      isAdmin: false,
    });
  });
});
