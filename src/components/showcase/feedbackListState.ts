/**
 * Pure state for the Showcase list: the session filter, the "Filtered by" summary,
 * and how each row's vote capsule presents. Kept free of React so it is unit-tested
 * on its own and every view reads the same answers.
 */

import { Feedback, FeedbackCategory, FeedbackSort, FeedbackStatus } from 'feedbackkit-js';
import { formatString, t } from '../../i18n';
import { getStatusDisplayName } from '../../styles/theme';
import { canVoteOnStatus } from '../VoteButton';

/** The filter the user picks in the Sort & Filter sheet. Session-only. */
export interface FeedbackListUserFilter {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
}

export const SORT_OPTIONS: ReadonlyArray<{ value: FeedbackSort; labelKey: string }> = [
  { value: FeedbackSort.Votes, labelKey: 'sort.votes' },
  { value: FeedbackSort.Newest, labelKey: 'sort.newest' },
  { value: FeedbackSort.Oldest, labelKey: 'sort.oldest' },
  { value: FeedbackSort.Comments, labelKey: 'sort.comments' },
];

export const STATUS_OPTIONS: ReadonlyArray<FeedbackStatus> = [
  FeedbackStatus.Pending,
  FeedbackStatus.Approved,
  FeedbackStatus.InProgress,
  FeedbackStatus.TestFlight,
  FeedbackStatus.Completed,
  FeedbackStatus.Rejected,
];

export const CATEGORY_OPTIONS: ReadonlyArray<FeedbackCategory> = [
  FeedbackCategory.FeatureRequest,
  FeedbackCategory.BugReport,
  FeedbackCategory.Improvement,
  FeedbackCategory.Other,
];

const CATEGORY_PLURAL_KEYS: Record<string, string> = {
  [FeedbackCategory.FeatureRequest]: 'category.featureRequest.plural',
  [FeedbackCategory.BugReport]: 'category.bugReport.plural',
  [FeedbackCategory.Improvement]: 'category.improvement.plural',
  [FeedbackCategory.Other]: 'category.other.plural',
};

export function categoryPluralName(category: FeedbackCategory): string {
  const key = CATEGORY_PLURAL_KEYS[category];
  return key ? t(key) : category;
}

export function sortLabel(sort: FeedbackSort): string {
  const option = SORT_OPTIONS.find((candidate) => candidate.value === sort);
  return option ? t(option.labelKey) : sort;
}

export function isFiltered(filter: FeedbackListUserFilter): boolean {
  return filter.status !== undefined || filter.category !== undefined;
}

export function applyUserFilter(
  feedbacks: ReadonlyArray<Feedback>,
  filter: FeedbackListUserFilter
): Feedback[] {
  if (!isFiltered(filter)) return [...feedbacks];
  return feedbacks.filter(
    (item) =>
      (filter.status === undefined || item.status === filter.status) &&
      (filter.category === undefined || item.category === filter.category)
  );
}

/**
 * The names the summary row shows in bold: category first, then status, joined by
 * the catalog's join pattern so a translation can reorder or re-punctuate them.
 * Null when nothing is filtered, because the row is not shown then.
 */
export function filterSummaryNames(filter: FeedbackListUserFilter): string | null {
  const category = filter.category !== undefined ? categoryPluralName(filter.category) : null;
  const status = filter.status !== undefined ? getStatusDisplayName(filter.status) : null;
  if (category && status) return formatString(t('list.filter.join'), category, status);
  return category ?? status;
}

/** "Filtered by Improvements · In Progress", or null when nothing is filtered. */
export function filterSummaryText(filter: FeedbackListUserFilter): string | null {
  const names = filterSummaryNames(filter);
  return names === null ? null : formatString(t('list.filter.summary'), names);
}

export function formatCount(value: number, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return String(value);
  }
}

export function voteCountText(count: number, locale?: string): string {
  return formatString(t(count === 1 ? 'vote.count.one' : 'vote.count.other'), formatCount(count, locale));
}

export type VotePresentationKind =
  | 'hidden'
  | 'skeleton'
  | 'closed'
  | 'votable'
  | 'voted'
  | 'votedLocked';

export interface VotePresentationInput {
  status: FeedbackStatus;
  hasVoted: boolean;
  showVoteCount: boolean;
  allowUndoVote: boolean;
  isSkeleton?: boolean;
}

export interface VotePresentation {
  kind: VotePresentationKind;
  /** Whether the capsule is a control at all. A closed count is plain text. */
  isButton: boolean;
  /** Whether a press does something. False for a locked vote. */
  isActionable: boolean;
  isFilled: boolean;
  valueKey: string | null;
  hintKey: string | null;
}

export function resolveVotePresentation(input: VotePresentationInput): VotePresentation {
  if (!input.showVoteCount) {
    return { kind: 'hidden', isButton: false, isActionable: false, isFilled: false, valueKey: null, hintKey: null };
  }
  if (input.isSkeleton) {
    return { kind: 'skeleton', isButton: false, isActionable: false, isFilled: false, valueKey: null, hintKey: null };
  }
  if (!canVoteOnStatus(input.status)) {
    return {
      kind: 'closed',
      isButton: false,
      isActionable: false,
      isFilled: false,
      valueKey: 'a11y.vote.closed',
      hintKey: null
    };
  }
  if (!input.hasVoted) {
    return {
      kind: 'votable',
      isButton: true,
      isActionable: true,
      isFilled: false,
      valueKey: 'a11y.vote.notVoted',
      hintKey: 'a11y.vote.hint'
    };
  }
  if (input.allowUndoVote) {
    return {
      kind: 'voted',
      isButton: true,
      isActionable: true,
      isFilled: true,
      valueKey: 'a11y.vote.voted',
      hintKey: 'a11y.vote.unvoteHint'
    };
  }
  return {
    kind: 'votedLocked',
    isButton: true,
    isActionable: false,
    isFilled: true,
    valueKey: 'a11y.vote.voted',
    hintKey: 'a11y.vote.lockedHint'
  };
}
