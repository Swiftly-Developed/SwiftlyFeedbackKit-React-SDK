/**
 * The Sort & Filter sheet. On Android it is a Material 3 modal bottom sheet (scrim,
 * drag handle, 28dp top corners, back button closes it). On iOS it is a page sheet
 * with a Done button, the way a native iOS app presents a settings-style picker.
 *
 * Choices apply as they are made; Done or the back gesture only closes the sheet.
 */

import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FeedbackCategory, FeedbackSort, FeedbackStatus } from 'feedbackkit-js';
import { layoutDirection, t } from '../../i18n';
import { getStatusDisplayName } from '../../styles/theme';
import { FilterChip } from './FilterChip';
import { ShowcaseIcon, ShowcaseIconName } from './ShowcaseIcon';
import { StatusGlyph } from './StatusGlyph';
import {
  CATEGORY_OPTIONS,
  FeedbackListUserFilter,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  categoryPluralName,
  isFiltered
} from './feedbackListState';
import { useShowcaseAppearance } from './useShowcaseAppearance';

const CATEGORY_ICONS: Record<string, ShowcaseIconName> = {
  [FeedbackCategory.FeatureRequest]: 'lightbulb',
  [FeedbackCategory.BugReport]: 'bug',
  [FeedbackCategory.Improvement]: 'tune',
  [FeedbackCategory.Other]: 'more'
};

export interface SortFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  sort: FeedbackSort;
  onSortChange: (sort: FeedbackSort) => void;
  filter: FeedbackListUserFilter;
  onFilterChange: (filter: FeedbackListUserFilter) => void;
  showSort: boolean;
  showStatusFilter: boolean;
  showCategoryFilter: boolean;
}

export function SortFilterSheet({
  visible,
  onClose,
  sort,
  onSortChange,
  filter,
  onFilterChange,
  showSort,
  showStatusFilter,
  showCategoryFilter
}: SortFilterSheetProps) {
  const { palette, metrics, fontScale } = useShowcaseAppearance();
  const glyph = Math.round(14 * fontScale);
  const heading = [styles.heading, { color: palette.body }];
  const showFilter = showStatusFilter || showCategoryFilter;

  const content = (
    <View
      style={[
        styles.sheet,
        metrics.isAndroid ? null : styles.pageSheet,
        { backgroundColor: palette.sheet, direction: layoutDirection() }
      ]}
    >
      {metrics.isAndroid ? (
        <View style={[styles.handle, { backgroundColor: palette.cardBorder }]} accessibilityElementsHidden />
      ) : null}
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.title }]}>
          {t('list.sortAndFilter')}
        </Text>
        <Pressable
          testID="fbk-sort-filter-done"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('list.done')}
          style={[styles.textButton, { minHeight: metrics.minTarget, minWidth: metrics.minTarget }]}
        >
          <Text style={[styles.textButtonLabel, { color: palette.primaryOnCard }]}>{t('list.done')}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {showSort ? (
          <View accessibilityRole="radiogroup" accessibilityLabel={t('list.sortBy')}>
            <Text accessibilityRole="header" style={heading}>
              {t('list.sortBy')}
            </Text>
            {SORT_OPTIONS.map((option) => {
              const selected = option.value === sort;
              return (
                <Pressable
                  key={option.value}
                  testID={`fbk-sort-option-${option.value}`}
                  onPress={() => onSortChange(option.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={t(option.labelKey)}
                  accessibilityState={{ checked: selected, selected }}
                  android_ripple={metrics.isAndroid ? { color: palette.ripple } : undefined}
                  style={({ pressed }) => [
                    styles.sortRow,
                    { minHeight: metrics.minTarget, opacity: !metrics.isAndroid && pressed ? 0.6 : 1 }
                  ]}
                >
                  <Text style={[styles.sortLabel, { color: palette.title }]}>{t(option.labelKey)}</Text>
                  {selected ? (
                    <ShowcaseIcon name="check" size={Math.round(18 * fontScale)} color={palette.primaryOnCard} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {showFilter ? (
          <Text accessibilityRole="header" style={[heading, showSort ? styles.sectionGap : null]}>
            {t('list.filter')}
          </Text>
        ) : null}

        {showStatusFilter ? (
          <View>
            <Text style={[styles.subheading, { color: palette.title }]}>{t('list.filter.status')}</Text>
            <View
              style={styles.chips}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('list.filter.status')}
            >
              <FilterChip
                testID="fbk-filter-status-all"
                label={t('list.filter.allStatuses')}
                selected={filter.status === undefined}
                onPress={() => onFilterChange({ ...filter, status: undefined })}
              />
              {STATUS_OPTIONS.map((status: FeedbackStatus) => (
                <FilterChip
                  key={status}
                  testID={`fbk-filter-status-${status}`}
                  label={getStatusDisplayName(status)}
                  selected={filter.status === status}
                  onPress={() => onFilterChange({ ...filter, status })}
                  leading={
                    <StatusGlyph
                      status={status}
                      size={glyph}
                      color={palette.statusGlyph(status)}
                      onColor={palette.chip}
                    />
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {showCategoryFilter ? (
          <View>
            <Text style={[styles.subheading, { color: palette.title }]}>{t('list.filter.category')}</Text>
            <View
              style={styles.chips}
              accessibilityRole="radiogroup"
              accessibilityLabel={t('list.filter.category')}
            >
              <FilterChip
                testID="fbk-filter-category-all"
                label={t('list.filter.allCategories')}
                selected={filter.category === undefined}
                onPress={() => onFilterChange({ ...filter, category: undefined })}
              />
              {CATEGORY_OPTIONS.map((category: FeedbackCategory) => (
                <FilterChip
                  key={category}
                  testID={`fbk-filter-category-${category}`}
                  label={categoryPluralName(category)}
                  selected={filter.category === category}
                  onPress={() => onFilterChange({ ...filter, category })}
                  leading={<ShowcaseIcon name={CATEGORY_ICONS[category]} size={Math.round(16 * fontScale)} color={palette.body} />}
                />
              ))}
            </View>
          </View>
        ) : null}

        {isFiltered(filter) ? (
          <Pressable
            testID="fbk-sort-filter-clear"
            onPress={() => onFilterChange({})}
            accessibilityRole="button"
            accessibilityLabel={t('list.filter.clearAll')}
            android_ripple={metrics.isAndroid ? { color: palette.ripple } : undefined}
            style={[styles.clearRow, { minHeight: metrics.minTarget }]}
          >
            <Text style={[styles.textButtonLabel, { color: palette.danger }]}>{t('list.filter.clearAll')}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );

  if (!metrics.isAndroid) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        {content}
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.androidRoot}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: palette.scrim }]}
          onPress={onClose}
          importantForAccessibility="no"
          accessibilityElementsHidden
        />
        <View style={[styles.androidSheet, { backgroundColor: palette.sheet }]}>{content}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flexShrink: 1,
    paddingBottom: 24
  },
  pageSheet: {
    flex: 1,
    paddingTop: 8
  },
  androidRoot: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  androidSheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    elevation: 6
  },
  handle: {
    alignSelf: 'center',
    width: 32,
    height: 4,
    borderRadius: 2,
    marginTop: 16,
    marginBottom: 4
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingStart: 24,
    paddingEnd: 12,
    paddingTop: 8
  },
  title: {
    fontSize: 22,
    fontWeight: '500',
    flexShrink: 1
  },
  textButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  textButtonLabel: {
    fontSize: 16,
    fontWeight: '600'
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 16
  },
  heading: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4
  },
  sectionGap: {
    marginTop: 24
  },
  subheading: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 8
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  sortLabel: {
    fontSize: 16,
    flexShrink: 1
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  clearRow: {
    marginTop: 20,
    alignItems: 'flex-start',
    justifyContent: 'center'
  }
});
