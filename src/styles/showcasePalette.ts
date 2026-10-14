/**
 * Resolved colours and metrics for the Showcase list.
 *
 * On Android the list follows Material 3: elevated cards on a tonal surface, a
 * filled-tonal vote button, 48dp touch targets. On iOS it follows the grouped-list
 * look of the Swift SDK: flat rounded cards on the grouped background and 44pt
 * targets. Colours derive from the host `Theme`, so a host tint still applies.
 */

import { Platform } from 'react-native';
import { FeedbackStatus } from 'feedbackkit-js';
import { Theme, getStatusColor } from './theme';
import { ensureContrast, isDark, mix, onColor } from './color';

export interface ShowcasePalette {
  scheme: 'light' | 'dark';
  background: string;
  card: string;
  cardBorder: string;
  title: string;
  body: string;
  primary: string;
  onPrimary: string;
  /** Host tint as text on the list background (text buttons such as Clear). */
  primaryOnBackground: string;
  /** Host tint as text on a card or sheet surface. */
  primaryOnCard: string;
  tonal: string;
  onTonal: string;
  ripple: string;
  scrim: string;
  sheet: string;
  chip: string;
  chipSelected: string;
  onChipSelected: string;
  placeholder: string;
  danger: string;
  /** Status tint for the glyph, exactly as the host set it. */
  statusGlyph: (status: FeedbackStatus) => string;
  /** Status tint for eyebrow text, darkened or lightened only as far as AA needs. */
  statusText: (status: FeedbackStatus) => string;
}

export interface ShowcaseMetrics {
  isAndroid: boolean;
  minTarget: number;
  cardRadius: number;
  cardElevation: number;
  cardPadding: number;
  cardGap: number;
  eyebrowSize: number;
  eyebrowWeight: '500' | '600';
  titleSize: number;
  titleWeight: '500' | '600';
  bodySize: number;
  factSize: number;
  /** Visual capsule height. The hit area is padded out to `minTarget` with hitSlop. */
  capsuleHeight: number;
  voteSize: number;
  voteWeight: '500' | '600';
}

export function resolveShowcaseMetrics(os: string = Platform.OS): ShowcaseMetrics {
  const isAndroid = os === 'android';
  return {
    isAndroid,
    minTarget: isAndroid ? 48 : 44,
    cardRadius: isAndroid ? 12 : 20,
    cardElevation: isAndroid ? 1 : 0,
    cardPadding: isAndroid ? 16 : 18,
    cardGap: isAndroid ? 12 : 14,
    eyebrowSize: isAndroid ? 12 : 13,
    eyebrowWeight: isAndroid ? '500' : '600',
    titleSize: isAndroid ? 22 : 20,
    titleWeight: isAndroid ? '500' : '600',
    bodySize: isAndroid ? 14 : 15,
    factSize: isAndroid ? 12 : 13,
    capsuleHeight: isAndroid ? 40 : 36,
    voteSize: isAndroid ? 14 : 15,
    voteWeight: isAndroid ? '500' : '600'
  };
}

export function resolveShowcasePalette(theme: Theme, scheme: 'light' | 'dark'): ShowcasePalette {
  const card = theme.cardBackgroundColor;
  const dark = scheme === 'dark' || isDark(card);
  const tonal = mix(theme.primaryColor, card, dark ? 0.28 : 0.14);
  const chipSelected = mix(theme.primaryColor, card, dark ? 0.36 : 0.2);
  return {
    scheme,
    background: theme.backgroundColor,
    card,
    cardBorder: mix(theme.textColor, card, dark ? 0.18 : 0.1),
    title: theme.textColor,
    body: ensureContrast(theme.secondaryTextColor, card),
    primary: theme.primaryColor,
    onPrimary: onColor(theme.primaryColor),
    primaryOnBackground: ensureContrast(theme.primaryColor, theme.backgroundColor),
    primaryOnCard: ensureContrast(theme.primaryColor, card),
    tonal,
    onTonal: ensureContrast(theme.primaryColor, tonal),
    ripple: mix(theme.primaryColor, card, dark ? 0.32 : 0.18),
    scrim: 'rgba(0,0,0,0.32)',
    sheet: dark ? mix('#FFFFFF', card, 0.04) : card,
    chip: card,
    chipSelected,
    onChipSelected: ensureContrast(theme.textColor, chipSelected),
    placeholder: mix(theme.textColor, card, dark ? 0.16 : 0.08),
    danger: ensureContrast(theme.errorColor, card),
    statusGlyph: (status) => getStatusColor(status, theme),
    statusText: (status) => ensureContrast(getStatusColor(status, theme), card)
  };
}
