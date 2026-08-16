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
 * Every runtime export below mirrors `SwiftlyFeedbackKit-JS/src/` verbatim, and
 * `src/__tests__/feedback-status-parity.test.ts` gates this file's enum surface
 * against the JS SDK's source so the next drift reddens instead of shipping.
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
  constructor(message = 'Invalid or missing API key') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'AuthenticationError';
  }
}

export class PaymentRequiredError extends FeedbackKitError {
  constructor(message = 'Subscription limit exceeded. Please upgrade your plan.') {
    super(message, 402, 'PAYMENT_REQUIRED');
    this.name = 'PaymentRequiredError';
  }
}

export class ForbiddenError extends FeedbackKitError {
  constructor(message = 'Action not allowed') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends FeedbackKitError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends FeedbackKitError {
  constructor(message = 'Conflict: action already performed') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class ValidationError extends FeedbackKitError {
  constructor(message = 'Validation failed', code = 'BAD_REQUEST') {
    super(message, 400, code);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends FeedbackKitError {
  constructor(message = 'Network request failed') {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

// ============================================================================
// Client — API-group and method names mirrored from SwiftlyFeedbackKit-JS/src/client.ts
// ============================================================================

export class FeedbackKit {
  constructor(_config: FeedbackKitConfig) {}

  feedback = {
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({}),
  };

  votes = {
    vote: jest.fn().mockResolvedValue({ feedbackId: 'mock-feedback', hasVoted: true, voteCount: 1 }),
    unvote: jest.fn().mockResolvedValue({ feedbackId: 'mock-feedback', hasVoted: false, voteCount: 0 }),
  };

  comments = {
    list: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockResolvedValue({}),
  };

  users = {
    register: jest.fn().mockResolvedValue({ id: 'test-user-id' }),
  };

  events = {
    track: jest.fn().mockResolvedValue({}),
  };

  setUserId = jest.fn();
  getUserId = jest.fn().mockReturnValue(undefined);
}
