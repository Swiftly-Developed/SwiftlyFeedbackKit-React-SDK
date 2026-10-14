/**
 * Loading placeholders: the real Showcase card fed placeholder values, so ghost and
 * content share one layout and nothing shifts when the list arrives. The ghosts are
 * hidden from assistive technology; the container announces "Loading feedback".
 */

import React from 'react';
import { View } from 'react-native';
import { Feedback, FeedbackCategory, FeedbackStatus } from 'feedbackkit-js';
import { t } from '../../i18n';
import { ShowcaseCard } from './ShowcaseCard';

function ghost(index: number): Feedback {
  return {
    id: `skeleton-${index}`,
    title: '',
    description: '',
    status: FeedbackStatus.Pending,
    category: FeedbackCategory.Other,
    userId: '',
    voteCount: 0,
    hasVoted: false,
    commentCount: 0,
    createdAt: '',
    updatedAt: ''
  };
}

export function ShowcaseSkeleton({ count = 3, gap }: { count?: number; gap: number }) {
  return (
    <View
      testID="fbk-feedback-skeleton"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('list.loading')}
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: count }, (_, index) => (
        <ShowcaseCard key={index} feedback={ghost(index)} isSkeleton style={{ marginBottom: gap }} />
      ))}
    </View>
  );
}
