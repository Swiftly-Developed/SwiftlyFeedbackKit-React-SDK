import React from 'react';
import { ViewStyle } from 'react-native';
import { Feedback, FeedbackCategory, FeedbackSort, FeedbackStatus } from 'feedbackkit-js';

/**
 * `showcase` (default): status eyebrow, full description, category and comment facts,
 * a vote capsule, and a Sort & Filter sheet with status and category filters.
 * `classic`: the list as it shipped before 2.1.0, kept unchanged as an escape hatch.
 */
export type FeedbackListStyle = 'showcase' | 'classic';

export interface FeedbackListProps {
  /** Called when a feedback item is pressed */
  onFeedbackPress?: (feedback: Feedback) => void;
  /** Filter by status. Fixes the status server-side and hides the sheet's Status filter. */
  filterByStatus?: FeedbackStatus;
  /** Filter by category. Fixes the category server-side and hides the sheet's Category filter. */
  filterByCategory?: FeedbackCategory;
  /** Initial sort order (defaults to votes) */
  sortBy?: FeedbackSort;
  /** Whether to show the sort picker (Classic) or the Sort & Filter button (Showcase) */
  showSortPicker?: boolean;
  /** Whether to show the add button */
  showAddButton?: boolean;
  /** Called when add button is pressed */
  onAddPress?: () => void;
  /** Custom empty component */
  emptyComponent?: React.ReactElement;
  /** List header component */
  ListHeaderComponent?: React.ComponentType | React.ReactElement;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom content container style */
  contentContainerStyle?: ViewStyle;
  /**
   * Visual style. Defaults to the provider's `listStyle`, which defaults to `showcase`.
   * Pass `classic` to keep the pre-2.1.0 list.
   */
  listStyle?: FeedbackListStyle;
  /** Showcase: offer the Status filter in the Sort & Filter sheet. Default true. */
  showStatusFilter?: boolean;
  /** Showcase: offer the Category filter in the Sort & Filter sheet. Default true. */
  showCategoryFilter?: boolean;
  /** Showcase: show the status eyebrow on each card. Default true. */
  showStatusBadge?: boolean;
  /** Showcase: show the category fact on each card. Default true. */
  showCategoryBadge?: boolean;
  /** Showcase: show the comment count (only when above zero). Default true. */
  showCommentCount?: boolean;
  /** Showcase: show the vote capsule, or the plain count on closed items. Default true. */
  showVoteCount?: boolean;
  /** Showcase: let a voter remove their vote. Default true. */
  allowUndoVote?: boolean;
}
