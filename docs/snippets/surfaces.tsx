/**
 * Typechecked copy of the React Native snippets in the website docs,
 * the blog guide, and the Flutter/React Native draft.
 * Run `npx tsc -p tsconfig.snippets.json --noEmit` from this package.
 */
import React, { useEffect, useState } from 'react';
import { Button, Text, TextInput, View } from 'react-native';
import {
  AuthenticationError,
  FeedbackCategory,
  FeedbackDetailView,
  FeedbackList,
  FeedbackProvider,
  FeedbackStatus,
  MetricMeasure,
  NetworkError,
  PaymentRequiredError,
  StatusBadge,
  SubmitFeedbackView,
  ValidationError,
  VoteButton,
  useComments,
  useFeedback,
  useFeedbackKitContext,
  useFeedbackList,
  useMetrics,
  useMetricsEvents,
  useSubmitFeedback,
  useVote,
} from 'feedbackkit-react-native';

type BoardNavigation = {
  navigate: (screen: string, params?: { id: string }) => void;
  goBack: () => void;
};

const FEEDBACK_API_KEY = 'sf_your_api_key';

function useCurrentUser(): { id: string } | undefined {
  return undefined;
}

function RootNavigator() {
  return null;
}

function NavigationContainer({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function BlogApp() {
  const user = useCurrentUser();

  return (
    <FeedbackProvider apiKey={FEEDBACK_API_KEY} userId={user?.id} theme={{ primaryColor: '#6366F1' }}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </FeedbackProvider>
  );
}

export function BlogFeedbackScreen({ navigation }: { navigation: BoardNavigation }) {
  return (
    <FeedbackList
      filterByStatus={FeedbackStatus.Approved}
      showAddButton
      onAddPress={() => navigation.navigate('SubmitFeedback')}
      onFeedbackPress={(feedback) => navigation.navigate('FeedbackDetail', { id: feedback.id })}
    />
  );
}

export function BlogSubmitScreen({ navigation }: { navigation: BoardNavigation }) {
  const { submit, isSubmitting, error } = useSubmitFeedback();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');

  const onSubmit = async () => {
    const created = await submit({
      title,
      description,
      category: FeedbackCategory.FeatureRequest,
      userEmail: email || undefined,
    });
    if (created.isHiddenOverLimit) {
      return;
    }
    navigation.navigate('FeedbackDetail', { id: created.id });
  };

  return (
    <View>
      <TextInput value={title} onChangeText={setTitle} />
      <TextInput value={description} onChangeText={setDescription} />
      <TextInput value={email} onChangeText={setEmail} />
      <Button
        title={error ? error.message : 'Submit'}
        onPress={() => {
          void onSubmit();
        }}
        disabled={isSubmitting || title.length === 0}
      />
    </View>
  );
}

export function BlogSubmitView({ navigation }: { navigation: BoardNavigation }) {
  return (
    <SubmitFeedbackView
      initialCategory={FeedbackCategory.FeatureRequest}
      onSubmit={(feedback) => navigation.navigate('FeedbackDetail', { id: feedback.id })}
      onCancel={() => navigation.navigate('Feedback')}
    />
  );
}

export function BlogDetail({ route }: { route: { params: { id: string } } }) {
  const { feedback, isLoading, error } = useFeedback(route.params.id);
  const { comments, addComment, isAdding, addError } = useComments(route.params.id);

  if (isLoading) return <Text>Loading</Text>;
  if (error || !feedback) return <Text>Not found</Text>;

  return (
    <View>
      <StatusBadge status={feedback.status} />
      <VoteButton feedback={feedback} showCount />
      <Text>
        {comments.length} comments, adding: {isAdding ? 'yes' : 'no'}
      </Text>
      <Text>{addError ? addError.message : ''}</Text>
      <Button
        title="Comment"
        onPress={() => {
          void addComment('Great idea!');
        }}
      />
    </View>
  );
}

export function BlogPrebuiltDetail({ route }: { route: { params: { id: string } } }) {
  const { feedback, isLoading, error } = useFeedback(route.params.id);
  if (isLoading) return <Text>Loading</Text>;
  if (error || !feedback) return <Text>Not found</Text>;
  return <FeedbackDetailView feedback={feedback} />;
}

export function BlogVoteWithEmail({ feedbackId, email }: { feedbackId: string; email: string }) {
  const { vote, isVoting } = useVote();

  const onPress = async () => {
    await vote(feedbackId, {
      email,
      notifyStatusChange: true,
      subscribeToMailingList: true,
      mailingListEmailTypes: ['operational'],
    });
  };

  return (
    <Button
      title={isVoting ? 'Voting' : 'Vote and email me'}
      onPress={() => {
        void onPress();
      }}
    />
  );
}

export function BlogBoardState(feedbackId: string) {
  const { feedbacks, isLoading, error, refetch, filter, setFilter } = useFeedbackList({
    category: FeedbackCategory.FeatureRequest,
  });
  const { submit, isSubmitting, error: submitError, clearError } = useSubmitFeedback();
  const { vote, unvote, isVoting } = useVote();
  const { comments, addComment, isAdding } = useComments(feedbackId);

  return {
    feedbacks,
    isLoading,
    error,
    refetch,
    filter,
    setFilter,
    submit,
    isSubmitting,
    submitError,
    clearError,
    vote,
    unvote,
    isVoting,
    comments,
    addComment,
    isAdding,
  };
}

function createStableAnonymousId(): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `local_${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function useEnsureUserId(): void {
  const { userId, setUserId, isInitialized } = useFeedbackKitContext();

  useEffect(() => {
    if (isInitialized && !userId) {
      setUserId(createStableAnonymousId());
    }
  }, [isInitialized, setUserId, userId]);
}

export function classifyListError() {
  const { feedbacks, error } = useFeedbackList();

  if (error instanceof AuthenticationError) {
    return 'auth';
  }
  if (error instanceof NetworkError) {
    return 'network';
  }
  if (error instanceof ValidationError) {
    return 'validation';
  }
  return String(feedbacks.length);
}

export function SiteMetrics() {
  const { summary, error } = useMetrics({
    measures: [MetricMeasure.FeedbackCount, MetricMeasure.EventCount],
    days: 7,
  });
  return <Text>{error ? error.message : summary ? 'ready' : 'empty'}</Text>;
}

export function SiteEventFeed() {
  const { error } = useMetricsEvents({
    measures: [MetricMeasure.EventCount],
    days: 7,
  });

  if (error instanceof AuthenticationError) {
    return <Text>401</Text>;
  }
  if (error instanceof PaymentRequiredError && error.code === 'METRICS_CUSTOM_EVENTS_REQUIRE_PRO') {
    return <Text>402</Text>;
  }
  if (error instanceof NetworkError) {
    return <Text>network</Text>;
  }
  return null;
}

export function DraftFeatureRequests({ navigation }: { navigation: BoardNavigation }) {
  return (
    <FeedbackList
      filterByCategory={FeedbackCategory.FeatureRequest}
      onFeedbackPress={(item) => navigation.navigate('FeatureRequest', { id: item.id })}
      showAddButton
      onAddPress={() => navigation.navigate('NewFeatureRequest')}
    />
  );
}

export function DraftNewRequest({ navigation }: { navigation: BoardNavigation }) {
  const { submit, isSubmitting, error } = useSubmitFeedback();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');

  const onSubmit = async () => {
    await submit({
      title,
      description,
      category: FeedbackCategory.FeatureRequest,
      userEmail: email || undefined,
    });
    navigation.goBack();
  };

  return (
    <View>
      <TextInput value={title} onChangeText={setTitle} placeholder="What should we build?" />
      <TextInput value={description} onChangeText={setDescription} placeholder="Why do you need it?" multiline />
      <TextInput value={email} onChangeText={setEmail} placeholder="Email (optional, for updates)" />
      <Button title="Submit" onPress={() => void onSubmit()} disabled={isSubmitting || !title} />
      {error ? <Text>{error.message}</Text> : null}
    </View>
  );
}

export function DraftDetail({ route }: { route: { params: { id: string } } }) {
  const { id } = route.params;
  const { feedback, isLoading } = useFeedback(id);
  const { comments, addComment, isAdding } = useComments(id);

  if (isLoading || !feedback) return null;

  return (
    <View>
      <Text>{feedback.title}</Text>
      <StatusBadge status={feedback.status} />
      <Text>{feedback.description}</Text>
      <VoteButton feedback={feedback} showCount />
      {comments.map((comment) => (
        <Text key={comment.id}>{comment.content}</Text>
      ))}
      <Button title={isAdding ? 'Sending' : 'Comment'} onPress={() => void addComment('Looks good')} />
    </View>
  );
}

export function DraftVote({ feedbackId, email }: { feedbackId: string; email: string }) {
  const { vote } = useVote();
  return (
    <Button
      title="Notify me"
      onPress={() => {
        void vote(feedbackId, { email, notifyStatusChange: true });
      }}
    />
  );
}
