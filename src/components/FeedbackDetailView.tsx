/**
 * FeedbackDetailView Component
 *
 * Displays full feedback details with comments section.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
  ActivityIndicator
} from 'react-native';
import { Feedback, Comment } from 'feedbackkit-js';
import { useFeedbackKitContext } from '../provider';
import { useComments } from '../hooks/useComments';
import { StatusBadge } from './StatusBadge';
import { CategoryBadge } from './CategoryBadge';
import { VoteButton } from './VoteButton';
import { t } from '../i18n';

export interface FeedbackDetailViewProps {
  /** The feedback item to display */
  feedback: Feedback;
  /** Called when vote state changes */
  onVoteChange?: (hasVoted: boolean, voteCount: number) => void;
  /** Custom container style */
  style?: ViewStyle;
}

/**
 * Converts an ISO date string to a relative time string (e.g. "3d ago", "Just now").
 */
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return t('time.justNow');
  if (diffMinutes < 60) return `${diffMinutes}${t('time.minutesAgo')}`;
  if (diffHours < 24) return `${diffHours}${t('time.hoursAgo')}`;
  if (diffDays < 30) return `${diffDays}${t('time.daysAgo')}`;
  if (diffMonths < 12) return `${diffMonths}${t('time.monthsAgo')}`;
  return `${diffYears}${t('time.yearsAgo')}`;
}

/**
 * Full detail view for a feedback item with comments.
 *
 * @example
 * ```tsx
 * const { feedback } = useFeedback(feedbackId);
 *
 * <FeedbackDetailView
 *   feedback={feedback}
 *   onVoteChange={(hasVoted, count) => {
 *     // Optionally update parent state
 *   }}
 * />
 * ```
 */
export function FeedbackDetailView({
  feedback,
  onVoteChange,
  style
}: FeedbackDetailViewProps) {
  const { theme } = useFeedbackKitContext();
  const {
    comments,
    isLoading: commentsLoading,
    error: commentsError,
    refetch: refetchComments,
    addComment,
    isAdding
  } = useComments(feedback.id);

  const [commentText, setCommentText] = useState('');

  const handleSendComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || isAdding) return;

    try {
      await addComment(trimmed);
      setCommentText('');
    } catch {
      // Error handling is in the hook
    }
  };

  const submittedText = t('feedback.detail.submitted').replace(
    '%@',
    formatRelativeDate(feedback.createdAt)
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundColor }, style]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header: Badges + Vote Button */}
      <View style={styles.header}>
        <View style={styles.badges}>
          <StatusBadge status={feedback.status} />
          <CategoryBadge category={feedback.category} />
        </View>
        <VoteButton feedback={feedback} onVoteChange={onVoteChange} />
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.textColor }]}>
        {feedback.title}
      </Text>

      {/* Description Card */}
      <View
        style={[
          styles.descriptionCard,
          {
            backgroundColor: theme.cardBackgroundColor,
            borderColor: theme.borderColor,
            borderRadius: theme.borderRadius
          }
        ]}
      >
        <Text style={[styles.descriptionText, { color: theme.textColor }]}>
          {feedback.description}
        </Text>
      </View>

      {/* Timestamp */}
      <Text style={[styles.timestamp, { color: theme.secondaryTextColor }]}>
        {submittedText}
      </Text>

      {/* Comments Section */}
      <View style={styles.commentsSection}>
        <Text style={[styles.commentsHeader, { color: theme.textColor }]}>
          {t('feedback.detail.comments')} ({comments.length})
        </Text>

        {/* Comment Input */}
        <View
          style={[
            styles.commentInputRow,
            {
              backgroundColor: theme.cardBackgroundColor,
              borderColor: theme.borderColor,
              borderRadius: theme.borderRadius
            }
          ]}
        >
          <TextInput
            style={[styles.commentInput, { color: theme.textColor }]}
            placeholder={t('feedback.detail.comments.add')}
            placeholderTextColor={theme.secondaryTextColor}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            editable={!isAdding}
          />
          <TouchableOpacity
            onPress={handleSendComment}
            disabled={!commentText.trim() || isAdding}
            style={[
              styles.sendButton,
              {
                backgroundColor: !commentText.trim() || isAdding
                  ? theme.primaryColor + '40'
                  : theme.primaryColor,
                borderRadius: theme.borderRadius / 2
              }
            ]}
            activeOpacity={0.7}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sendButtonText}>{t('button.send')}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Comments List */}
        {commentsLoading ? (
          <View style={styles.commentsLoadingContainer}>
            <ActivityIndicator size="small" color={theme.secondaryTextColor} />
            <Text style={[styles.commentsLoadingText, { color: theme.secondaryTextColor }]}>
              {t('feedback.detail.comments.loading')}
            </Text>
          </View>
        ) : commentsError ? (
          <View style={styles.commentsErrorContainer}>
            <Text style={[styles.commentsErrorText, { color: theme.errorColor }]}>
              {t('feedback.detail.comments.error')}
            </Text>
            <TouchableOpacity onPress={refetchComments} activeOpacity={0.7}>
              <Text style={[styles.retryText, { color: theme.primaryColor }]}>
                {t('feedback.list.error.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : comments.length === 0 ? (
          <Text style={[styles.emptyComments, { color: theme.secondaryTextColor }]}>
            {t('feedback.detail.comments.empty')}
          </Text>
        ) : (
          <View style={styles.commentsList}>
            {comments.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                theme={theme}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// CommentCard sub-component
// ---------------------------------------------------------------------------

interface CommentCardProps {
  comment: Comment;
  theme: {
    cardBackgroundColor: string;
    textColor: string;
    secondaryTextColor: string;
    primaryColor: string;
    borderRadius: number;
    spacing: number;
  };
}

function CommentCard({ comment, theme }: CommentCardProps) {
  const authorName = comment.userId || t('feedback.detail.anonymous');

  return (
    <View
      style={[
        styles.commentCard,
        {
          backgroundColor: theme.cardBackgroundColor,
          borderRadius: theme.borderRadius
        }
      ]}
    >
      <View style={styles.commentHeader}>
        <View style={styles.commentAuthorRow}>
          <Text style={[styles.commentAuthor, { color: theme.textColor }]}>
            {authorName}
          </Text>
          {comment.isAdmin && (
            <View style={[styles.teamBadge, { backgroundColor: theme.primaryColor + '20' }]}>
              <Text style={[styles.teamBadgeText, { color: theme.primaryColor }]}>
                {t('comment.author.team')}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.commentDate, { color: theme.secondaryTextColor }]}>
          {formatRelativeDate(comment.createdAt)}
        </Text>
      </View>
      <Text style={[styles.commentContent, { color: theme.textColor }]}>
        {comment.content}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 16
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12
  },
  descriptionCard: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 8
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 24
  },
  commentsSection: {
    marginTop: 8
  },
  commentsHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    padding: 8,
    gap: 8,
    marginBottom: 16
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    maxHeight: 100,
    paddingVertical: 4,
    paddingHorizontal: 4
  },
  sendButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  commentsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 20
  },
  commentsLoadingText: {
    fontSize: 14
  },
  commentsErrorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8
  },
  commentsErrorText: {
    fontSize: 14
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600'
  },
  emptyComments: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 20
  },
  commentsList: {
    gap: 10
  },
  commentCard: {
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600'
  },
  teamBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  teamBadgeText: {
    fontSize: 10,
    fontWeight: '600'
  },
  commentDate: {
    fontSize: 11
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20
  }
});
