// Required for `jest` to parse React Native's own sources.
//
// Without this file babel has no preset, so it cannot parse the Flow syntax in
// `@react-native/js-polyfills/error-guard.js` (`type ErrorHandler = (error: mixed, …)`)
// that the `react-native` jest preset pulls in. Every test suite then fails to
// TRANSFORM rather than to assert, jest reports `Tests: 0 total`, and — because
// `npm test` exits 0 regardless — the run reads as a pass.
//
// This package had no babel config at all, which means its test suite had never
// executed. See `docs/testing/suites/QA-UNIT01-FOUNDATION.md` §6.
module.exports = {
  presets: ['module:@react-native/babel-preset'],
};
