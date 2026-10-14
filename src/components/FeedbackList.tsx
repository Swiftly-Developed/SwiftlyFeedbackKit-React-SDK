/**
 * FeedbackList Component
 *
 * Scrollable list of feedback items, in the Showcase style by default or the
 * pre-2.1.0 Classic style.
 */

import React from 'react';
import { useFeedbackKitContext } from '../provider';
import { ClassicFeedbackList } from './ClassicFeedbackList';
import { FeedbackListProps } from './feedbackListProps';
import { ShowcaseFeedbackList } from './showcase/ShowcaseFeedbackList';

export type { FeedbackListProps, FeedbackListStyle } from './feedbackListProps';

/**
 * List component for displaying feedback items
 *
 * @example
 * ```tsx
 * <FeedbackList
 *   onFeedbackPress={(f) => navigation.navigate('Detail', { id: f.id })}
 *   showAddButton
 *   onAddPress={() => navigation.navigate('Submit')}
 * />
 *
 * // The list as it shipped before 2.1.0
 * <FeedbackList listStyle="classic" />
 * ```
 */
export function FeedbackList(props: FeedbackListProps) {
  const { listStyle: providerStyle } = useFeedbackKitContext();
  const listStyle = props.listStyle ?? providerStyle;
  return listStyle === 'classic' ? <ClassicFeedbackList {...props} /> : <ShowcaseFeedbackList {...props} />;
}
