/**
 * Jest stand-in for `feedbackkit-js`, which is a peer dependency and is not installed
 * in this package. Every RN test resolves the real module name to this file via
 * `jest.config.js`'s `moduleNameMapper`.
 *
 * ⚠️ A mock is a second definition of the contract it mocks, and this one has already
 * drifted once: until 2026-08-15 it declared a `FeedbackCategory.Question` member the
 * JS SDK never shipped, a `Comment` with `feedbackId`/`isOfficial` where the real
 * interface has `isAdmin`, a `VoteResult` type where the real name is `VoteResponse`,
 * a `FeedbackKitConfig` requiring a `projectId` the real config does not have, no
 * `FeedbackSort`, no error classes, and a `FeedbackKit` class without `setUserId` —
 * so the provider crashed at mount against the mock while the real SDK was fine.
 *
 * A second, measured drift shipped anyway, because that gate read the ENUM surface
 * only: `ValidationError` defaulted to 'Validation failed' and `NetworkError` to
 * 'Network request failed' where the real classes say 'Validation error' and 'Network
 * error', and `RateLimitError` was missing outright. Reconciled 2026-08-25, and the
 * gate widened to the error-class surface (names AND default messages) so the third
 * drift reddens instead of shipping.
 *
 * Every runtime export below mirrors `SwiftlyFeedbackKit-JS/src/` verbatim, and
 * `src/__tests__/feedback-status-parity.test.ts` gates this file's enum and
 * error-class surfaces against the JS SDK's source.
 *
 * `__metricsMock` is the one export the real package does NOT have: a test handle.
 * `FeedbackProvider` constructs its own client internally, so a suite cannot reach a
 * per-instance `jest.fn()` before the hook's mount fetch has already run. The metrics
 * group is therefore a shared module-level object the class merely references, which
 * lets a test stage a resolution before render. Reset it with `__resetMetricsMock()`.
 */

export enum FeedbackStatus {
  Pending = 'pending',
  Approved = 'approved',
  InProgress = 'in_progress',
  TestFlight = 'testflight',
  Completed = 'completed',
  Rejected = 'rejected',
}

export enum FeedbackCategory {
  FeatureRequest = 'feature_request',
  BugReport = 'bug_report',
  Improvement = 'improvement',
  Other = 'other',
}

export enum FeedbackSort {
  Votes = 'votes',
  Newest = 'newest',
  Oldest = 'oldest',
  Comments = 'comments',
}

export const DEFAULT_CONFIG = {
  baseUrl: 'https://api.prod.getfeedbackkit.com/api/v1',
  timeout: 30000,
} as const;

// ============================================================================
// Types — mirrored from SwiftlyFeedbackKit-JS/src/models/types.ts
// ============================================================================

export interface Feedback {
  id: string;
  title: string;
  description: string;
  status: FeedbackStatus;
  category: FeedbackCategory;
  userId: string;
  userEmail?: string | null;
  voteCount: number;
  hasVoted: boolean;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface VoteResponse {
  feedbackId: string;
  voteCount: number;
  hasVoted: boolean;
}

export interface FeedbackKitConfig {
  apiKey: string;
  baseUrl?: string;
  userId?: string;
  /** Server-side credential for admin replies. Leave unset in an end-user app. */
  bearerToken?: string;
  timeout?: number;
}

// ============================================================================
// Errors — mirrored from SwiftlyFeedbackKit-JS/src/models/errors.ts
// ============================================================================

export class FeedbackKitError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'FeedbackKitError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class AuthenticationError extends FeedbackKitError {
  constructor(message = 'Invalid or missing API key', code = 'UNAUTHORIZED') {
    super(message, 401, code);
    this.name = 'AuthenticationError';
  }
}

export class PaymentRequiredError extends FeedbackKitError {
  constructor(
    message = 'Subscription limit exceeded. Please upgrade your plan.',
    code = 'PAYMENT_REQUIRED'
  ) {
    super(message, 402, code);
    this.name = 'PaymentRequiredError';
  }
}

export class ForbiddenError extends FeedbackKitError {
  constructor(message = 'Action not allowed', code = 'FORBIDDEN') {
    super(message, 403, code);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends FeedbackKitError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends FeedbackKitError {
  constructor(message = 'Conflict: action already performed', code = 'CONFLICT') {
    super(message, 409, code);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends FeedbackKitError {
  constructor(message = 'Validation error', code = 'BAD_REQUEST') {
    super(message, 400, code);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends FeedbackKitError {
  constructor(message = 'Rate limit exceeded', code = 'RATE_LIMITED') {
    super(message, 429, code);
    this.name = 'RateLimitError';
  }
}

export class ServerError extends FeedbackKitError {
  constructor(message = 'Server error', statusCode = 500, code = 'SERVER_ERROR') {
    super(message, statusCode, code);
    this.name = 'ServerError';
  }
}

export class NetworkError extends FeedbackKitError {
  constructor(message = 'Network error', code = 'NETWORK_ERROR') {
    super(message, 0, code);
    this.name = 'NetworkError';
  }
}

// ============================================================================
// Metrics — shapes mirrored from SwiftlyFeedbackKit-JS/src/models/types.ts.
// Contract of record: METRICS03 phase 01 §6, C1-C8.
// ============================================================================

/**
 * The `meta` block. `granularity` is ABSENT on `summary` and on the event feed's
 * `metrics` block -- omitted from the object, never null -- and PRESENT on
 * `timeseries` and `breakdown`. A mock that carried an explicit null here would
 * teach every consumer the opposite of the contract.
 */
function metricsMeta(withGranularity: boolean): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    measures: ['event_count'],
    timezone: 'UTC',
    dateFrom: '2026-08-01T00:00:00.000Z',
    dateTo: '2026-08-07T00:00:00.000Z',
    truncated: false,
    eventScope: 'all',
    retentionClamped: false,
    retentionWindowDays: 30,
  };
  if (withGranularity) meta.granularity = 'day';
  return meta;
}

/** Shared so a suite can stage a resolution before `FeedbackProvider` mounts. */
export const __metricsMock = {
  summary: jest.fn(),
  timeseries: jest.fn(),
  breakdown: jest.fn(),
  events: jest.fn(),
};

/** Restore the default resolutions and clear recorded calls. */
export function __resetMetricsMock(): void {
  __metricsMock.summary.mockReset().mockResolvedValue({
    meta: metricsMeta(false),
    values: { event_count: 0 },
  });
  __metricsMock.timeseries.mockReset().mockResolvedValue({
    meta: metricsMeta(true),
    series: [],
  });
  __metricsMock.breakdown.mockReset().mockResolvedValue({
    meta: metricsMeta(true),
    dimension: 'event_name',
    items: [],
  });
  // The event feed carries BOTH blocks: `meta` is pagination, `metrics` is the
  // window/scope block every other operation puts under `meta`.
  __metricsMock.events.mockReset().mockResolvedValue({
    items: [],
    meta: { total: 0, page: 1, perPage: 50, totalPages: 0 },
    metrics: metricsMeta(false),
  });
}

__resetMetricsMock();

/**
 * Optional stand-ins for the three reads whose hooks can race.
 * Null means the instance method's own Jest implementation (resolve [] / null).
 * A suite sets these BEFORE render, because `FeedbackProvider` constructs the
 * client itself and the mount effect fires the read immediately.
 */
export const __httpControl: {
  feedbackList: null | ((options?: unknown) => Promise<unknown>);
  feedbackGet: null | ((id: string) => Promise<unknown>);
  commentsList: null | ((id: string) => Promise<unknown>);
  commentsCreate: null | ((id: string, body: unknown) => Promise<unknown>);
} = {
  feedbackList: null,
  feedbackGet: null,
  commentsList: null,
  commentsCreate: null,
};

export function __resetHttpControl(): void {
  __httpControl.feedbackList = null;
  __httpControl.feedbackGet = null;
  __httpControl.commentsList = null;
  __httpControl.commentsCreate = null;
}

// ============================================================================
// Client - API-group and method names mirrored from SwiftlyFeedbackKit-JS/src/client.ts
// ============================================================================

export class FeedbackKit {
  constructor(_config: FeedbackKitConfig) {}

  feedback = {
    list: jest.fn((options?: unknown) =>
      __httpControl.feedbackList ? __httpControl.feedbackList(options) : Promise.resolve([])
    ),
    get: jest.fn((id: string) =>
      __httpControl.feedbackGet ? __httpControl.feedbackGet(id) : Promise.resolve(null)
    ),
    create: jest.fn().mockResolvedValue({}),
  };

  votes = {
    vote: jest.fn().mockResolvedValue({ feedbackId: 'mock-feedback', hasVoted: true, voteCount: 1 }),
    unvote: jest.fn().mockResolvedValue({ feedbackId: 'mock-feedback', hasVoted: false, voteCount: 0 }),
  };

  comments = {
    list: jest.fn((id: string) =>
      __httpControl.commentsList ? __httpControl.commentsList(id) : Promise.resolve([])
    ),
    create: jest.fn((id: string, body: unknown) =>
      __httpControl.commentsCreate
        ? __httpControl.commentsCreate(id, body)
        : Promise.resolve({})
    ),
  };

  users = {
    register: jest.fn().mockResolvedValue({ id: 'test-user-id' }),
  };

  events = {
    track: jest.fn().mockResolvedValue({}),
  };

  metrics = __metricsMock;

  setUserId = jest.fn();
  getUserId = jest.fn().mockReturnValue(undefined);
}
