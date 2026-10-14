/**
 * The "Sort & Filter" button above the cards. While a filter is active it switches
 * to the filled-circle icon and the prominent (filled) style, and its accessibility
 * value names the filter; otherwise the value is the current sort.
 */

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { FeedbackSort } from 'feedbackkit-js';
import { t } from '../../i18n';
import { ShowcaseIcon } from './ShowcaseIcon';
import { FeedbackListUserFilter, filterSummaryText, isFiltered, sortLabel } from './feedbackListState';
import { useShowcaseAppearance } from './useShowcaseAppearance';

export interface SortFilterButtonProps {
  sort: FeedbackSort;
  filter: FeedbackListUserFilter;
  expanded: boolean;
  onPress: () => void;
}

export function SortFilterButton({ sort, filter, expanded, onPress }: SortFilterButtonProps) {
  const { palette, metrics, fontScale } = useShowcaseAppearance();
  const active = isFiltered(filter);
  const slop = Math.max(0, (metrics.minTarget - metrics.capsuleHeight) / 2);
  const foreground = active ? palette.onPrimary : palette.onTonal;

  return (
    <Pressable
      testID="fbk-sort-filter-menu"
      onPress={onPress}
      hitSlop={{ top: slop, bottom: slop }}
      accessibilityRole="button"
      accessibilityLabel={t('list.sortAndFilter')}
      accessibilityValue={{ text: active ? filterSummaryText(filter) ?? '' : sortLabel(sort) }}
      accessibilityState={{ expanded }}
      android_ripple={metrics.isAndroid ? { color: palette.ripple, foreground: true } : undefined}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: metrics.capsuleHeight,
          backgroundColor: active ? palette.primary : palette.tonal,
          opacity: !metrics.isAndroid && pressed ? 0.6 : 1
        }
      ]}
    >
      <ShowcaseIcon
        name={active ? 'filterActive' : 'filter'}
        size={Math.round(18 * fontScale)}
        color={foreground}
        onColor={palette.primary}
      />
      <Text style={[styles.label, { color: foreground, fontWeight: metrics.voteWeight }]}>
        {t('list.sortAndFilter')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingStart: 12,
    paddingEnd: 16,
    borderRadius: 999,
    alignSelf: 'flex-end'
  },
  label: {
    fontSize: 14,
    flexShrink: 1
  }
});
