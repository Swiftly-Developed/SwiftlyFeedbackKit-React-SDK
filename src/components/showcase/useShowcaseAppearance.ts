import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { useFeedbackKitContext } from '../../provider';
import {
  ShowcaseMetrics,
  ShowcasePalette,
  resolveShowcaseMetrics,
  resolveShowcasePalette
} from '../../styles/showcasePalette';

export interface ShowcaseAppearance {
  palette: ShowcasePalette;
  metrics: ShowcaseMetrics;
  /** The system text scale. Drawn glyphs multiply by it so they grow with the text beside them. */
  fontScale: number;
}

export function useShowcaseAppearance(): ShowcaseAppearance {
  const { theme, colorScheme } = useFeedbackKitContext();
  const { fontScale } = useWindowDimensions();
  const palette = useMemo(() => resolveShowcasePalette(theme, colorScheme), [theme, colorScheme]);
  const metrics = useMemo(() => resolveShowcaseMetrics(), []);
  return { palette, metrics, fontScale: fontScale > 0 ? fontScale : 1 };
}
