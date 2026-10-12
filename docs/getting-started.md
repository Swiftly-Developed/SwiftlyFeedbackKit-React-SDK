# Getting started with the React Native SDK

This guide matches the source in this repository (`feedbackkit-react-native` **1.2.2**). The checked copy of every snippet is [`snippets/getting-started.tsx`](snippets/getting-started.tsx). From `SwiftlyFeedbackKit-RN/`:

```bash
npx tsc -p tsconfig.snippets.json --noEmit
```

## What you can install today

`npm install feedbackkit-react-native` resolves **1.0.1** (9 February 2026). `feedbackkit-js` on npm is also **1.0.1**.

| | Version | Surface |
|---|---|---|
| This repository, `dev` | 1.2.2 | Provider, list, `SubmitFeedbackView`, `FeedbackDetailView`, metrics hooks, `FeedbackSort`, locale overrides, `bearerToken` for admin replies |
| npm `feedbackkit-react-native` | 1.0.1 | `FeedbackProvider`, list, card, vote button, badges, and the hooks (`submit`, `isAdding`, `vote` with `email` and `notifyStatusChange`). No submit or detail view, no `sortBy` / `FeedbackSort`, no locale props, no `bearerToken`, no metrics hooks |
| npm `feedbackkit-js` | 1.0.1 | No `client.metrics` and no `FeedbackSort`. Metrics hooks need `feedbackkit-js` >= 1.2.0, which is not published. The peer range stays `^1.0.0` |
| [SwiftlyFeedbackKit-React-SDK](https://github.com/Swiftly-Developed/SwiftlyFeedbackKit-React-SDK) | `main` 1.1.1 (16 August 2026), `dev` 1.1.0 (15 April 2026) | Not the same tree. `main` has the submit and detail views and locale props. It does not export the metrics hooks |

There is no sample app in this package. The snippet file above is the example.

## Install

The React Native package is a UI layer on `feedbackkit-js`, and it stores the user id in AsyncStorage. Install all three:

```bash
npm install feedbackkit-react-native feedbackkit-js @react-native-async-storage/async-storage
```

Peers: `feedbackkit-js` ^1.0.0, React >= 18, React Native >= 0.70, AsyncStorage >= 1.17. On a bare React Native app, run pod install so AsyncStorage's iOS side is linked. This package is TypeScript and React Native primitives.

## Provider

Wrap the tree that contains feedback screens. `apiKey` and `children` are required. There is no `projectId` prop. The component name is `FeedbackProvider`.

```tsx
import { FeedbackProvider } from 'feedbackkit-react-native';

export function App({ userId }: { userId: string | undefined }) {
  return (
    <FeedbackProvider
      apiKey="sf_your_api_key"
      userId={userId}
      locale="es"
      translations={{ 'feedback.list.empty': 'No requests yet' }}
      theme={{ primaryColor: '#6366F1' }}
    >
      {/* navigation */}
    </FeedbackProvider>
  );
}
```

| Prop | Required | Role |
|---|---|---|
| `apiKey` | yes | Project API key. Sent as `X-API-Key` |
| `children` | yes | The subtree |
| `userId` | no | Current user. Persisted to AsyncStorage under `@feedbackkit/userId` |
| `baseUrl` | no | Defaults to the hosted API. `https` is required; `http` is only allowed for localhost |
| `theme` | no | Partial theme, or the exported `darkTheme` |
| `locale` | no | Overrides device locale detection. Applied before children render |
| `translations` | no | String overrides, keyed by the catalog ids |
| `bearerToken` | no | Server credential for admin replies. Leave it unset in an end-user app |

`useFeedbackKit()` returns the `feedbackkit-js` client. `useFeedbackKitContext()` returns `{ client, userId, setUserId, theme, isInitialized, canPostAdminReply }`. `canPostAdminReply` is true only when `bearerToken` was passed. The token itself stays on the client.

Read the API key from your build config. Use a separate project, and therefore a separate key, for debug builds. Regenerating a key invalidates every shipped build still using the old one.

## User id and anonymous ids

Voting, submitting, and commenting throw until the provider has a user id:

`User ID is required to vote. Set userId in FeedbackProvider.`

The same sentence is used for submit and comment. That throw happens before the request, so the hook's `error` state is not set for vote and submit. `useComments` stores it on `addError`. Catch the call.

The provider does not mint an id. It loads `@feedbackkit/userId` from AsyncStorage when you omit `userId`, and it writes whatever you pass as `userId` or to `setUserId`. A `userId` prop that arrives while that read is in flight is kept; the stored value does not replace it.

Generate one stable id for anonymous users and keep it. A new id on each launch lets the same person vote twice.

```tsx
import { useEffect } from 'react';
import { useFeedbackKitContext } from 'feedbackkit-react-native';

export function useEnsureUserId(): void {
  const { userId, setUserId, isInitialized } = useFeedbackKitContext();

  useEffect(() => {
    if (isInitialized && !userId) {
      setUserId(createStableAnonymousId());
    }
  }, [isInitialized, setUserId, userId]);
}
```

`createStableAnonymousId` should return a string you can store, conventionally `local_` plus a UUID. `setUserId` writes AsyncStorage.

The underlying `feedbackkit-js` client can mint `local_<uuid>` when a direct client call omits `userId`. On React Native that value lives in memory: there is no `localStorage`, and the provider clears it when the context id is unset. The hooks do not use that generated id. They require the context id and send it on the request. List and detail reads still run with no id.

After sign-in, call `setUserId` with your account id. `client.users.register({ userId, mrr })` records that id and an optional monthly amount. `mrr` is a number. The register request has no email or name field.

## Feedback list

```tsx
import { FeedbackList, FeedbackCategory, FeedbackSort, FeedbackStatus } from 'feedbackkit-react-native';

type BoardNavigation = {
  navigate: (screen: string, params?: { id: string }) => void;
};

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
```

`filterByStatus={FeedbackStatus.Approved}` hides `pending` items until you approve them. Omit it to show everything the API returns.

`showSortPicker` defaults to true. The chips are votes, newest, oldest, and most commented. The default order is votes. A chip the user taps is kept when you later omit `sortBy`. `emptyComponent` replaces the empty state, including its submit button, so put your own entry point in it. When the list has rows, `showAddButton` renders a trailing add button. A failed refresh keeps the rows and shows the error with retry.

`useFeedbackList` is the same read without the list UI. The filter fields are `status`, `category`, `includeMerged`, and `sort`. There is no `limit`. `setFilter` accepts the next filter or an updater so one field can change without dropping the others.

```tsx
const { feedbacks, isLoading, error, refetch, setFilter } = useFeedbackList({
  status: FeedbackStatus.Approved,
  category: FeedbackCategory.FeatureRequest,
  sort: FeedbackSort.Newest,
});

setFilter((current) => ({ ...current, sort: FeedbackSort.Newest }));
```

npm 1.0.1's filter has `status`, `category`, and `includeMerged` only, and `setFilter` takes an object, not an updater.

## Submit

`SubmitFeedbackView` is the form: category, title, description, optional email, and mailing-list opt-in. Categories are `feature_request`, `bug_report`, `improvement`, and `other`.

```tsx
<SubmitFeedbackView
  initialCategory={FeedbackCategory.FeatureRequest}
  onSubmit={(feedback) => navigation.navigate('FeedbackDetail', { id: feedback.id })}
  onCancel={() => navigation.navigate('Feedback')}
/>
```

The hook is the same write if you draw the inputs yourself. The method is `submit`, and the flag is `isSubmitting`.

```tsx
const { submit, isSubmitting, error, clearError } = useSubmitFeedback();

const created = await submit({
  title,
  description,
  category: FeedbackCategory.FeatureRequest,
  userEmail: email || undefined,
  subscribeToMailingList: email ? true : undefined,
  mailingListEmailTypes: email ? ['operational'] : undefined,
});
```

Mailing-list fields are sent only when `userEmail` is set. The creator is counted as the first voter, so a new item showing one vote is the stored result. On the Free plan the eleventh item in a project still returns successfully, with `isHiddenOverLimit === true`, and later list reads omit it. That cap is not a 402.

npm 1.0.1 has `submit` and does not have `SubmitFeedbackView`.

## Vote, status email, and the button

`VoteButton` votes and unvotes with the provider's user id. It does not collect an email and does not set `notifyStatusChange`. The count updates from the server response, including a later `feedback` prop. Voting is enabled for `pending`, `approved`, `in_progress`, and `testflight`. `completed`, `rejected`, and any unknown status disable the control.

```tsx
<VoteButton feedback={feedback} showCount size="medium" />
```

Opt in to status-change email with `useVote`. `email` and `notifyStatusChange` are both needed for the mail to send. `subscribeToMailingList` is forwarded only when `email` is set.

```tsx
const { vote, unvote, isVoting, error } = useVote();

await vote(feedback.id, {
  email,
  notifyStatusChange: true,
  subscribeToMailingList: true,
  mailingListEmailTypes: ['operational', 'marketing'],
});

await unvote(feedback.id);
```

npm 1.0.1 already accepts `email` and `notifyStatusChange` on `vote`. It does not accept the mailing-list fields.

## Comments

```tsx
const { comments, addComment, isAdding, addError, error } = useComments(feedbackId);

await addComment('Great idea!');
```

`addComment` takes the text, then an optional admin flag. A failed send is stored on `addError` and does not clear `comments`. `error` is the load failure.

`addComment(text, true)` marks an admin reply. The hook throws, and does not call the API, unless the provider was given `bearerToken`. End-user apps leave that prop unset. Do not ship a bearer token inside the app binary.

`FeedbackDetailView` renders the item, the badges, `VoteButton`, and this thread. Pass the non-null object from `useFeedback`:

```tsx
const { feedback, isLoading, error } = useFeedback(feedbackId);
if (isLoading) return <Text>Loading</Text>;
if (error || !feedback) return <Text>Not found</Text>;
return <FeedbackDetailView feedback={feedback} />;
```

npm 1.0.1 has `useComments` and `isAdding`. It does not have `addError`, `FeedbackDetailView`, or `bearerToken`.

## Events

Nothing in the components tracks a view for you. Track through the client. `eventName` and `userId` are required. `properties` values must be strings, finite numbers, or booleans. Objects and arrays throw `ValidationError` before the request.

```tsx
const client = useFeedbackKit();

await client.events.track({
  eventName: SDKEvents.FeedbackList,
  userId,
  properties: { source: 'settings' },
});

await client.events.track({
  eventName: 'checkout_completed',
  userId,
  properties: { step_count: 5 },
});
```

`SDKEvents` is `feedback_list`, `feedback_detail`, and `submit_feedback`. Any other name is a custom event. Custom events are stored on every plan. Below Pro they are not readable: a summary still returns 200 with `meta.eventScope === MetricEventScope.PredefinedOnly`. Three reads have no narrower answer and throw `PaymentRequiredError` with `code === 'METRICS_CUSTOM_EVENTS_REQUIRE_PRO'`: a breakdown whose `dimension` is `MetricDimension.EventName`, a filter that names a custom `eventName`, and `client.metrics.events` / `useMetricsEvents`.

`client.users.register({ userId, mrr })` is separate from events. It updates last-seen and an optional monthly amount.

## Components

| Component | Required props | Notes |
|---|---|---|
| `FeedbackList` | none | `onFeedbackPress`, `filterByStatus`, `filterByCategory`, `sortBy`, `showSortPicker` (default true), `showAddButton`, `onAddPress`, `emptyComponent`, `ListHeaderComponent`, `style`, `contentContainerStyle` |
| `FeedbackCard` | `feedback` | `onPress` receives the `Feedback`. Also `onVoteChange`, `showStatus`, `showCategory`, `showVoteButton`, `showCommentCount`, `style` |
| `VoteButton` | `feedback` | `onVoteChange`, `showCount` (default true), `size` `'small' \| 'medium' \| 'large'`, `style`. Does not send `notifyStatusChange` |
| `SubmitFeedbackView` | none | `onSubmit`, `onCancel`, `initialCategory` (default feature request), `style` |
| `FeedbackDetailView` | `feedback` | `onVoteChange`, `style`. `feedback` is `Feedback`, not `Feedback \| null` |
| `StatusBadge` | `status` | `size` `'small' \| 'medium'` |
| `CategoryBadge` | `category` | `size` `'small' \| 'medium'` |

`FeedbackStatus` is `pending`, `approved`, `in_progress`, `testflight`, `completed`, `rejected`. The last two cannot be voted. `FeedbackCategory` has four values: `feature_request`, `bug_report`, `improvement`, `other`.

## Errors and plan limits

Hook `error` values are `FeedbackKitError` subclasses from `feedbackkit-js`, which this package re-exports. The missing-user-id throw from vote and submit is a plain `Error`, and it is not written to `error`.

| Class | Status | When |
|---|---|---|
| `AuthenticationError` | 401 | Missing or unknown API key |
| `PaymentRequiredError` | 402 | A subscription gate. For metrics, `error.code === 'METRICS_CUSTOM_EVENTS_REQUIRE_PRO'` on the three custom-event reads above |
| `ForbiddenError` | 403 | Archived project, or a vote the status does not allow. `error.code === 'METRICS_MEASURE_REQUIRES_BEARER'` when the measure is bearer-only (`sdk_user_count`, `mrr_sum`, `mrr_average`, `users_with_mrr`) |
| `NotFoundError` | 404 | Unknown id |
| `ConflictError` | 409 | Duplicate vote |
| `ValidationError` | 400 | Rejected payload, including an event property that is not a string, finite number, or boolean |
| `RateLimitError` | 429 | `retryAfterSeconds` is set when the server sent `Retry-After`. Metrics allows 60 requests / 60 seconds. The client does not retry |
| `NetworkError` | 0 | The request never completed |
| `ServerError` | 5xx | The server failed |

The Free feedback cap (10 items in a project) does not use 402. `submit` resolves and `isHiddenOverLimit` is true on that item. Project count, members, and integrations are enforced with 402 on their own routes; this SDK does not call those routes.

Metrics windows are Free 30 days, Pro 90 days, and Team 365 days. A wider `days` or date pair is clamped. The hook still resolves, `error` stays null, and `meta.retentionClamped` / `meta.retentionWindowDays` say what the server applied. Read those fields. A second request for the already-clamped window returns `retentionClamped: false`.

The 1.2.0 changelog records that on 25 August 2026 the development API served these routes and the testflight and production APIs answered 404 for `/api/v1/metrics/summary`. This documentation pass did not re-check those hosts.

```tsx
if (error instanceof PaymentRequiredError && error.code === 'METRICS_CUSTOM_EVENTS_REQUIRE_PRO') {
  // Custom event reads need Pro. The events are already stored.
} else if (error instanceof AuthenticationError) {
  // Key missing, wrong, or regenerated.
} else if (error instanceof NetworkError) {
  // The request never reached the API. CORS is a browser rule and does not apply here.
}
```

The metrics hook reference, including the event feed's two meta blocks (`events.meta` for pages, `events.metrics` for the window), is in the [README](../README.md#usemetrics).
