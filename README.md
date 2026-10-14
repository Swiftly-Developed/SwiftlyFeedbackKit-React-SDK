# FeedbackKit React Native SDK

> **Source version 2.1.0.** This README matches `package.json` in this repository. `npm install feedbackkit-react-native` still resolves **1.0.1** (9 February 2026), and npm `feedbackkit-js` is **1.0.1** as well. 1.0.1 has `FeedbackProvider` (no `projectId` prop), `submit`, `isAdding`, and `vote` with `email` and `notifyStatusChange`. It has the list, card, vote button, and badges. It does not include `SubmitFeedbackView`, `FeedbackDetailView`, metrics hooks, `FeedbackSort`, `sortBy`, locale props, or `bearerToken`, and it does not mint an anonymous user id. Samples that use those 2.1.0 APIs will not compile against 1.0.1.
>
> Metrics hooks need `feedbackkit-js` >= 2.1.0 (`client.metrics`). That release is not on npm. The peer range is `>=1.0.0`, so an app that only uses the feedback hooks can stay on 1.0.1, and 2.1.0 of `feedbackkit-js` is accepted.
>
> The public repository [SwiftlyFeedbackKit-React-SDK](https://github.com/Swiftly-Developed/SwiftlyFeedbackKit-React-SDK) has this tree on `main` and as tag **2.1.0** (14 October 2026). Its earlier tag **1.2.0** (14 October 2026) includes the submit and detail views and locale props, and does not export the metrics hooks. Its `dev` branch is a stale, untagged sync (package version 1.2.2, 12 October 2026).
>
> Walkthrough: [docs/getting-started.md](docs/getting-started.md). The snippets in [docs/snippets/getting-started.tsx](docs/snippets/getting-started.tsx) are typechecked with `npx tsc -p tsconfig.snippets.json --noEmit`. There is no sample app in this package.

A complete React Native SDK for integrating FeedbackKit into your mobile apps. Built with TypeScript, providing ready-to-use components and hooks for collecting user feedback.

## Features

- **Ready-to-use Components**: `FeedbackList`, `SubmitFeedbackView`, `FeedbackDetailView`, `VoteButton`, and more
- **React Hooks**: `useFeedbackList`, `useVote`, `useSubmitFeedback`, `useComments`, `useMetrics`, and the other metrics reads
- **Theming and locales**: Light and dark themes, device locale detection, and string overrides
- **TypeScript**: Full type safety, including the `feedbackkit-js` client re-exported from this package
- **Voting**: The vote button updates from the server response and from a later `feedback` prop. Status-change email is `useVote`, not the button
- **Pull-to-Refresh**: Built-in refresh support

## Installation

```bash
npm install feedbackkit-react-native feedbackkit-js @react-native-async-storage/async-storage
```

### Peer Dependencies

This package requires the following peer dependencies:

```json
{
  "feedbackkit-js": "^1.0.0",
  "react": ">=18.0.0",
  "react-native": ">=0.70.0",
  "@react-native-async-storage/async-storage": ">=1.17.0"
}
```

> **`useMetrics`, `useMetricsTimeseries`, `useMetricsBreakdown`, and `useMetricsEvents` call `client.metrics`.**
> That API is in `feedbackkit-js` >= 2.1.0. npm still serves `feedbackkit-js@1.0.1`, which does not have it.
> The other hooks and components typecheck against `feedbackkit-js` 1.x. `FeedbackSort` and `sortBy` also need client types that npm 1.0.1 does not have.

## Quick Start

### 1. Wrap your app with the provider

```tsx
import { FeedbackProvider } from 'feedbackkit-react-native';

function App() {
  return (
    <FeedbackProvider apiKey="your-api-key" userId="user_12345">
      <YourApp />
    </FeedbackProvider>
  );
}
```

### 2. Display the feedback list

```tsx
import { FeedbackList } from 'feedbackkit-react-native';

function FeedbackScreen({
  navigation,
}: {
  navigation: { navigate: (screen: string, params?: { id: string }) => void };
}) {
  return (
    <FeedbackList
      onFeedbackPress={(feedback) =>
        navigation.navigate('FeedbackDetail', { id: feedback.id })
      }
      showAddButton
      onAddPress={() => navigation.navigate('SubmitFeedback')}
    />
  );
}
```

## Components

### FeedbackList

Scrollable list of feedback items with pull-to-refresh.

```tsx
<FeedbackList
  onFeedbackPress={(feedback) => console.log(feedback)}
  filterByStatus={FeedbackStatus.Approved}
  filterByCategory={FeedbackCategory.FeatureRequest}
  showAddButton
  onAddPress={() => {}}
  emptyComponent={<CustomEmptyView />}
  ListHeaderComponent={<Header />}
/>
```

The default style is **Showcase** ([FEEDBACK01](../docs/specs/FEEDBACK01.md), new in 2.1.0). Each card has:

- a status eyebrow
- the full title and description
- the category and comment count
- a vote capsule: tonal when you can vote, filled once you have voted, plain text on completed and rejected items

A Sort & Filter button opens a sheet with sort options and status and category chips. Improvement uses Material's `tune` glyph.

To keep the list as it was before 2.1.0, pass `listStyle="classic"`, either on the list or on `FeedbackProvider`, which applies it to every list:

```tsx
<FeedbackProvider apiKey="..." listStyle="classic" colorScheme="light">
```

| Prop | Default | |
|------|---------|---|
| `listStyle` | provider's, else `'showcase'` | `'showcase'` or `'classic'` |
| `showSortPicker` | `true` | Sort & Filter button (Showcase) or sort chips (Classic) |
| `showStatusFilter` / `showCategoryFilter` | `true` | Filter sections in the sheet. `filterByStatus` / `filterByCategory` fix that filter and hide its section |
| `showStatusBadge` / `showCategoryBadge` / `showCommentCount` / `showVoteCount` | `true` | Card parts |
| `allowUndoVote` | `true` | Whether a second tap removes the vote |

On Android the Showcase list follows Material 3:

- elevated cards on a tonal surface
- ripples
- a filled-tonal vote button
- 48dp targets

On iOS it uses flat grouped cards and 44pt targets. Both platforms:

- scale with the system font size, up to `fontScale` 2.0
- mirror in right-to-left locales
- follow the device's light or dark setting, unless `colorScheme` on `FeedbackProvider` says otherwise

`renderIcon` on the provider swaps in your own icon set.

### FeedbackCard

Card component for displaying a single feedback item.

```tsx
<FeedbackCard
  feedback={feedback}
  onPress={(f) => console.log(f)}
  showStatus
  showCategory
  showVoteButton
  showCommentCount
/>
```

### VoteButton

Button for voting or unvoting. It sends the provider's user id only. It does not collect an email and does not set `notifyStatusChange`. The count updates after the server responds, and a later `feedback` prop replaces that count. Statuses that can be voted are `pending`, `approved`, `in_progress`, and `testflight`.

```tsx
<VoteButton
  feedback={feedback}
  onVoteChange={(hasVoted, voteCount) => console.log(hasVoted, voteCount)}
  showCount
  size="medium" // 'small' | 'medium' | 'large'
/>
```

### StatusBadge

Displays feedback status with appropriate color.

```tsx
<StatusBadge status={FeedbackStatus.Approved} size="medium" />
```

### CategoryBadge

Displays feedback category with appropriate color.

```tsx
<CategoryBadge category={FeedbackCategory.FeatureRequest} size="medium" />
```

### SubmitFeedbackView

Form for a new feedback item: category, title, description, optional email, and mailing-list opt-in.

```tsx
<SubmitFeedbackView
  initialCategory={FeedbackCategory.BugReport}
  onSubmit={(feedback) => console.log(feedback.id)}
  onCancel={() => {}}
/>
```

### FeedbackDetailView

Full feedback item with comments. Pass the `feedback` object from `useFeedback`.

```tsx
<FeedbackDetailView
  feedback={feedback}
  onVoteChange={(hasVoted, voteCount) => console.log(hasVoted, voteCount)}
/>
```

## Hooks

### useFeedbackList

Fetch a list of feedback items.

```tsx
const { feedbacks, isLoading, error, refetch } = useFeedbackList({
  status: FeedbackStatus.Approved,
  category: FeedbackCategory.FeatureRequest
});
```

### useFeedback

Fetch a single feedback item.

```tsx
const { feedback, isLoading, error, refetch } = useFeedback(feedbackId);
```

### useVote

Vote or unvote on feedback.

```tsx
const { vote, unvote, isVoting, error } = useVote();

// Vote
await vote(feedbackId);

// Vote with a status-change email opt-in
await vote(feedbackId, {
  email: 'user@example.com',
  notifyStatusChange: true,
  subscribeToMailingList: true,
  mailingListEmailTypes: ['operational', 'marketing']
});

// Unvote
await unvote(feedbackId);
```

### useComments

Fetch and add comments.

```tsx
const { comments, isLoading, error, addError, addComment, isAdding, refetch } = useComments(feedbackId);

// Add a comment. The argument is the text, not an object.
await addComment('Great idea!');

// Admin reply. Throws, and does not call the API, unless FeedbackProvider
// received bearerToken. Leave that prop unset in an end-user app.
await addComment('Shipped in 2.4.', true);
```

A failed send is stored on `addError` and does not replace `comments`. `error` is the load failure.

### useSubmitFeedback

Submit new feedback.

```tsx
const { submit, isSubmitting, error } = useSubmitFeedback();

const created = await submit({
  title: 'New Feature',
  description: 'Description here',
  category: FeedbackCategory.FeatureRequest,
  userEmail: 'user@example.com',
  subscribeToMailingList: true,
  mailingListEmailTypes: ['operational']
});

// Free plan, eleventh item in the project: the promise resolves and this is true.
// Later list reads omit the row. This is not a 402.
if (created.isHiddenOverLimit) {
  console.log(created.id);
}
```

Mailing-list fields are sent only when `userEmail` is set. The creator is stored as the first voter (`voteCount` starts at 1).

### useFeedbackKit

Access the FeedbackKit client directly.

```tsx
const client = useFeedbackKit();

const feedbacks = await client.feedback.list();
```

### Events

The components do not track views. `useFeedbackKit().events.track` does. `eventName` and `userId` are required. Property values must be strings, finite numbers, or booleans.

```tsx
const client = useFeedbackKit();
const userId = 'user_12345';

await client.events.track({
  eventName: SDKEvents.FeedbackList,
  userId,
  properties: { source: 'settings' }
});

await client.events.track({
  eventName: 'checkout_completed',
  userId,
  properties: { step_count: 5 }
});
```

`SDKEvents` is `feedback_list`, `feedback_detail`, and `submit_feedback`. Any other name is a custom event. Custom events are stored on every plan. Below Pro they are not included in a successful metrics read (`meta.eventScope === 'predefined_only'`). A breakdown by `MetricDimension.EventName`, a custom `eventName` filter, and `useMetricsEvents` throw `PaymentRequiredError` with `code === 'METRICS_CUSTOM_EVENTS_REQUIRE_PRO'` on that plan.

`client.users.register({ userId, mrr })` records the id and an optional monthly amount. It has no email or name field.

### useMetrics

Read a project's aggregate metrics summary. `measures` is required — there is no
default query.

```tsx
const { summary, isLoading, error, refetch, setQuery } = useMetrics({
  measures: [MetricMeasure.FeedbackCount, MetricMeasure.EventCount],
  days: 7
});

if (isLoading) return <ActivityIndicator />;
if (error) return <ErrorView error={error} onRetry={refetch} />;
if (!summary) return null;

// A project with no activity returns ZERO-valued entries, not an absent map, so
// emptiness is a value check rather than a null check on `summary`. The map is also
// sparse — `metricValue` returns `number | undefined`, never assert non-null.
const items = metricValue(summary.values, MetricMeasure.FeedbackCount) ?? 0;
```

Changing the window is `setQuery`; a superseded response that lands after a newer one
is ignored, so dragging a date range cannot leave stale numbers on screen.

#### Reading a narrowed response

A plan that restricts which events are readable, or that narrows the requested window,
returns **200 with a narrower answer** — not an error. The response says what it did,
and `error` stays `null`:

```tsx
{summary.meta.eventScope === MetricEventScope.PredefinedOnly && (
  <Text>Custom events are not readable on this plan.</Text>
)}
{summary.meta.retentionClamped && (
  <Text>Showing the last {summary.meta.retentionWindowDays} days.</Text>
)}
```

Read `retentionWindowDays` from the payload. Do not hardcode a number: the allowance
is the server's to state (Free 30 days, Pro 90, Team 365).

On 14 October 2026 the production API answered 404 for `/api/v1/metrics/summary`, and
the dev and testflight APIs answered 401 (the route exists).

`summary.meta.granularity` is **absent** on this operation — omitted from the response,
never `null` — so a branch on `granularity === null` never fires.

### useMetricsTimeseries

Read the same measures bucketed over the window. `granularity` is optional and defaults
to daily server-side.

```tsx
const { series, isLoading, error, refetch } = useMetricsTimeseries({
  measures: [MetricMeasure.EventCount],
  granularity: MetricGranularity.Day,
  days: 7
});

if (isLoading) return <ActivityIndicator />;
if (error) return <ErrorView error={error} onRetry={refetch} />;
if (!series) return null;

return series.series.map((point) => (
  <Text key={point.bucket}>
    {point.bucket}: {metricValue(point.values, MetricMeasure.EventCount) ?? 0}
  </Text>
));
```

Empty buckets are **present and zero-valued**, not omitted, so `series.series.length === 0`
is a branch that never fires for a valid window. Check the bucket values for emptiness,
not the array length.

`series.meta.granularity` **is** populated here — it is absent only on `useMetrics` and
on the event feed.

### useMetricsBreakdown

Group the same measures by a dimension. This operation requires **two** options rather
than one: `measures` and `dimension`.

```tsx
const { breakdown, isLoading, error, refetch } = useMetricsBreakdown({
  measures: [MetricMeasure.EventCount, MetricMeasure.UniqueEventUsers],
  dimension: MetricDimension.EventName,
  days: 30
});

if (isLoading) return <ActivityIndicator />;
if (error) return <ErrorView error={error} onRetry={refetch} />;
if (!breakdown) return null;

return breakdown.items.map((item) => (
  <Text key={item.key}>
    {item.isOverflow ? 'Everything else' : item.key}:{' '}
    {metricValue(item.values, MetricMeasure.EventCount) ?? 0}
  </Text>
));
```

`items` arrives ordered by the first requested measure, descending — do not re-sort
unless you mean to. Past the server's cardinality ceiling the tail collapses into a
single row with `isOverflow: true` and `meta.truncated` goes true, and **that row's
`values` omits `unique_event_users`**. Use `metricValue()` and never assert non-null.

Grouping by `event_name` is one of the three requests that has no honest narrower
answer, so on a plan without custom metrics it raises a `PaymentRequiredError` (402)
rather than returning a scoped 200. The other dimensions narrow silently and succeed.

### useMetricsEvents

Read the raw event feed, paginated.

```tsx
const { events, isLoading, error, refetch, query, setQuery } = useMetricsEvents({
  measures: [MetricMeasure.EventCount],
  days: 7,
  page: 1,
  perPage: 50
});

if (isLoading) return <ActivityIndicator />;
if (error) return <ErrorView error={error} onRetry={refetch} />;
if (!events) return null;

const hasNextPage = events.meta.page < events.meta.totalPages;
```

⚠️ This response carries **two meta blocks and they are not interchangeable**:

| Block | Carries |
|---|---|
| `events.meta` | pagination — `total`, `page`, `perPage`, `totalPages` |
| `events.metrics` | the window/scope block every other operation puts under `meta` |

So the tier read is `events.metrics.eventScope`, **not** `events.meta.eventScope` — the
latter is `undefined`, silently.

Paging is `setQuery` with a new `page`; each page replaces the last rather than
appending, so a feed screen accumulates rows itself. The raw feed is also an
exclusively-custom request, so it raises a `PaymentRequiredError` (402) on a plan without
custom metrics — this is the one metrics hook whose `error` is expected to be populated
on a Free project.

#### Which hook for which operation

| Hook | Client call | Payload field | Extra required option |
|---|---|---|---|
| `useMetrics` | `client.metrics.summary` | `summary` | — |
| `useMetricsTimeseries` | `client.metrics.timeseries` | `series` | — |
| `useMetricsBreakdown` | `client.metrics.breakdown` | `breakdown` | `dimension` |
| `useMetricsEvents` | `client.metrics.events` | `events` | — |

All four share the same control surface — `isLoading`, `error`, `refetch`, `query`,
`setQuery` — and the same request-sequence guard, so a superseded response that lands
after a newer one is ignored in every one of them.

## Theming

### Using built-in themes

```tsx
import { FeedbackProvider, darkTheme } from 'feedbackkit-react-native';

<FeedbackProvider
  apiKey="..."
  theme={darkTheme}
>
```

`colorScheme` on `FeedbackProvider` is `'system'` by default: the list follows the device's light or dark setting. Pass `'light'` or `'dark'` to pin it. A `theme` that sets its own surface colours is kept as-is in both schemes.

### Custom theme

```tsx
import { FeedbackProvider } from 'feedbackkit-react-native';

const customTheme = {
  primaryColor: '#6366F1',
  backgroundColor: '#F8FAFC',
};

<FeedbackProvider
  apiKey="..."
  theme={customTheme}
>
```

### Theme properties

| Property | Description | Default (Light) |
|----------|-------------|-----------------|
| `primaryColor` | Primary accent color | `#007AFF` |
| `backgroundColor` | Screen background | `#F2F2F7` |
| `cardBackgroundColor` | Card background | `#FFFFFF` |
| `textColor` | Primary text | `#000000` |
| `secondaryTextColor` | Secondary text | `#8E8E93` |
| `borderColor` | Border color | `#C6C6C8` |
| `successColor` | Success/completed | `#34C759` |
| `errorColor` | Error/rejected | `#FF3B30` |
| `statusColors.inProgress` | In progress | `#FF9500` |
| `spacing` | Base spacing unit | `8` |
| `borderRadius` | Default border radius | `12` |

## User identity

`FeedbackProvider` does not mint an anonymous user id. It loads `@feedbackkit/userId` from AsyncStorage when the `userId` prop is omitted, and it persists the prop and every `setUserId` call to that key. A prop that arrives while the stored id is still loading is kept.

`useVote`, `useSubmitFeedback`, and `useComments` throw `User ID is required…` until that context id is set. Vote and submit throw before `error` is set. Comments store the failure on `addError`. Generate one stable id for anonymous users and pass it in. A new id on each launch lets the same person vote twice.

`feedbackkit-js` can mint `local_<uuid>` when a direct client call omits `userId`. On React Native that value is memory-only, the provider clears it when the context id is unset, and the hooks do not send it. List and detail reads still run with no id.

`client.users.register({ userId, mrr })` records the id and an optional monthly amount.

## Plan limits

| Limit | What the SDK sees |
|---|---|
| Free feedback cap, 10 items in a project | `submit` resolves. `isHiddenOverLimit` is true. Later reads omit the row. Not a 402 |
| Custom events below Pro | Stored. A summary returns 200 with `meta.eventScope === MetricEventScope.PredefinedOnly` |
| Breakdown by event name, a custom `eventName` filter, or the raw event feed, below Pro | `PaymentRequiredError`, `code === 'METRICS_CUSTOM_EVENTS_REQUIRE_PRO'` |
| Metrics window | Free 30 days, Pro 90, Team 365. A wider request is clamped. `error` stays null. Read `meta.retentionClamped` and `meta.retentionWindowDays` |
| Bearer-only measures (`sdk_user_count`, `mrr_sum`, `mrr_average`, `users_with_mrr`) | `ForbiddenError`, `code === 'METRICS_MEASURE_REQUIRES_BEARER'` |
| Vote on `completed` or `rejected` | `VoteButton` disables the control. A direct vote is `ForbiddenError` |

Project count, members, and integrations return 402 from their own routes. This package does not call those routes.

## Error Handling

```tsx
const { feedbacks, error, isLoading } = useFeedbackList();

if (error instanceof AuthenticationError) {
  // 401. Key missing, wrong, or regenerated.
} else if (error instanceof PaymentRequiredError &&
           error.code === 'METRICS_CUSTOM_EVENTS_REQUIRE_PRO') {
  // 402. One of the three custom-event reads. The events are already stored.
} else if (error instanceof ForbiddenError) {
  // 403. Archived project, a closed vote, or a bearer-only measure.
} else if (error instanceof RateLimitError) {
  // 429. error.retryAfterSeconds when the server sent Retry-After.
} else if (error instanceof NetworkError) {
  // The request never completed.
} else if (error instanceof ValidationError) {
  // 400. Rejected payload.
} else if (error) {
  console.log(isLoading, feedbacks.length);
}
```

Also re-exported: `NotFoundError` (404), `ConflictError` (409), `ServerError` (5xx). The missing-user-id failure from `vote` and `submit` is a plain `Error`, not one of these classes.

## TypeScript

All components and hooks are fully typed. Import types from the SDK:

```tsx
import type {
  Feedback,
  FeedbackStatus,
  FeedbackCategory,
  FeedbackKitTheme,
  FeedbackListProps
} from 'feedbackkit-react-native';
```

## Privacy

The widgets send what `feedbackkit-js` encodes. Data is collected on your behalf; FeedbackKit is the processor. Store-form answers: [App Store privacy](../docs/privacy/APP-STORE-PRIVACY.md), [Google Play Data safety](../docs/privacy/GOOGLE-PLAY-DATA-SAFETY.md).

## License

MIT
