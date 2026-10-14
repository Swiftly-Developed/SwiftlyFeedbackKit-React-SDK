/**
 * One Showcase card: status eyebrow, title, the whole description, and a footer
 * with the category and comment facts on the leading side and the vote capsule on
 * the trailing side. The footer wraps, so at large text sizes the capsule drops
 * below the facts and stays leading-aligned instead of being squeezed or clipped.
 *
 * When the card opens details it is one accessibility element read in the order
 * status, title, description, category, comments, votes; voting stays reachable as
 * a named accessibility action on that element.
 */

import React from 'react';
import { AccessibilityActionEvent, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Feedback, FeedbackCategory } from 'feedbackkit-js';
import { t } from '../../i18n';
import { getCategoryDisplayName, getStatusDisplayName } from '../../styles/theme';
import { ShowcaseIcon, ShowcaseIconName } from './ShowcaseIcon';
import { ShowcaseVoteCapsule } from './ShowcaseVoteCapsule';
import { StatusGlyph } from './StatusGlyph';
import { formatCount, resolveVotePresentation, voteCountText } from './feedbackListState';
import { useShowcaseAppearance } from './useShowcaseAppearance';
import { useVoteToggle } from './useVoteToggle';

const CATEGORY_ICONS: Record<string, ShowcaseIconName> = {
  [FeedbackCategory.FeatureRequest]: 'lightbulb',
  [FeedbackCategory.BugReport]: 'bug',
  [FeedbackCategory.Improvement]: 'tune',
  [FeedbackCategory.Other]: 'more'
};

export interface ShowcaseCardProps {
  feedback: Feedback;
  onPress?: (feedback: Feedback) => void;
  showStatus?: boolean;
  showCategory?: boolean;
  showCommentCount?: boolean;
  showVoteCount?: boolean;
  allowUndoVote?: boolean;
  /** Render placeholder chrome while the list loads. */
  isSkeleton?: boolean;
  style?: ViewStyle;
}

export function ShowcaseCard({
  feedback,
  onPress,
  showStatus = true,
  showCategory = true,
  showCommentCount = true,
  showVoteCount = true,
  allowUndoVote = true,
  isSkeleton = false,
  style
}: ShowcaseCardProps) {
  const { palette, metrics, fontScale } = useShowcaseAppearance();
  const vote = useVoteToggle(feedback, allowUndoVote);
  const presentation = resolveVotePresentation({
    status: feedback.status,
    hasVoted: vote.hasVoted,
    showVoteCount,
    allowUndoVote,
    isSkeleton
  });

  const statusName = getStatusDisplayName(feedback.status);
  const categoryName = getCategoryDisplayName(feedback.category);
  const commentsVisible = showCommentCount && feedback.commentCount > 0;
  const commentsText = `${formatCount(feedback.commentCount)} ${t(
    feedback.commentCount === 1 ? 'comment.one' : 'comment.other'
  )}`;
  const factSize = metrics.factSize;
  const factIcon = Math.round(factSize * 1.25 * fontScale);
  const hasFooter = showCategory || commentsVisible || presentation.kind !== 'hidden';

  const labelParts: string[] = [];
  if (showStatus) labelParts.push(statusName);
  labelParts.push(feedback.title);
  if (feedback.description) labelParts.push(feedback.description);
  if (showCategory) labelParts.push(categoryName);
  if (commentsVisible) labelParts.push(commentsText);
  if (presentation.kind !== 'hidden') {
    labelParts.push(voteCountText(vote.voteCount));
    if (presentation.valueKey) labelParts.push(t(presentation.valueKey));
  }

  const actions = presentation.isActionable
    ? [
        { name: 'activate' },
        {
          name: vote.hasVoted ? 'unvote' : 'vote',
          label: t(vote.hasVoted ? 'a11y.vote.unvoteAction' : 'a11y.vote.action')
        }
      ]
    : [{ name: 'activate' }];

  const handleAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'activate') onPress?.(feedback);
    else void vote.toggle();
  };

  const placeholder = (width: string | number, height: number) => (
    <View
      style={{ width: width as ViewStyle['width'], height, borderRadius: 6, backgroundColor: palette.placeholder }}
    />
  );

  const body = isSkeleton ? (
    <View style={styles.skeletonStack} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {placeholder(96, metrics.eyebrowSize * fontScale)}
      {placeholder('80%', metrics.titleSize * fontScale)}
      {placeholder('100%', metrics.bodySize * fontScale)}
      {placeholder('60%', metrics.bodySize * fontScale)}
      <View style={styles.footer}>
        {placeholder(110, factSize * fontScale)}
        <ShowcaseVoteCapsule feedbackId={feedback.id} presentation={presentation} voteCount={0} />
      </View>
    </View>
  ) : (
    <>
      {showStatus ? (
        <View style={styles.eyebrow}>
          <StatusGlyph
            status={feedback.status}
            size={Math.round(metrics.eyebrowSize * fontScale)}
            color={palette.statusGlyph(feedback.status)}
            onColor={palette.card}
          />
          <Text
            style={{
              color: palette.statusText(feedback.status),
              fontSize: metrics.eyebrowSize,
              fontWeight: metrics.eyebrowWeight,
              flexShrink: 1
            }}
          >
            {statusName}
          </Text>
        </View>
      ) : null}
      <Text
        accessibilityRole="header"
        style={[
          styles.title,
          { color: palette.title, fontSize: metrics.titleSize, fontWeight: metrics.titleWeight },
          showStatus ? null : styles.flushTop
        ]}
      >
        {feedback.title}
      </Text>
      {feedback.description ? (
        <Text style={[styles.description, { color: palette.body, fontSize: metrics.bodySize }]}>
          {feedback.description}
        </Text>
      ) : null}
      {hasFooter ? (
        <View style={styles.footer} testID={`fbk-card-footer-${feedback.id}`}>
          {showCategory || commentsVisible ? (
            <View style={styles.facts}>
              {showCategory ? (
                <View style={styles.fact}>
                  <ShowcaseIcon
                    name={CATEGORY_ICONS[feedback.category] ?? 'more'}
                    size={factIcon}
                    color={palette.body}
                  />
                  <Text style={{ color: palette.body, fontSize: factSize }}>{categoryName}</Text>
                </View>
              ) : null}
              {commentsVisible ? (
                <View style={styles.fact}>
                  <ShowcaseIcon name="comment" size={factIcon} color={palette.body} />
                  <Text style={{ color: palette.body, fontSize: factSize, fontVariant: ['tabular-nums'] }}>
                    {formatCount(feedback.commentCount)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <ShowcaseVoteCapsule
            feedbackId={feedback.id}
            presentation={presentation}
            voteCount={vote.voteCount}
            isVoting={vote.isVoting}
            onPress={() => void vote.toggle()}
          />
        </View>
      ) : null}
    </>
  );

  const cardStyle: ViewStyle = {
    backgroundColor: palette.card,
    borderRadius: metrics.cardRadius,
    padding: metrics.cardPadding,
    elevation: metrics.cardElevation
  };

  if (!onPress || isSkeleton) {
    return (
      <View style={[cardStyle, style]} testID={`fbk-feedback-card-${feedback.id}`}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      testID={`fbk-feedback-card-${feedback.id}`}
      onPress={() => onPress(feedback)}
      accessible
      accessibilityRole="button"
      accessibilityLabel={labelParts.join(', ')}
      accessibilityHint={t('a11y.card.hint')}
      accessibilityState={{ busy: vote.isVoting }}
      accessibilityActions={actions}
      onAccessibilityAction={handleAction}
      android_ripple={metrics.isAndroid ? { color: palette.ripple, foreground: true } : undefined}
      style={({ pressed }) => [
        cardStyle,
        !metrics.isAndroid && pressed ? { backgroundColor: palette.placeholder } : null,
        style
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  title: {
    marginTop: 8
  },
  flushTop: {
    marginTop: 0
  },
  description: {
    marginTop: 4
  },
  footer: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    rowGap: 8,
    columnGap: 12
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 14,
    rowGap: 4,
    flexShrink: 1
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  skeletonStack: {
    gap: 8
  }
});
