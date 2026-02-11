/**
 * SubmitFeedbackView Component
 *
 * A complete form for submitting new feedback.
 */

import React, { useState, useEffect } from 'react';
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
import { Feedback, FeedbackCategory } from 'feedbackkit-js';
import { useFeedbackKitContext } from '../provider';
import { useSubmitFeedback } from '../hooks/useSubmitFeedback';
import { t } from '../i18n';
import { getCategoryColor, getCategoryDisplayName } from '../styles/theme';

export interface SubmitFeedbackViewProps {
  /** Called after successful submission with the created feedback */
  onSubmit?: (feedback: Feedback) => void;
  /** Called when the cancel button is pressed */
  onCancel?: () => void;
  /** Pre-selected category */
  initialCategory?: FeedbackCategory;
  /** Custom container style */
  style?: ViewStyle;
}

const categories = [
  FeedbackCategory.FeatureRequest,
  FeedbackCategory.BugReport,
  FeedbackCategory.Improvement,
  FeedbackCategory.Other
];

/**
 * Complete submit feedback form with category selector, validation,
 * and mailing list opt-in.
 *
 * @example
 * ```tsx
 * <SubmitFeedbackView
 *   onSubmit={(feedback) => {
 *     navigation.goBack();
 *     Alert.alert('Success', 'Feedback submitted!');
 *   }}
 *   onCancel={() => navigation.goBack()}
 * />
 * ```
 */
export function SubmitFeedbackView({
  onSubmit,
  onCancel,
  initialCategory = FeedbackCategory.FeatureRequest,
  style
}: SubmitFeedbackViewProps) {
  const { theme } = useFeedbackKitContext();
  const { submit, isSubmitting, error, clearError } = useSubmitFeedback();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FeedbackCategory>(initialCategory);
  const [email, setEmail] = useState('');
  const [subscribeToMailingList, setSubscribeToMailingList] = useState(false);
  const [operationalEmails, setOperationalEmails] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const isValid = title.trim().length > 0 && description.trim().length > 0;

  // Reset mailing list when email becomes empty
  useEffect(() => {
    if (email.trim().length === 0) {
      setSubscribeToMailingList(false);
    }
  }, [email]);

  const handleSubmit = async () => {
    setHasAttemptedSubmit(true);
    if (!isValid || isSubmitting) return;

    clearError();

    try {
      const mailingListEmailTypes: string[] = [];
      if (operationalEmails) mailingListEmailTypes.push('operational');
      if (marketingEmails) mailingListEmailTypes.push('marketing');

      const feedback = await submit({
        title: title.trim(),
        description: description.trim(),
        category,
        userEmail: email.trim() || undefined,
        subscribeToMailingList: email.trim() ? subscribeToMailingList : undefined,
        mailingListEmailTypes: email.trim() && subscribeToMailingList ? mailingListEmailTypes : undefined
      });
      onSubmit?.(feedback);
    } catch {
      // Error is captured by the hook
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundColor }, style]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title Heading */}
      <Text style={[styles.heading, { color: theme.textColor }]}>
        {t('feedback.submit.title')}
      </Text>

      {/* Category Selector */}
      <Text style={[styles.label, { color: theme.textColor }]}>
        {t('feedback.form.category')}
      </Text>
      <View style={styles.categoryRow}>
        {categories.map((cat) => {
          const color = getCategoryColor(cat, theme);
          const isSelected = cat === category;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[
                styles.categoryPill,
                {
                  backgroundColor: isSelected ? color : color + '20',
                  borderRadius: theme.borderRadius / 2
                }
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  { color: isSelected ? '#FFFFFF' : color }
                ]}
              >
                {getCategoryDisplayName(cat)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Title Input */}
      <Text style={[styles.label, { color: theme.textColor }]}>
        {t('feedback.form.title')}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.cardBackgroundColor,
            color: theme.textColor,
            borderColor: hasAttemptedSubmit && !title.trim() ? theme.errorColor : theme.borderColor,
            borderRadius: theme.borderRadius
          }
        ]}
        placeholder={t('feedback.form.title.placeholder')}
        placeholderTextColor={theme.secondaryTextColor}
        value={title}
        onChangeText={setTitle}
        autoCapitalize="sentences"
        returnKeyType="next"
      />
      {hasAttemptedSubmit && !title.trim() && (
        <Text style={[styles.fieldError, { color: theme.errorColor }]}>
          {t('feedback.form.title.error')}
        </Text>
      )}

      {/* Description Input */}
      <Text style={[styles.label, { color: theme.textColor }]}>
        {t('feedback.form.description')}
      </Text>
      <TextInput
        style={[
          styles.input,
          styles.multilineInput,
          {
            backgroundColor: theme.cardBackgroundColor,
            color: theme.textColor,
            borderColor: hasAttemptedSubmit && !description.trim() ? theme.errorColor : theme.borderColor,
            borderRadius: theme.borderRadius
          }
        ]}
        placeholder={t('feedback.form.description.placeholder')}
        placeholderTextColor={theme.secondaryTextColor}
        value={description}
        onChangeText={setDescription}
        multiline
        textAlignVertical="top"
      />
      {hasAttemptedSubmit && !description.trim() && (
        <Text style={[styles.fieldError, { color: theme.errorColor }]}>
          {t('feedback.form.description.error')}
        </Text>
      )}

      {/* Email Input */}
      <Text style={[styles.label, { color: theme.textColor }]}>
        {t('feedback.form.email')}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.cardBackgroundColor,
            color: theme.textColor,
            borderColor: theme.borderColor,
            borderRadius: theme.borderRadius
          }
        ]}
        placeholder={t('feedback.form.email.placeholder')}
        placeholderTextColor={theme.secondaryTextColor}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={[styles.emailHint, { color: theme.secondaryTextColor }]}>
        {t('feedback.form.email.description')}
      </Text>

      {/* Mailing List Checkbox — visible only when email non-empty */}
      {email.trim().length > 0 && (
        <View style={styles.checkboxSection}>
          <Checkbox
            checked={subscribeToMailingList}
            onToggle={() => setSubscribeToMailingList(!subscribeToMailingList)}
            label={t('feedback.form.mailingList')}
            color={theme.primaryColor}
            textColor={theme.textColor}
          />

          {/* Sub-checkboxes — visible only when main checkbox checked */}
          {subscribeToMailingList && (
            <View style={styles.subCheckboxes}>
              <Checkbox
                checked={operationalEmails}
                onToggle={() => setOperationalEmails(!operationalEmails)}
                label={t('feedback.form.mailingList.operational')}
                color={theme.primaryColor}
                textColor={theme.secondaryTextColor}
              />
              <Checkbox
                checked={marketingEmails}
                onToggle={() => setMarketingEmails(!marketingEmails)}
                label={t('feedback.form.mailingList.marketing')}
                color={theme.primaryColor}
                textColor={theme.secondaryTextColor}
              />
            </View>
          )}
        </View>
      )}

      {/* Error Container */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: theme.errorColor + '15', borderRadius: theme.borderRadius }]}>
          <Text style={[styles.errorText, { color: theme.errorColor }]}>
            {error.message || t('error.generic')}
          </Text>
        </View>
      )}

      {/* Button Row */}
      <View style={styles.buttonRow}>
        {onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            style={[
              styles.cancelButton,
              {
                borderColor: theme.borderColor,
                borderRadius: theme.borderRadius
              }
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelButtonText, { color: theme.textColor }]}>
              {t('button.cancel')}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[
            styles.submitButton,
            {
              backgroundColor: isSubmitting ? theme.primaryColor + '80' : theme.primaryColor,
              borderRadius: theme.borderRadius,
              flex: onCancel ? 1 : undefined
            }
          ]}
          activeOpacity={0.7}
        >
          {isSubmitting ? (
            <View style={styles.submittingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {t('feedback.submit.submitting')}
              </Text>
            </View>
          ) : (
            <Text style={styles.submitButtonText}>
              {t('feedback.submit.button')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Checkbox sub-component
// ---------------------------------------------------------------------------

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  color: string;
  textColor: string;
}

function Checkbox({ checked, onToggle, label, color, textColor }: CheckboxProps) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={styles.checkboxRow}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? color : '#C6C6C8',
            backgroundColor: checked ? color : 'transparent'
          }
        ]}
      >
        {checked && <Text style={styles.checkmark}>{'✓'}</Text>}
      </View>
      <Text style={[styles.checkboxLabel, { color: textColor }]}>
        {label}
      </Text>
    </TouchableOpacity>
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
  heading: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600'
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: 'top'
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4
  },
  emailHint: {
    fontSize: 12,
    marginTop: 4
  },
  checkboxSection: {
    marginTop: 12
  },
  subCheckboxes: {
    marginLeft: 28,
    marginTop: 4,
    gap: 4
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1
  },
  errorContainer: {
    padding: 12,
    marginTop: 16
  },
  errorText: {
    fontSize: 14
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600'
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
