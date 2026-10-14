/**
 * Typechecked copy of the snippets in docs/getting-started.md and the README.
 * Run `npx tsc -p tsconfig.snippets.json --noEmit` from this package.
 */
import React from 'react';
import { Button, Text, View } from 'react-native';
import {
  AuthenticationError,
  CategoryBadge,
  Feedback,
  FeedbackCard,
  FeedbackCategory,
  FeedbackDetailView,
  FeedbackKitTheme,
  FeedbackList,
  FeedbackProvider,
  FeedbackSort,
  FeedbackStatus,
  ForbiddenError,
  MetricDimension,
  MetricEventScope,
  MetricMeasure,
  NetworkError,
  PaymentRequiredError,
  RateLimitError,
  SDKEvents,
  StatusBadge,
  SubmitFeedbackView,
  ValidationError,
  VoteButton,
  darkTheme,
  metricValue,
  useComments,
  useFeedback,
  useFeedbackKit,
  useFeedbackKitContext,
  useFeedbackList,
  useMetrics,
  useMetricsEvents,
  useSubmitFeedback,
  useVote,
} from 'feedbackkit-react-native';

type BoardNavigation = {
  navigate: (screen: string, params?: { id: string }) => void;
};

export function App({ userId }: { userId: string | undefined }) {
  return (
    <FeedbackProvider
      apiKey="sf_your_api_key"
      userId={userId}
      locale="es"
      translations={{ 'feedback.list.empty': 'No requests yet' }}
      theme={{ primaryColor: '#6366F1' }}
    >
      <View />
    </FeedbackProvider>
  );
}

export function DarkApp() {
  return (
    <FeedbackProvider apiKey="sf_your_api_key" theme={darkTheme}>
      <View />
    </FeedbackProvider>
  );
}

/** End-user apps omit bearerToken. An admin tool passes a server credential. */
export function AdminReplyHost({ bearerToken }: { bearerToken: string }) {
  return (
    <FeedbackProvider apiKey="sf_your_api_key" bearerToken={bearerToken} userId="admin_1">
      <View />
    </FeedbackProvider>
  );
}

function createStableAnonymousId(): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `local_${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function useEnsureUserId(): void {
  const { userId, setUserId, isInitialized } = useFeedbackKitContext();

  React.useEffect(() => {
    if (isInitialized && !userId) {
      setUserId(createStableAnonymousId());
    }
  }, [isInitialized, setUserId, userId]);
}

export function FeedbackScreen({ navigation }: { navigation: BoardNavigation }) {
  return (
    <FeedbackList
      filterByStatus={FeedbackStatus.Approved}
      filterByCategory={FeedbackCategory.FeatureRequest}
      sortBy={FeedbackSort.Votes}
      showAddButton
      onAddPress={() => navigation.navigate('SubmitFeedback')}
      onFeedbackPress={(feedback) => navigation.navigate('FeedbackDetail', { id: feedback.id })}
    />
  );
}

export function useBoard() {
  const { feedbacks, isLoading, error, refetch, setFilter } = useFeedbackList({
    status: FeedbackStatus.Approved,
    category: FeedbackCategory.FeatureRequest,
    sort: FeedbackSort.Newest,
  });

  const showNewest = () => {
    setFilter((current) => ({ ...current, sort: FeedbackSort.Newest }));
  };

  return { feedbacks, isLoading, error, refetch, showNewest };
}

export function SubmitScreen({ navigation }: { navigation: BoardNavigation }) {
  return (
    <SubmitFeedbackView
      initialCategory={FeedbackCategory.FeatureRequest}
      onSubmit={(feedback) => navigation.navigate('FeedbackDetail', { id: feedback.id })}
      onCancel={() => navigation.navigate('Feedback')}
    />
  );
}

export function useCustomSubmit(navigation: BoardNavigation) {
  const { submit, isSubmitting, error, clearError } = useSubmitFeedback();

  const onSubmit = async (title: string, description: string, email: string) => {
    clearError();
    const created = await submit({
      title,
      description,
      category: FeedbackCategory.FeatureRequest,
      userEmail: email || undefined,
      subscribeToMailingList: email ? true : undefined,
      mailingListEmailTypes: email ? ['operational'] : undefined,
    });
    navigation.navigate('FeedbackDetail', { id: created.id });
    return created.isHiddenOverLimit === true;
  };

  return { onSubmit, isSubmitting, error };
}

export function DetailScreen({ feedbackId }: { feedbackId: string }) {
  const { feedback, isLoading, error } = useFeedback(feedbackId);
  if (isLoading) return <Text>Loading</Text>;
  if (error || !feedback) return <Text>Not found</Text>;
  return <FeedbackDetailView feedback={feedback} />;
}

export function VoteRow({ feedbackId, email }: { feedbackId: string; email: string }) {
  const { feedback } = useFeedback(feedbackId);
  const { vote, unvote, isVoting, error } = useVote();

  const onVote = async () => {
    if (!feedback) return;
    if (feedback.hasVoted) {
      await unvote(feedback.id);
      return;
    }
    await vote(feedback.id, {
      email,
      notifyStatusChange: true,
      subscribeToMailingList: true,
      mailingListEmailTypes: ['operational', 'marketing'],
    });
  };

  if (!feedback) return null;

  return (
    <View>
      <VoteButton feedback={feedback} showCount size="medium" />
      <Button title={isVoting ? 'Voting' : 'Vote and email me'} onPress={() => void onVote()} />
      {error ? <Text>{error.message}</Text> : null}
    </View>
  );
}

export function Comments({ feedbackId }: { feedbackId: string }) {
  const { comments, addComment, isAdding, addError, error } = useComments(feedbackId);

  const send = async (text: string) => {
    await addComment(text);
  };

  return (
    <View>
      {comments.map((comment) => (
        <Text key={comment.id}>{comment.content}</Text>
      ))}
      <Button title={isAdding ? 'Sending' : 'Comment'} onPress={() => void send('Great idea!')} />
      {addError ? <Text>{addError.message}</Text> : null}
      {error ? <Text>{error.message}</Text> : null}
    </View>
  );
}

export function useTrackBoard(userId: string): void {
  const client = useFeedbackKit();

  React.useEffect(() => {
    void client.events.track({
      eventName: SDKEvents.FeedbackList,
      userId,
      properties: { source: 'settings' },
    });
  }, [client, userId]);
}

export function trackCustom(userId: string) {
  const client = useFeedbackKit();
  return client.events.track({
    eventName: 'checkout_completed',
    userId,
    properties: { step_count: 5 },
  });
}

export function MetricsSummary() {
  const { summary, isLoading, error, refetch } = useMetrics({
    measures: [MetricMeasure.FeedbackCount, MetricMeasure.EventCount],
    days: 7,
  });

  if (isLoading) return <Text>Loading</Text>;
  if (error) return <PlanError error={error} onRetry={() => void refetch()} />;
  if (!summary) return null;

  const items = metricValue(summary.values, MetricMeasure.FeedbackCount) ?? 0;
  return (
    <View>
      <Text>{items}</Text>
      {summary.meta.eventScope === MetricEventScope.PredefinedOnly ? (
        <Text>Custom events are not readable on this plan.</Text>
      ) : null}
      {summary.meta.retentionClamped ? (
        <Text>Showing the last {summary.meta.retentionWindowDays} days.</Text>
      ) : null}
    </View>
  );
}

export function MetricsFeed() {
  const { events, error } = useMetricsEvents({
    measures: [MetricMeasure.EventCount],
    days: 7,
    page: 1,
    perPage: 50,
  });

  if (error) return <PlanError error={error} />;
  if (!events) return null;

  const scope = events.metrics.eventScope;
  const hasNextPage = events.meta.page < events.meta.totalPages;
  return (
    <Text>
      {scope} {hasNextPage ? 'more' : 'end'}
    </Text>
  );
}

export function PlanError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof PaymentRequiredError && error.code === 'METRICS_CUSTOM_EVENTS_REQUIRE_PRO') {
    return <Text>Custom event reads need Pro.</Text>;
  }
  if (error instanceof AuthenticationError) {
    return <Text>Check the API key.</Text>;
  }
  if (error instanceof ForbiddenError && error.code === 'METRICS_MEASURE_REQUIRES_BEARER') {
    return <Text>That measure needs a bearer token.</Text>;
  }
  if (error instanceof RateLimitError) {
    return <Text>Try again in {error.retryAfterSeconds ?? 60} seconds.</Text>;
  }
  if (error instanceof NetworkError) {
    return <Text>The request never reached the API.</Text>;
  }
  if (error instanceof ValidationError) {
    return <Text>{error.message}</Text>;
  }
  return <Button title="Retry" onPress={onRetry} />;
}

const sampleFeedback: Feedback = {
  id: '1',
  title: 'Dark mode',
  description: 'Please add dark mode',
  status: FeedbackStatus.Approved,
  category: FeedbackCategory.FeatureRequest,
  userId: 'user_12345',
  voteCount: 1,
  hasVoted: false,
  commentCount: 0,
  createdAt: '2026-10-12T00:00:00Z',
  updatedAt: '2026-10-12T00:00:00Z',
};

function CustomEmptyView() {
  return <Text>Empty</Text>;
}

function Header() {
  return <Text>Header</Text>;
}

export function ReadmeComponents() {
  return (
    <View>
      <FeedbackList
        onFeedbackPress={(feedback) => feedback.id}
        filterByStatus={FeedbackStatus.Approved}
        filterByCategory={FeedbackCategory.FeatureRequest}
        showAddButton
        onAddPress={() => undefined}
        emptyComponent={<CustomEmptyView />}
        ListHeaderComponent={<Header />}
      />
      <FeedbackCard
        feedback={sampleFeedback}
        onPress={(item) => item.id}
        showStatus
        showCategory
        showVoteButton
        showCommentCount
      />
      <VoteButton
        feedback={sampleFeedback}
        onVoteChange={(hasVoted, voteCount) => `${hasVoted}${voteCount}`}
        showCount
        size="medium"
      />
      <StatusBadge status={FeedbackStatus.Approved} size="medium" />
      <CategoryBadge category={FeedbackCategory.FeatureRequest} size="medium" />
      <SubmitFeedbackView
        initialCategory={FeedbackCategory.BugReport}
        onSubmit={(feedback) => feedback.id}
        onCancel={() => undefined}
      />
      <FeedbackDetailView
        feedback={sampleFeedback}
        onVoteChange={(hasVoted, voteCount) => `${hasVoted}${voteCount}`}
      />
    </View>
  );
}

const customTheme: FeedbackKitTheme = {
  primaryColor: '#F59E0B',
  backgroundColor: '#1F2937',
  cardBackgroundColor: '#374151',
  textColor: '#F9FAFB',
  secondaryTextColor: '#9CA3AF',
  borderColor: '#4B5563',
  errorColor: '#EF4444',
  successColor: '#10B981',
  borderRadius: 12,
  spacing: 16,
};

export function CustomTheme() {
  return (
    <FeedbackProvider apiKey="sf_your_api_key" theme={customTheme}>
      <View />
    </FeedbackProvider>
  );
}

export function ReadmeErrors() {
  const { feedbacks, error, isLoading } = useFeedbackList();
  if (error instanceof AuthenticationError) {
    return <Text>401</Text>;
  }
  if (error instanceof PaymentRequiredError && error.code === 'METRICS_CUSTOM_EVENTS_REQUIRE_PRO') {
    return <Text>402</Text>;
  }
  if (error instanceof ForbiddenError) {
    return <Text>403</Text>;
  }
  if (error instanceof RateLimitError) {
    return <Text>{error.retryAfterSeconds ?? 0}</Text>;
  }
  if (error instanceof NetworkError) {
    return <Text>network</Text>;
  }
  if (error instanceof ValidationError) {
    return <Text>{error.message}</Text>;
  }
  return (
    <Text>
      {isLoading ? 'loading' : 'ready'} {feedbacks.length}
    </Text>
  );
}

export function breakdownOptions() {
  return {
    measures: [MetricMeasure.EventCount],
    dimension: MetricDimension.EventName,
    days: 30,
  };
}
