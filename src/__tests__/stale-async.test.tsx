import React, { useState } from 'react';
import { act, render, renderHook, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedbackStatus, __httpControl, __resetHttpControl } from 'feedbackkit-js';
import { FeedbackProvider, useFeedbackKitContext } from '../provider';
import { useFeedbackList } from '../hooks/useFeedbackList';
import { useFeedback } from '../hooks/useFeedback';
import { useComments } from '../hooks/useComments';
import { FeedbackList } from '../components/FeedbackList';

/**
 * A promise whose resolver the test holds, so an older request can be made to
 * land AFTER a newer one.
 */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function Provider({ children }: { children: React.ReactNode }) {
  return (
    <FeedbackProvider apiKey="sf_test" userId="user-1">
      {children}
    </FeedbackProvider>
  );
}

afterEach(() => {
  __resetHttpControl();
});

describe('stale async reads', () => {
  it('useFeedbackList ignores a filter response that lands after a newer one', async () => {
    const first = deferred<Array<{ id: string }>>();
    const second = deferred<Array<{ id: string }>>();
    const queue = [first, second];
    __httpControl.feedbackList = () => {
      const next = queue.shift();
      if (!next) return Promise.resolve([]);
      return next.promise;
    };

    const { result } = renderHook(() => useFeedbackList(), { wrapper: Provider });

    await waitFor(() => {
      expect(queue.length).toBe(1);
    });

    act(() => {
      result.current.setFilter({ status: FeedbackStatus.Approved });
    });

    await waitFor(() => {
      expect(queue.length).toBe(0);
    });

    await act(async () => {
      second.resolve([{ id: 'newer' }]);
    });
    await act(async () => {
      first.resolve([{ id: 'older' }]);
    });

    expect(result.current.feedbacks.map((item) => item.id)).toEqual(['newer']);
  });

  it('useFeedback ignores a response for a feedback id the caller has already left', async () => {
    const first = deferred<{ id: string }>();
    const second = deferred<{ id: string }>();
    const queue = [first, second];
    __httpControl.feedbackGet = () => {
      const next = queue.shift();
      if (!next) return Promise.resolve({ id: 'none' });
      return next.promise;
    };

    const { result, rerender } = renderHook(({ id }) => useFeedback(id), {
      wrapper: Provider,
      initialProps: { id: 'item-a' },
    });

    await waitFor(() => {
      expect(queue.length).toBe(1);
    });

    rerender({ id: 'item-b' });

    await waitFor(() => {
      expect(queue.length).toBe(0);
    });

    await act(async () => {
      second.resolve({ id: 'item-b' });
    });
    await act(async () => {
      first.resolve({ id: 'item-a' });
    });

    expect(result.current.feedback?.id).toBe('item-b');
  });

  it('useComments ignores a comment list for a feedback id the caller has already left', async () => {
    const first = deferred<Array<{ id: string }>>();
    const second = deferred<Array<{ id: string }>>();
    const queue = [first, second];
    __httpControl.commentsList = () => {
      const next = queue.shift();
      if (!next) return Promise.resolve([]);
      return next.promise;
    };

    const { result, rerender } = renderHook(({ id }) => useComments(id), {
      wrapper: Provider,
      initialProps: { id: 'item-a' },
    });

    await waitFor(() => {
      expect(queue.length).toBe(1);
    });

    rerender({ id: 'item-b' });

    await waitFor(() => {
      expect(queue.length).toBe(0);
    });

    await act(async () => {
      second.resolve([{ id: 'comment-b' }]);
    });
    await act(async () => {
      first.resolve([{ id: 'comment-a' }]);
    });

    expect(result.current.comments.map((item) => item.id)).toEqual(['comment-b']);
  });

  it('FeedbackList applies a filter prop that changes after mount', async () => {
    const calls: Array<{ status?: string } | undefined> = [];
    __httpControl.feedbackList = async (options) => {
      calls.push(options as { status?: string } | undefined);
      return [];
    };

    function Host() {
      const [status, setStatus] = useState<FeedbackStatus | undefined>(undefined);
      return (
        <>
          <Text testID="flip" onPress={() => setStatus(FeedbackStatus.Approved)}>
            flip
          </Text>
          <FeedbackList filterByStatus={status} showSortPicker={false} />
        </>
      );
    }

    const { getByTestId } = render(
      <FeedbackProvider apiKey="sf_test" userId="user-1">
        <Host />
      </FeedbackProvider>
    );

    await waitFor(() => {
      expect(calls.length).toBeGreaterThan(0);
    });

    const before = calls.length;
    act(() => {
      getByTestId('flip').props.onPress();
    });

    await waitFor(() => {
      expect(calls.length).toBeGreaterThan(before);
    });
    expect(calls[calls.length - 1]?.status).toBe(FeedbackStatus.Approved);
  });
});

describe('persisted user id', () => {
  it('does not let a slow stored id overwrite a userId passed while storage was reading', async () => {
    const stored = deferred<string | null>();
    (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(() => stored.promise);

    function Probe() {
      const { userId } = useFeedbackKitContext();
      return <Text testID="uid">{userId ?? ''}</Text>;
    }

    const { rerender, getByTestId } = render(
      <FeedbackProvider apiKey="sf_test">
        <Probe />
      </FeedbackProvider>
    );

    rerender(
      <FeedbackProvider apiKey="sf_test" userId="live-user">
        <Probe />
      </FeedbackProvider>
    );

    await waitFor(() => {
      expect(getByTestId('uid').props.children).toBe('live-user');
    });

    await act(async () => {
      stored.resolve('persisted-user');
    });

    expect(getByTestId('uid').props.children).toBe('live-user');
  });
});
