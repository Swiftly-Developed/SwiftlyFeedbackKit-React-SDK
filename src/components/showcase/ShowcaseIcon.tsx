/**
 * Material Symbols outlines drawn with plain Views, so the SDK ships icons without
 * adding an SVG or font dependency to the host app. A host that already has an icon
 * set passes `renderIcon` to `FeedbackProvider` and these are not used.
 *
 * Every icon is decorative: its meaning is always carried by adjacent text or by
 * the control's accessibility label.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useFeedbackKitContext } from '../../provider';

export type ShowcaseIconName =
  | 'tune'
  | 'lightbulb'
  | 'bug'
  | 'more'
  | 'comment'
  | 'filter'
  | 'filterActive'
  | 'arrowUp'
  | 'check'
  | 'close';

export interface ShowcaseIconProps {
  name: ShowcaseIconName;
  size: number;
  color: string;
  /** Fill colour for glyph details drawn over a filled shape, e.g. `filterActive`. */
  onColor?: string;
  style?: ViewStyle;
}

export type ShowcaseIconRenderer = (
  name: ShowcaseIconName,
  props: { size: number; color: string }
) => React.ReactNode | null | undefined;

export function ShowcaseIcon({ name, size, color, onColor = '#FFFFFF', style }: ShowcaseIconProps) {
  const { renderIcon } = useFeedbackKitContext();
  const custom = renderIcon?.(name, { size, color });
  return (
    <View
      style={[{ width: size, height: size }, styles.box, style]}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`fbk-icon-${name}`}
    >
      {custom ?? <DrawnIcon name={name} size={size} color={color} onColor={onColor} />}
    </View>
  );
}

function DrawnIcon({ name, size: s, color, onColor }: Required<Omit<ShowcaseIconProps, 'style'>>) {
  const stroke = Math.max(1.5, s / 12);
  const line = (width: number, extra?: ViewStyle): ViewStyle => ({
    width,
    height: stroke,
    borderRadius: stroke / 2,
    backgroundColor: color,
    ...extra
  });

  switch (name) {
    case 'tune': {
      // Three slider tracks with their knobs at different positions.
      const knob = (offset: number): ViewStyle => ({
        position: 'absolute',
        left: offset,
        top: -s * 0.09,
        width: stroke,
        height: s * 0.18 + stroke,
        borderRadius: stroke / 2,
        backgroundColor: color
      });
      return (
        <View style={{ width: s * 0.75, height: s * 0.62, justifyContent: 'space-between' }}>
          {[0.55, 0.15, 0.38].map((position) => (
            <View key={position} style={line(s * 0.75)}>
              <View style={knob(s * 0.75 * position)} />
            </View>
          ))}
        </View>
      );
    }
    case 'lightbulb':
      return (
        <View style={styles.column}>
          <View
            style={{
              width: s * 0.56,
              height: s * 0.56,
              borderRadius: s * 0.28,
              borderWidth: stroke,
              borderColor: color
            }}
          />
          <View style={line(s * 0.28, { marginTop: s * 0.05 })} />
          <View style={line(s * 0.2, { marginTop: s * 0.04 })} />
        </View>
      );
    case 'bug':
      return (
        <View style={{ width: s * 0.8, height: s * 0.8, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: s * 0.44,
              height: s * 0.62,
              borderRadius: s * 0.22,
              borderWidth: stroke,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <View style={line(s * 0.2)} />
          </View>
          {[0.3, 0.5, 0.7].map((top) => (
            <View
              key={top}
              style={[
                StyleSheet.absoluteFillObject,
                { top: s * 0.8 * top - stroke / 2, height: stroke, flexDirection: 'row', justifyContent: 'space-between' }
              ]}
            >
              <View style={line(s * 0.16)} />
              <View style={line(s * 0.16)} />
            </View>
          ))}
        </View>
      );
    case 'more':
      return (
        <View style={[styles.row, { gap: s * 0.1 }]}>
          {[0, 1, 2].map((dot) => (
            <View key={dot} style={{ width: s * 0.18, height: s * 0.18, borderRadius: s * 0.09, backgroundColor: color }} />
          ))}
        </View>
      );
    case 'comment':
      return (
        <View style={{ width: s * 0.78, height: s * 0.74 }}>
          <View
            style={{
              width: s * 0.78,
              height: s * 0.6,
              borderRadius: s * 0.12,
              borderWidth: stroke,
              borderColor: color
            }}
          />
          <View
            style={{
              position: 'absolute',
              start: s * 0.12,
              bottom: 0,
              width: 0,
              height: 0,
              borderTopWidth: s * 0.17,
              borderTopColor: color,
              borderEndWidth: s * 0.17,
              borderEndColor: 'transparent'
            }}
          />
        </View>
      );
    case 'filter':
      return (
        <View style={[styles.column, { gap: s * 0.13 }]}>
          <View style={line(s * 0.75)} />
          <View style={line(s * 0.48)} />
          <View style={line(s * 0.22)} />
        </View>
      );
    case 'filterActive':
      return (
        <View
          style={{
            width: s * 0.92,
            height: s * 0.92,
            borderRadius: s * 0.46,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
            gap: s * 0.08
          }}
        >
          {[0.5, 0.32, 0.14].map((width) => (
            <View
              key={width}
              style={{ width: s * width, height: stroke, borderRadius: stroke / 2, backgroundColor: onColor }}
            />
          ))}
        </View>
      );
    case 'arrowUp':
      return (
        <View style={styles.column}>
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: s * 0.32,
              borderRightWidth: s * 0.32,
              borderBottomWidth: s * 0.34,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color
            }}
          />
          <View style={{ width: s * 0.16, height: s * 0.4, backgroundColor: color, borderRadius: stroke / 3 }} />
        </View>
      );
    case 'check':
      return (
        <View
          style={{
            width: s * 0.3,
            height: s * 0.56,
            borderBottomWidth: stroke * 1.3,
            borderRightWidth: stroke * 1.3,
            borderColor: color,
            marginTop: -s * 0.12,
            transform: [{ rotate: '45deg' }]
          }}
        />
      );
    case 'close':
      return (
        <View style={{ width: s * 0.6, height: s * 0.6, alignItems: 'center', justifyContent: 'center' }}>
          {['45deg', '-45deg'].map((rotate) => (
            <View
              key={rotate}
              style={{
                position: 'absolute',
                width: s * 0.72,
                height: stroke * 1.3,
                borderRadius: stroke,
                backgroundColor: color,
                transform: [{ rotate }]
              }}
            />
          ))}
        </View>
      );
  }
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  column: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center'
  }
});
