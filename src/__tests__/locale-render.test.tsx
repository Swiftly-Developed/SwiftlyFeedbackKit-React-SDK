import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { FeedbackProvider } from '../provider';
import { clearOverrideStrings, setLocale, t } from '../i18n';

function Probe() {
  return <Text testID="empty">{t('feedback.list.empty')}</Text>;
}

afterEach(() => {
  setLocale('en');
  clearOverrideStrings();
});

describe('FeedbackProvider locale', () => {
  it('translates the first paint when locale is set', () => {
    render(
      <FeedbackProvider apiKey="sf_test" locale="de">
        <Probe />
      </FeedbackProvider>
    );

    expect(screen.getByTestId('empty').props.children).toBe('Noch kein Feedback');
  });

  it('applies a locale change on the render that receives it', () => {
    const view = render(
      <FeedbackProvider apiKey="sf_test" locale="en">
        <Probe />
      </FeedbackProvider>
    );
    expect(screen.getByTestId('empty').props.children).toBe('No feedback yet');

    view.rerender(
      <FeedbackProvider apiKey="sf_test" locale="de">
        <Probe />
      </FeedbackProvider>
    );

    expect(screen.getByTestId('empty').props.children).toBe('Noch kein Feedback');
  });

  it('applies translation overrides on the first paint', () => {
    render(
      <FeedbackProvider
        apiKey="sf_test"
        translations={{ 'feedback.list.empty': 'Nothing here' }}
      >
        <Probe />
      </FeedbackProvider>
    );

    expect(screen.getByTestId('empty').props.children).toBe('Nothing here');
  });
});
