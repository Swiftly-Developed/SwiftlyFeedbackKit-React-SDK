/**
 * FeedbackKit Provider
 *
 * Provides FeedbackKit context to the component tree.
 */

import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { FeedbackKit } from 'feedbackkit-js';
import { Theme, defaultTheme, mergeTheme } from './styles/theme';
import { getUserId, setUserId as persistUserId } from './utils/storage';
import { setLocale, setOverrideStrings } from './i18n';

/**
 * Theme configuration for FeedbackKit components
 */
export interface FeedbackKitTheme extends Partial<Theme> {}

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
  children
}: FeedbackProviderProps) {
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

  // Merge theme
  const theme = useMemo(() => {
    return mergeTheme(defaultTheme, themeOverrides);
  }, [themeOverrides]);

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
