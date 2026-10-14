/**
 * Row-level vote state for the Showcase capsule. Like `VoteButton`, the row keeps
 * its own copy so a vote response paints before any refetch, and a new `feedback`
 * prop (a list refresh) replaces that copy.
 */

import { useCallback, useEffect, useState } from 'react';
import { Feedback } from 'feedbackkit-js';
import { useVote } from '../../hooks/useVote';
import { canVoteOnStatus } from '../VoteButton';

export interface VoteToggleState {
  hasVoted: boolean;
  voteCount: number;
  isVoting: boolean;
  toggle: () => Promise<void>;
}

export function useVoteToggle(
  feedback: Feedback,
  allowUndoVote: boolean,
  onVoteChange?: (feedback: Feedback, hasVoted: boolean, voteCount: number) => void
): VoteToggleState {
  const { vote, unvote, isVoting } = useVote();
  const [hasVoted, setHasVoted] = useState(feedback.hasVoted);
  const [voteCount, setVoteCount] = useState(feedback.voteCount);

  useEffect(() => {
    setHasVoted(feedback.hasVoted);
    setVoteCount(feedback.voteCount);
  }, [feedback.id, feedback.hasVoted, feedback.voteCount]);

  const toggle = useCallback(async () => {
    if (!canVoteOnStatus(feedback.status) || isVoting) return;
    if (hasVoted && !allowUndoVote) return;
    try {
      const result = hasVoted ? await unvote(feedback.id) : await vote(feedback.id);
      setHasVoted(result.hasVoted);
      setVoteCount(result.voteCount);
      onVoteChange?.(feedback, result.hasVoted, result.voteCount);
    } catch {
      // `useVote` records the error; the capsule keeps its last confirmed state.
    }
  }, [allowUndoVote, feedback, hasVoted, isVoting, onVoteChange, unvote, vote]);

  return { hasVoted, voteCount, isVoting, toggle };
}
