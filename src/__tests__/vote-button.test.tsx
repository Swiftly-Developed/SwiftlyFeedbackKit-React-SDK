import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Feedback, FeedbackCategory, FeedbackStatus } from 'feedbackkit-js';
import { FeedbackProvider } from '../provider';
import { VoteButton } from '../components/VoteButton';

function item(overrides: Partial<Feedback> = {}): Feedback {
  return {
    id: 'fb-1',
    title: 'Dark mode',
    description: 'Please',
    status: FeedbackStatus.Pending,
    category: FeedbackCategory.FeatureRequest,
    userId: 'user-1',
    voteCount: 1,
    hasVoted: false,
    commentCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderButton(feedback: Feedback) {
  return render(
    <FeedbackProvider apiKey="sf_test" userId="user-1">
      <VoteButton feedback={feedback} />
    </FeedbackProvider>
  );
}

describe('VoteButton', () => {
  it('shows the vote count from a later feedback prop', () => {
    const view = renderButton(item({ voteCount: 1, hasVoted: false }));
    expect(screen.getByText('1')).toBeTruthy();

    view.rerender(
      <FeedbackProvider apiKey="sf_test" userId="user-1">
        <VoteButton feedback={item({ voteCount: 4, hasVoted: true })} />
      </FeedbackProvider>
    );

    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.queryByText('1')).toBeNull();
  });

  it.each([
    FeedbackStatus.Pending,
    FeedbackStatus.Approved,
    FeedbackStatus.InProgress,
    FeedbackStatus.TestFlight,
  ])('allows voting when status is %s', (status) => {
    renderButton(item({ status }));
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it.each([FeedbackStatus.Completed, FeedbackStatus.Rejected, 'scheduled' as FeedbackStatus])(
    'refuses voting when status is %s',
    (status) => {
      renderButton(item({ status }));
      expect(screen.getByRole('button')).toBeDisabled();
    }
  );

  it('names the control for assistive technology', () => {
    renderButton(item({ voteCount: 3, hasVoted: false }));
    expect(screen.getByRole('button', { name: 'Vote, 3' })).toBeEnabled();
  });
});
