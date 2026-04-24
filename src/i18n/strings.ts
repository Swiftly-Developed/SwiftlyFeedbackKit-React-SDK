/**
 * FeedbackKit Default English Strings
 */

export type StringKey = keyof typeof en;

export const en: Record<string, string> = {
  // Feedback List
  'feedback.list.title': 'Feedback',
  'feedback.list.empty': 'No feedback yet',
  'feedback.list.empty.description': 'Be the first to share your ideas!',
  'feedback.list.error.retry': 'Tap to retry',
  'feedback.list.error.generic': 'Something went wrong',

  // Submit Feedback
  'feedback.submit.title': 'Submit Feedback',
  'feedback.submit.button': 'Submit',
  'feedback.submit.submitting': 'Submitting...',

  // Feedback Detail
  'feedback.detail.title': 'Details',
  'feedback.detail.comments': 'Comments',
  'feedback.detail.comments.empty': 'No comments yet',
  'feedback.detail.comments.add': 'Add a comment...',
  'feedback.detail.comments.sending': 'Sending...',
  'feedback.detail.comments.loading': 'Loading comments...',
  'feedback.detail.comments.error': 'Failed to load comments',
  'feedback.detail.anonymous': 'Anonymous',
  'feedback.detail.submitted': 'Submitted %@',

  // Form Fields
  'feedback.form.title': 'Title',
  'feedback.form.title.placeholder': 'Brief summary of your feedback',
  'feedback.form.title.error': 'Please enter a title',
  'feedback.form.description': 'Description',
  'feedback.form.description.placeholder': 'Provide more details...',
  'feedback.form.description.error': 'Please enter a description',
  'feedback.form.category': 'Category',
  'feedback.form.email': 'Email (optional)',
  'feedback.form.email.placeholder': 'For follow-up questions',
  'feedback.form.email.description': 'Get notified when there are updates',
  'feedback.form.mailingList': 'Keep me updated via email newsletter',
  'feedback.form.mailingList.operational': 'Operational emails',
  'feedback.form.mailingList.marketing': 'Marketing emails',

  // Buttons
  'button.cancel': 'Cancel',
  'button.submit': 'Submit',
  'button.send': 'Send',
  'button.vote': 'Vote',
  'button.voted': 'Voted',

  // Comment
  'comment.one': 'comment',
  'comment.other': 'comments',
  'comment.author.team': 'Team',
  'comment.author.user': 'User',

  // Status
  'status.pending': 'Pending',
  'status.approved': 'Approved',
  'status.inProgress': 'In Progress',
  'status.testflight': 'TestFlight',
  'status.completed': 'Completed',
  'status.rejected': 'Rejected',

  // Categories
  'category.featureRequest': 'Feature Request',
  'category.bugReport': 'Bug Report',
  'category.improvement': 'Improvement',
  'category.other': 'Other',

  // Time
  'time.justNow': 'Just now',
  'time.minutesAgo': 'm ago',
  'time.hoursAgo': 'h ago',
  'time.daysAgo': 'd ago',
  'time.monthsAgo': 'mo ago',
  'time.yearsAgo': 'y ago',

  // Sort
  'sort.label': 'Sort',
  'sort.votes': 'Most Votes',
  'sort.newest': 'Newest',
  'sort.oldest': 'Oldest',
  'sort.comments': 'Most Comments',

  // Errors
  'error.title': 'Error',
  'error.ok': 'OK',
  'error.generic': 'An error occurred',
};
