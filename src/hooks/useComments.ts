/**
 * useComments Hook
 *
 * Fetch and manage comments for a feedback item.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Comment, FeedbackKitError } from 'feedbackkit-js';
import { useFeedbackKitContext } from '../provider';

export interface UseCommentsResult {
  /** List of comments */
  comments: Comment[];
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Error if fetch failed */
  error: FeedbackKitError | null;
  /**
   * Error from the latest `addComment` attempt. Kept separate from `error` so a
   * send failure does not replace the loaded comment list.
   */
  addError: Error | null;
  /** Refetch the comments */
  refetch: () => Promise<void>;
  /** Add a new comment */
  addComment: (content: string, isAdmin?: boolean) => Promise<Comment>;
  /** Whether a comment is being added */
  isAdding: boolean;
}

/**
 * Hook to fetch and manage comments
 *
 * @param feedbackId - The feedback UUID
 *
 * @example
 * ```tsx
 * function CommentsSection({ feedbackId }) {
 *   const {
 *     comments,
 *     isLoading,
 *     addComment,
 *     isAdding
 *   } = useComments(feedbackId);
 *
 *   const handleSubmit = async (text: string) => {
 *     try {
 *       await addComment(text);
 *     } catch (error) {
 *       Alert.alert('Error', error.message);
 *     }
 *   };
 *
 *   return (
 *     <View>
 *       {comments.map(comment => (
 *         <CommentCard key={comment.id} comment={comment} />
 *       ))}
 *       <CommentInput onSubmit={handleSubmit} isLoading={isAdding} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useComments(feedbackId: string): UseCommentsResult {
  const { client, userId, isInitialized, canPostAdminReply } = useFeedbackKitContext();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<FeedbackKitError | null>(null);
  const [addError, setAddError] = useState<Error | null>(null);
  // Bumped at the start of each list read and again on unmount. `addComment`
  // appends to local state and is not part of this sequence.
  const requestId = useRef(0);

  const fetchComments = useCallback(async () => {
    if (!isInitialized || !feedbackId) return;

    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);

    try {
      const result = await client.comments.list(feedbackId);
      if (id !== requestId.current) return;
      setComments(result);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err as FeedbackKitError);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [client, feedbackId, isInitialized]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    return () => {
      requestId.current += 1;
    };
  }, []);

  const refetch = useCallback(async () => {
    await fetchComments();
  }, [fetchComments]);

  const addComment = useCallback(
    async (content: string, isAdmin = false): Promise<Comment> => {
      if (!userId) {
        const err = new Error('User ID is required to comment. Set userId in FeedbackProvider.');
        setAddError(err);
        throw err;
      }

      if (isAdmin && !canPostAdminReply) {
        const err = new Error(
          'Admin replies require a bearer token. Pass bearerToken to FeedbackProvider; the project API key cannot mark a reply as admin.'
        );
        setAddError(err);
        throw err;
      }

      setIsAdding(true);
      setAddError(null);

      try {
        const newComment = await client.comments.create(feedbackId, {
          content,
          userId,
          isAdmin
        });
        setComments(prev => [...prev, newComment]);
        return newComment;
      } catch (err) {
        const failure = err instanceof Error ? err : new Error(String(err));
        setAddError(failure);
        throw err;
      } finally {
        setIsAdding(false);
      }
    },
    [client, feedbackId, userId, canPostAdminReply]
  );

  return {
    comments,
    isLoading,
    error,
    addError,
    refetch,
    addComment,
    isAdding
  };
}
