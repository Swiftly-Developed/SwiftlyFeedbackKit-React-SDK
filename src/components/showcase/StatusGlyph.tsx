/**
 * The status eyebrow glyph. Status is encoded by shape as well as colour, so it
 * survives greyscale and colour-blind viewing: dashed ring (pending), empty ring
 * (approved), half-filled ring (in progress), three-quarter ring (TestFlight),
 * filled check (completed) and filled cross (rejected).
 *
 * Quadrants use physical left/right: like its SF Symbol, the glyph is a fixed shape
 * and does not mirror in right-to-left layouts.
 */

import React from 'react';
import { View } from 'react-native';
import { FeedbackStatus } from 'feedbackkit-js';
import { ShowcaseIcon } from './ShowcaseIcon';

export interface StatusGlyphProps {
  status: FeedbackStatus;
  size: number;
  color: string;
  /** Colour of the mark drawn on a filled glyph. */
  onColor: string;
}

type Quadrant = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

const FILLED_QUADRANTS: Partial<Record<FeedbackStatus, Quadrant[]>> = {
  [FeedbackStatus.InProgress]: ['topLeft', 'bottomLeft'],
  [FeedbackStatus.TestFlight]: ['topLeft', 'bottomLeft', 'bottomRight']
};

export function StatusGlyph({ status, size, color, onColor }: StatusGlyphProps) {
  const stroke = Math.max(1.5, size / 8);
  const ring = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: stroke,
    borderColor: color
  };

  if (status === FeedbackStatus.Completed || status === FeedbackStatus.Rejected) {
    return (
      <View
        testID={`fbk-status-glyph-${status}`}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <ShowcaseIcon name={status === FeedbackStatus.Completed ? 'check' : 'close'} size={size * 0.85} color={onColor} />
      </View>
    );
  }

  const quadrants = FILLED_QUADRANTS[status] ?? [];
  return (
    <View
      testID={`fbk-status-glyph-${status}`}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[ring, status === FeedbackStatus.Pending ? { borderStyle: 'dashed' } : null]}
    >
      {quadrants.map((quadrant) => (
        <View
          key={quadrant}
          style={{
            position: 'absolute',
            width: size / 2,
            height: size / 2,
            overflow: 'hidden',
            top: quadrant.startsWith('top') ? -stroke : undefined,
            bottom: quadrant.startsWith('bottom') ? -stroke : undefined,
            left: quadrant.endsWith('Left') ? -stroke : undefined,
            right: quadrant.endsWith('Right') ? -stroke : undefined
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              top: quadrant.startsWith('top') ? 0 : -size / 2,
              left: quadrant.endsWith('Left') ? 0 : -size / 2
            }}
          />
        </View>
      ))}
    </View>
  );
}
