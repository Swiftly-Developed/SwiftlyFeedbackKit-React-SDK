# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2026-10-11

### Fixed

- Arabic (`ar`) lays out `FeedbackList`, `FeedbackCard`, `SubmitFeedbackView`, and `FeedbackDetailView` from the right. The add button uses the trailing edge, and nested mailing-list options indent from the start edge. The library does not change the host app's layout direction. Affected source `1.2.0` and `1.2.1` for locales; the physical trailing edge and checkbox indent go back to `1.0.1` on the views that release contained.
- The add button, sort chips, feedback card, and mailing-list checkboxes expose accessible names. The active sort chip is selected, and a checkbox reports checked. The card stays tappable while the vote control stays its own button. Affected `1.0.1` through `1.2.1` for the list and card; the submit form arrived after `1.0.1`.
- Sort chip labels are translated in Spanish, French, German, Japanese, Simplified Chinese, Brazilian Portuguese, Korean, Italian, Arabic, and Russian. They used to fall back to English. Affected source `1.2.0` and `1.2.1` (those catalogs are not in `1.0.1`).
- README documents `SubmitFeedbackView` and `FeedbackDetailView`.
- A `userId` prop on `FeedbackProvider` is written to AsyncStorage. Only `setUserId()` used to persist, so a later launch that omitted the prop had no stored id. Affected `1.0.1` through `1.2.1`.
- A refresh that fails while rows are already on screen keeps those rows and shows the error with retry. The banner used to appear only when the list was empty. Affected `1.0.1` through `1.2.1`.
- An unknown status or category keeps its raw token as the label and uses `secondaryTextColor`. The color and name helpers used to return nothing for a token the catalog does not list. Affected `1.0.1` through `1.2.1`.
- `FeedbackProvider` applies `locale` and `translations` before children render, so the first paint and a later change use those strings. An effect applied them after the children had already read the previous catalog and did not render again. Affected source `1.2.0` and `1.2.1` (locales are not in `1.0.1`). `clearOverrideStrings` drops consumer overrides.
- README: `useFeedbackList` has no `limit` option, `Theme` has no `warningColor` (in-progress orange is `statusColors.inProgress`), and the vote button is not optimistic. The provider example imports `feedbackkit-react-native`.

- `useFeedbackList`, `useFeedback`, and `useComments` ignore a response that lands after a newer request. A slower filter change, or a feedback id the screen has already left, no longer overwrites the current result. Affected `1.0.1` through `1.2.1`.
- `FeedbackList` applies `filterByStatus`, `filterByCategory`, and `sortBy` when those props change after mount. A sort chosen in the picker is kept when `sortBy` is omitted. Affected `1.0.1` through `1.2.1`.
- A `userId` passed to `FeedbackProvider` while the persisted id is still loading is no longer replaced by the stored value. Affected `1.0.1` through `1.2.1`.
- `VoteButton` follows a later `feedback` prop's `hasVoted` and `voteCount`. Voting is allowed only for `pending`, `approved`, `in_progress`, and `testflight`; an unknown status is not votable. The control exposes an accessible name. Affected `1.0.1` through `1.2.1`.
- A failed comment send is stored on `useComments` as `addError` and shown on `FeedbackDetailView` without replacing the loaded comments. The hook gap is in `1.0.1` through `1.2.1`. The detail screen arrived after `1.0.1`.
- The Jest stand-in for `feedbackkit-js` declares `ServerError` with the same default message as the JS SDK.

### Documentation

- Added `docs/getting-started.md`. `docs/snippets/` is typechecked with `npx tsc -p tsconfig.snippets.json --noEmit`. There is no sample app.
- README, the website React Native docs, and the React Native blog guide describe this 1.2.2 source and say what npm `1.0.1` and the public repository (`main` 1.1.1, `dev` 1.1.0) do not include.
- The 1.0.0 notes that claimed optimistic vote updates and a minted anonymous user id were wrong. See the note on that release.

### Changed

- Documented `useVote`'s email and `notifyStatusChange` opt-in. The hook already
  forwarded those fields through `feedbackkit-js`, which snake-cases them to
  `email` and `notify_status_change`.

## [1.2.1] - 2026-10-10

### Fixed

- **Admin replies require a server-side bearer token.** `useComments`'s
  `addComment(content, true)` forwarded `isAdmin` through the public API key, so
  an end-user app could mark its own reply as an admin response. Pass
  `bearerToken` to `FeedbackProvider` — a server credential, not a value embedded
  in the app. Without it, the hook throws and does not call the API. End-user
  comments are unchanged.

## [1.2.0] - 2026-08-25

> ⚠️ **Release precondition — read before upgrading.** This version's headline feature is the
> metrics read API, and the metrics endpoints are **not yet deployed to every environment**.
> Measured 2026-08-25: the development API serves them; the **testflight and production APIs
> answer `404`** to `/api/v1/metrics/summary` while their `/health` answers `200`, so the routes
> are genuinely absent rather than the service being down. Until that deploy lands, a metrics call
> against production fails. Every other change in this release is unaffected.

### Changed

- Documented metrics windows are Free 30 days, Pro 90 days and Team 365 days. The hooks still read `retentionWindowDays` from the response and do not hardcode them.

### Added

- `useMetrics` hook — reads a project's aggregate metrics summary, mirroring
  `useFeedbackList`'s shape (`summary`, `isLoading`, `error`, `refetch`, `query`,
  `setQuery`). `initialQuery` is required, because `measures` has no sensible default.
  A response the plan narrowed — a restricted event scope, or a clamped retention
  window — is a **success**, not an error: read `meta.eventScope`,
  `meta.retentionClamped` and `meta.retentionWindowDays` off the returned summary
  rather than inferring them from the plan, and never hardcode a window length.
  Unlike `useFeedbackList`, the hook ignores a superseded response that lands after a
  newer one, so rapid date-range changes cannot paint stale numbers.

- `useMetricsTimeseries`, `useMetricsBreakdown` and `useMetricsEvents` hooks — the
  remaining three key-family metrics operations, completing the set. Each mirrors
  `useMetrics` field for field, renaming only its payload (`series`, `breakdown`,
  `events`), and each pins its own operation's option and result types: `breakdown`
  requires a `dimension` that `summary` has no field for, and the event feed's result
  puts the window/scope block under `metrics` where the other three put it under `meta`.
  All four share one implementation and therefore one request-sequence guard.
  *(Added `2026-08-26`, after this version was prepared but before it was published.)*

### Fixed

- Lint and types: drop the unused `FeedbackKitConfig` import, replace the two
  `require('../i18n')` calls with a static import, and give the provider's
  client memo and startup effect the dependencies they read. The package
  typecheck resolves `feedbackkit-js` to the sibling SDK source.

### Changed

- **Requires `feedbackkit-js` >= 1.2.0**, the release that adds `client.metrics`.
  All four metrics hooks are inert against any earlier version. The `peerDependencies` range is
  **unchanged** at `^1.0.0`, which already admits `1.2.0`; it is not narrowed to
  `^1.2.0`, because doing so would break consumers who use only the feedback hooks and
  have no reason to upgrade.
- **Scope of the metrics surface in this package.** All four key-family operations have a
  hook: `useMetrics` (summary), `useMetricsTimeseries`, `useMetricsBreakdown` and
  `useMetricsEvents`. Each wraps exactly one `client.metrics.*` call, and the underlying
  JS client stays reachable directly for anything the hooks do not cover, since this
  package re-exports it. *(An earlier draft of this entry shipped `useMetrics` alone and
  recorded the other three as a known gap; the gap was closed `2026-08-26`, before this
  version was published, and this bullet is amended rather than left to describe a
  version that never existed on the registry.)*

## [1.1.1] - 2026-04-24

### Changed

- Version alignment with Swift SDK 1.1.1 hotfix (Xcode 26 / Swift 6.2 compatibility). No functional changes to this SDK.

## [1.1.0] - 2026-04-15

### Added

- CHANGELOG.md following Keep a Changelog format
- CONTRIBUTING.md with contribution guidelines
- SECURITY.md with vulnerability reporting policy
- CODE_OF_CONDUCT.md (Contributor Covenant v2.1)
- SUPPORT.md with support channels
- Feedback list sorting by creation date, votes, and comments

### Changed

- Standardized LICENSE copyright year to 2025
- Updated author field in package.json with contact email
- Standardized documentation across all FeedbackKit SDKs

## [1.0.1] - 2026-02-09

### Changed

- Renamed scoped package to unscoped `feedbackkit-react-native` for npm publishing
- Updated production URLs

## [1.0.0] - 2026-02-08

### Added

- Initial release of FeedbackKit React Native SDK
- **Pre-built Components**
  - FeedbackList with pull-to-refresh
  - FeedbackCard with badges and voting
  - VoteButton (the count updates after the server responds)
  - StatusBadge and CategoryBadge
- **React Hooks**
  - useFeedbackList, useFeedback, useVote
  - useComments, useSubmitFeedback, useFeedbackKit
- Customizable theming with light/dark mode
- AsyncStorage persistence for a user id the app supplies
- TypeScript support
- Peer dependency on feedbackkit-js core

> Corrected 2026-10-12 in the 1.2.2 documentation pass. `VoteButton` has never updated the count before the server responds. The provider has never minted an anonymous user id. It loads and stores an id the app passes in.

[1.1.1]: https://github.com/Swiftly-Developed/SwiftlyFeedbackKit-React-SDK/releases/tag/1.1.1
[1.1.0]: https://github.com/Swiftly-Developed/SwiftlyFeedbackKit-React-SDK/releases/tag/1.1.0
[1.0.1]: https://github.com/Swiftly-Developed/SwiftlyFeedbackKit-React-SDK/releases/tag/1.0.1
[1.0.0]: https://github.com/Swiftly-Developed/SwiftlyFeedbackKit-React-SDK/releases/tag/1.0.0
