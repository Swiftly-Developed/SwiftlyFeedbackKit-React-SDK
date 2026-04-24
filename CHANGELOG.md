# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - VoteButton with optimistic updates
  - StatusBadge and CategoryBadge
- **React Hooks**
  - useFeedbackList, useFeedback, useVote
  - useComments, useSubmitFeedback, useFeedbackKit
- Customizable theming with light/dark mode
- Anonymous user ID with AsyncStorage persistence
- TypeScript support
- Peer dependency on feedbackkit-js core

[1.1.1]: https://github.com/Swiftly-Developed/SwiftlyFeedbackKit-React-SDK/releases/tag/1.1.1
[1.1.0]: https://github.com/Swiftly-Developed/SwiftlyFeedbackKit-React-SDK/releases/tag/1.1.0
[1.0.1]: https://github.com/Swiftly-Developed/SwiftlyFeedbackKit-React-SDK/releases/tag/1.0.1
[1.0.0]: https://github.com/Swiftly-Developed/SwiftlyFeedbackKit-React-SDK/releases/tag/1.0.0
