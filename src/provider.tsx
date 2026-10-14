/**
 * FeedbackKit Provider
 *
 * Provides FeedbackKit context to the component tree.
 */

import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { FeedbackKit } from 'feedbackkit-js';
import { Theme, darkTheme, defaultTheme, mergeTheme } from './styles/theme';
import type { FeedbackListStyle } from './components/feedbackListProps';
import type { ShowcaseIconRenderer } from './components/showcase/ShowcaseIcon';
import { getUserId, setUserId as persistUserId } from './utils/storage';
import { setLocale, setOverrideStrings } from './i18n';

/**
 * Theme configuration for FeedbackKit components
 */
export interface FeedbackKitTheme extends Partial<Theme> {}

/**
 * `system` follows the device setting. `light` and `dark` pin the scheme.
 */
export type FeedbackKitColorScheme = 'light' | 'dark' | 'system';

const SURFACE_KEYS = ['backgroundColor', 'cardBackgroundColor', 'textColor'] as const;

/**
 * The theme a scheme starts from before the host's overrides apply. Under `system`,
 * a host that set its own surface colours owns them, so the dark base is skipped
 * rather than mixing its light text with dark surfaces. An explicit `dark` always
 * starts from `darkTheme`.
 */
export function resolveBaseTheme(
  preference: FeedbackKitColorScheme,
  systemScheme: 'light' | 'dark',
  overrides?: Partial<Theme>
): { base: Theme; scheme: 'light' | 'dark' } {
  if (preference === 'light') return { base: defaultTheme, scheme: 'light' };
  if (preference === 'dark') return { base: darkTheme, scheme: 'dark' };
  if (systemScheme !== 'dark') return { base: defaultTheme, scheme: 'light' };
  const ownsSurfaces = SURFACE_KEYS.some((key) => overrides?.[key] !== undefined);
  return ownsSurfaces ? { base: defaultTheme, scheme: 'light' } : { base: darkTheme, scheme: 'dark' };
}

/**
 * FeedbackProvider props
 */
export interface FeedbackProviderProps {
  /** Project API key (required) */
  apiKey: string;
  /** Base URL of the FeedbackKit API (optional) */
  baseUrl?: string;
  /** Current user ID (optional, will be persisted) */
  userId?: string;
  /**
   * Server-side credential for admin replies.
   * Leave unset in an end-user app. `useComments`'s admin reply requires it.
   */
  bearerToken?: string;
  /** Theme customization */
  theme?: FeedbackKitTheme;
  /** Override locale (auto-detected from device by default) */
  locale?: string;
  /** Override specific translation strings */
  translations?: Record<string, string>;
  /**
   * Light or dark appearance. Defaults to `system`, which follows the device.
   * Pass `light` to keep the pre-2.1.0 always-light look.
   */
  colorScheme?: FeedbackKitColorScheme;
  /** Default style for every `FeedbackList`. Defaults to `showcase`. */
  listStyle?: FeedbackListStyle;
  /**
   * Draw the Showcase list's icons with the host's own icon set. Return null or
   * undefined for a name to fall back to the built-in glyph.
   */
  renderIcon?: ShowcaseIconRenderer;
  /** Children components */
  children: React.ReactNode;
}

/**
 * Context value
 */
export interface FeedbackKitContextValue {
  /** FeedbackKit client instance */
  client: FeedbackKit;
  /** Current user ID */
  userId: string | undefined;
  /** Update the current user ID */
  setUserId: (userId: string | undefined) => void;
  /** Current theme */
  theme: Theme;
  /** The resolved appearance, after `colorScheme` and the device setting. */
  colorScheme: 'light' | 'dark';
  /** Default `FeedbackList` style */
  listStyle: FeedbackListStyle;
  /** Host icon renderer, if any */
  renderIcon?: ShowcaseIconRenderer;
  /** Whether the provider is initialized */
  isInitialized: boolean;
  /**
   * True when `bearerToken` was passed to the provider. The token itself stays
   * on the client. End-user apps leave this false and cannot post admin replies.
   */
  canPostAdminReply: boolean;
}

const FeedbackKitContext = createContext<FeedbackKitContextValue | null>(null);

/**
 * FeedbackKit Provider Component
 *
 * Wrap your app with this provider to enable FeedbackKit hooks and components.
 *
 * @example
 * ```tsx
 * import { FeedbackProvider } from 'feedbackkit-react-native';
 *
 * export default function App() {
 *   return (
 *     <FeedbackProvider
 *       apiKey="sf_your_api_key"
 *       userId={user?.id}
 *       theme={{ primaryColor: '#007AFF' }}
 *     >
 *       <NavigationContainer>
 *         <AppNavigator />
 *       </NavigationContainer>
 *     </FeedbackProvider>
 *   );
 * }
 * ```
 */
export function FeedbackProvider({
  apiKey,
  baseUrl,
  userId: initialUserId,
  bearerToken,
  theme: themeOverrides,
  locale,
  translations,
  colorScheme: colorSchemePreference = 'system',
  listStyle = 'showcase',
  renderIcon,
  children
}: FeedbackProviderProps) {
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [userId, setUserIdState] = useState<string | undefined>(initialUserId);
  const [isInitialized, setIsInitialized] = useState(false);

  // Create client instance
  const client = useMemo(() => {
    return new FeedbackKit({
      apiKey,
      baseUrl,
      userId: initialUserId,
      bearerToken
    });
  }, [apiKey, baseUrl, initialUserId, bearerToken]);

  const { theme, colorScheme } = useMemo(() => {
    const { base, scheme } = resolveBaseTheme(colorSchemePreference, systemScheme, themeOverrides);
    return { theme: mergeTheme(base, themeOverrides), colorScheme: scheme };
  }, [colorSchemePreference, systemScheme, themeOverrides]);

  // Applied during render, before children, so the first paint and a later
  // locale prop both see the strings. An effect would run after children and
  // would not re-render them, because these setters are module state.
  if (locale) setLocale(locale);
  if (translations) setOverrideStrings(translations);

  // Load persisted user ID when the provider has no userId prop. A prop that
  // arrives while storage is still reading cancels the in-flight read so the
  // stored value cannot replace the one the caller just passed.
  useEffect(() => {
    let cancelled = false;
    async function loadUserId() {
      if (!initialUserId) {
        const persistedUserId = await getUserId();
        if (cancelled) return;
        if (persistedUserId) {
          setUserIdState(persistedUserId);
          client.setUserId(persistedUserId);
        }
      }
      if (!cancelled) setIsInitialized(true);
    }
    loadUserId();
    return () => {
      cancelled = true;
    };
  }, [client, initialUserId]);

  // Update client when userId changes
  useEffect(() => {
    client.setUserId(userId);
  }, [userId, client]);

  // Update userId when prop changes, and persist it. A prop-only id used to
  // live in memory until `setUserId`, so a later launch without the prop had
  // nothing in storage.
  useEffect(() => {
    if (initialUserId !== undefined) {
      setUserIdState(initialUserId);
      void persistUserId(initialUserId);
    }
  }, [initialUserId]);

  // Set user ID and persist
  const setUserId = async (newUserId: string | undefined) => {
    setUserIdState(newUserId);
    await persistUserId(newUserId);
    client.setUserId(newUserId);
  };

  const value: FeedbackKitContextValue = {
    client,
    userId,
    setUserId,
    theme,
    colorScheme,
    listStyle,
    renderIcon,
    isInitialized,
    canPostAdminReply: Boolean(bearerToken)
  };

  return (
    <FeedbackKitContext.Provider value={value}>
      {children}
    </FeedbackKitContext.Provider>
  );
}

/**
 * Hook to access the FeedbackKit context
 *
 * @throws Error if used outside of FeedbackProvider
 */
export function useFeedbackKitContext(): FeedbackKitContextValue {
  const context = useContext(FeedbackKitContext);
  if (!context) {
    throw new Error('useFeedbackKitContext must be used within a FeedbackProvider');
  }
  return context;
}
