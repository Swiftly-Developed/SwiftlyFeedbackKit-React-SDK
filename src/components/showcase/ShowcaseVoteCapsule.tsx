/**
 * The Showcase vote capsule. One resolver (`resolveVotePresentation`) decides the
 * state; this view only draws it. On Android it is a Material 3 filled-tonal button
 * that turns into a filled button once voted, with a bounded ripple. On iOS it is a
 * tinted capsule with a pressed highlight.
 *
 * A closed request (completed or rejected) shows the count as plain text, not as a
 * disabled button: there is nothing to press, so nothing pretends to be pressable.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../../i18n';
import { ShowcaseIcon } from './ShowcaseIcon';
import { VotePresentation, formatCount, voteCountText } from './feedbackListState';
import { useShowcaseAppearance } from './useShowcaseAppearance';

export interface ShowcaseVoteCapsuleProps {
  feedbackId: string;
  presentation: VotePresentation;
  voteCount: number;
  isVoting?: boolean;
  onPress?: () => void;
}

export function ShowcaseVoteCapsule({
  feedbackId,
  presentation,
  voteCount,
  isVoting = false,
  onPress
}: ShowcaseVoteCapsuleProps) {
  const { palette, metrics, fontScale } = useShowcaseAppearance();
  const iconSize = Math.round(metrics.voteSize * fontScale);
  const slop = Math.max(0, (metrics.minTarget - metrics.capsuleHeight) / 2);
  const label = voteCountText(voteCount);
  const count = formatCount(voteCount);

  if (presentation.kind === 'hidden') return null;

  if (presentation.kind === 'skeleton') {
    return (
      <View
        testID={`fbk-vote-skeleton-${feedbackId}`}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.capsule,
          { minHeight: metrics.capsuleHeight, width: 72, backgroundColor: palette.placeholder }
        ]}
      />
    );
  }

  if (presentation.kind === 'closed') {
    return (
      <View
        testID={`fbk-vote-closed-${feedbackId}`}
        accessible
        accessibilityRole="text"
        accessibilityLabel={label}
        accessibilityValue={{ text: t('a11y.vote.closed') }}
        style={[styles.content, styles.closed, { minHeight: metrics.capsuleHeight }]}
      >
        <ShowcaseIcon name="arrowUp" size={iconSize} color={palette.body} />
        <Text style={[styles.count, { color: palette.body, fontSize: metrics.voteSize, fontWeight: metrics.voteWeight }]}>
          {count}
        </Text>
      </View>
    );
  }

  const background = presentation.isFilled ? palette.primary : palette.tonal;
  const foreground = presentation.isFilled ? palette.onPrimary : palette.onTonal;
  const disabled = !presentation.isActionable || isVoting;

  return (
    <Pressable
      testID={`fbk-vote-capsule-${feedbackId}`}
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: slop, bottom: slop, left: slop, right: slop }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={presentation.valueKey ? { text: t(presentation.valueKey) } : undefined}
      accessibilityHint={presentation.hintKey ? t(presentation.hintKey) : undefined}
      accessibilityState={{
        selected: presentation.isFilled,
        disabled: !presentation.isActionable,
        busy: isVoting
      }}
      android_ripple={metrics.isAndroid ? { color: palette.ripple, foreground: true } : undefined}
      style={({ pressed }) => [
        styles.capsule,
        styles.content,
        {
          minHeight: metrics.capsuleHeight,
          minWidth: metrics.minTarget,
          paddingHorizontal: metrics.isAndroid ? 16 : 14,
          backgroundColor: background,
          opacity: isVoting ? 0.7 : !metrics.isAndroid && pressed ? 0.6 : 1
        }
      ]}
    >
      <ShowcaseIcon name="arrowUp" size={iconSize} color={foreground} />
      <Text style={[styles.count, { color: foreground, fontSize: metrics.voteSize, fontWeight: metrics.voteWeight }]}>
        {count}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  capsule: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    justifyContent: 'center'
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  closed: {
    paddingHorizontal: 4
  },
  count: {
    fontVariant: ['tabular-nums']
  }
});
