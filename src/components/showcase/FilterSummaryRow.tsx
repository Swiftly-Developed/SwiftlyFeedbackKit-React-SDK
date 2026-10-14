/**
 * "Filtered by **Improvements · In Progress**  Clear". Shown only while a status or
 * category filter is active. The sentence is one accessibility element that also
 * carries a "Clear filters" action, and the Clear button stays reachable on its own.
 */

import React from 'react';
import { AccessibilityActionEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../../i18n';
import { ShowcaseIcon } from './ShowcaseIcon';
import { FeedbackListUserFilter, filterSummaryNames, filterSummaryText } from './feedbackListState';
import { useShowcaseAppearance } from './useShowcaseAppearance';

export interface FilterSummaryRowProps {
  filter: FeedbackListUserFilter;
  onClear: () => void;
}

export function FilterSummaryRow({ filter, onClear }: FilterSummaryRowProps) {
  const { palette, metrics, fontScale } = useShowcaseAppearance();
  const names = filterSummaryNames(filter);
  const sentence = filterSummaryText(filter);
  if (names === null || sentence === null) return null;

  const [before = '', after = ''] = t('list.filter.summary').split('%@');
  const handleAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'clear') onClear();
  };

  return (
    <View style={styles.row} testID="fbk-filter-summary">
      <ShowcaseIcon
        name="filterActive"
        size={Math.round(18 * fontScale)}
        color={palette.primary}
        onColor={palette.onPrimary}
      />
      <Text
        accessible
        accessibilityLabel={sentence}
        accessibilityActions={[{ name: 'clear', label: t('a11y.filter.clearAction') }]}
        onAccessibilityAction={handleAction}
        style={[styles.text, { color: palette.title, fontSize: metrics.bodySize }]}
      >
        {before}
        <Text style={styles.bold}>{names}</Text>
        {after}
      </Text>
      <Pressable
        testID="fbk-filter-clear"
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel={t('a11y.filter.clearAction')}
        android_ripple={metrics.isAndroid ? { color: palette.ripple, borderless: true } : undefined}
        style={({ pressed }) => [
          styles.clear,
          { minHeight: metrics.minTarget, minWidth: metrics.minTarget, opacity: !metrics.isAndroid && pressed ? 0.5 : 1 }
        ]}
      >
        <Text style={[styles.bold, { color: palette.primaryOnBackground, fontSize: metrics.bodySize }]}>
          {t('list.filter.clear')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingStart: 4
  },
  text: {
    flex: 1
  },
  bold: {
    fontWeight: '700'
  },
  clear: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  }
});
