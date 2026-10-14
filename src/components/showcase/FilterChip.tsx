/**
 * A Material 3 filter chip: 32dp tall with a check mark once selected, padded out to
 * the platform's minimum touch target. Chips sit inside a radiogroup, so each one is
 * a radio with a checked state.
 */

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { ShowcaseIcon } from './ShowcaseIcon';
import { useShowcaseAppearance } from './useShowcaseAppearance';

export interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Leading glyph shown while not selected, e.g. a status ring or category icon. */
  leading?: React.ReactNode;
  testID?: string;
}

const CHIP_HEIGHT = 32;

export function FilterChip({ label, selected, onPress, leading, testID }: FilterChipProps) {
  const { palette, metrics, fontScale } = useShowcaseAppearance();
  const slop = Math.max(0, (metrics.minTarget - CHIP_HEIGHT) / 2);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={{ top: slop, bottom: slop }}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, selected }}
      android_ripple={metrics.isAndroid ? { color: palette.ripple, foreground: true } : undefined}
      style={({ pressed }) => [
        styles.chip,
        {
          minHeight: CHIP_HEIGHT,
          backgroundColor: selected ? palette.chipSelected : palette.chip,
          borderColor: selected ? palette.chipSelected : palette.cardBorder,
          opacity: !metrics.isAndroid && pressed ? 0.6 : 1
        }
      ]}
    >
      {selected ? (
        <ShowcaseIcon name="check" size={Math.round(16 * fontScale)} color={palette.onChipSelected} />
      ) : (
        leading
      )}
      <Text style={[styles.label, { color: selected ? palette.onChipSelected : palette.title }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1
  }
});
