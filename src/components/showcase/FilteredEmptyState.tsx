/**
 * Shown when the loaded list has items but the active filters match none. Distinct
 * from the project-empty state, and it claims only "no match", never completeness.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { t } from '../../i18n';
import { ShowcaseIcon } from './ShowcaseIcon';
import { useShowcaseAppearance } from './useShowcaseAppearance';

export interface FilteredEmptyStateProps {
  onClear: () => void;
}

export function FilteredEmptyState({ onClear }: FilteredEmptyStateProps) {
  const { palette, metrics, fontScale } = useShowcaseAppearance();
  return (
    <View style={styles.container} testID="fbk-filtered-empty">
      <ShowcaseIcon name="filter" size={Math.round(40 * fontScale)} color={palette.body} />
      <Text accessibilityRole="header" style={[styles.title, { color: palette.title }]}>
        {t('list.filter.empty.title')}
      </Text>
      <Text style={[styles.description, { color: palette.body }]}>{t('list.filter.empty.description')}</Text>
      <Pressable
        testID="fbk-filtered-empty-clear"
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel={t('list.filter.clearAll')}
        android_ripple={metrics.isAndroid ? { color: palette.ripple, foreground: true } : undefined}
        style={({ pressed }) => [
          styles.button,
          {
            minHeight: metrics.capsuleHeight,
            backgroundColor: palette.tonal,
            opacity: !metrics.isAndroid && pressed ? 0.6 : 1
          }
        ]}
        hitSlop={{
          top: (metrics.minTarget - metrics.capsuleHeight) / 2,
          bottom: (metrics.minTarget - metrics.capsuleHeight) / 2
        }}
      >
        <Text style={[styles.buttonLabel, { color: palette.onTonal, fontWeight: metrics.voteWeight }]}>
          {t('list.filter.clearAll')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8
  },
  description: {
    fontSize: 15,
    textAlign: 'center'
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    justifyContent: 'center'
  },
  buttonLabel: {
    fontSize: 14,
    textAlign: 'center'
  }
});
