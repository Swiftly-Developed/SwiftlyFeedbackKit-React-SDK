import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { FeedbackProvider, useFeedbackKitContext } from '../provider';

/**
 * `QA-UNIT10-SDK-PARITY` — RN provider wiring, repaired 2026-08-15.
 *
 * ⚠️ Until this repair, both RN component suites were red for a reason that had nothing
 * to do with any assertion: they imported a `FeedbackKitProvider` that `provider.tsx`
 * has never exported (the real export is `FeedbackProvider`), so React received
 * `undefined` as an element type. They also passed a `projectId` prop that is not in
 * `FeedbackProviderProps`, asserted an error message that does not match
 * `provider.tsx`, and expected a `loadingComponent` prop the provider does not have —
 * the provider renders its children immediately and flips `isInitialized` after the
 * mount effect. Every case below is written against the shipped API surface.
 */

// Test component that uses the context
function TestConsumer() {
  const { client, theme, isInitialized } = useFeedbackKitContext();
  return (
    <Text testID="status">
      {isInitialized ? 'initialized' : 'loading'}
      {client ? '-has-client' : '-no-client'}
      {theme ? '-has-theme' : '-no-theme'}
    </Text>
  );
}

describe('FeedbackProvider', () => {
  it('provides context to children', async () => {
    const { getByTestId } = render(
      <FeedbackProvider apiKey="test-key">
        <TestConsumer />
      </FeedbackProvider>
    );

    await waitFor(() => {
      const status = getByTestId('status');
      expect(status.props.children.join('')).toContain('initialized');
      expect(status.props.children.join('')).toContain('has-client');
      expect(status.props.children.join('')).toContain('has-theme');
    });
  });

  it('exposes client and theme synchronously, before initialization completes', () => {
    // The provider has no loading gate: children render immediately, with the client and
    // theme already in context, and only `isInitialized` is deferred to the mount effect.
    const { getByTestId } = render(
      <FeedbackProvider apiKey="test-key">
        <TestConsumer />
      </FeedbackProvider>
    );

    const status = getByTestId('status');
    const rendered = status.props.children.join('');
    expect(rendered).toContain('has-client');
    expect(rendered).toContain('has-theme');
  });

  it('throws error when context is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestConsumer />);
    }).toThrow('useFeedbackKitContext must be used within a FeedbackProvider');

    consoleSpy.mockRestore();
  });
});
