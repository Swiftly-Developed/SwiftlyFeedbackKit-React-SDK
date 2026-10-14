/**
 * Showcase FeedbackList (FEEDBACK01): one card per request on the grouped background,
 * a Sort & Filter sheet, and a "Filtered by … Clear" row while a filter is active.
 *
 * Sort stays server-side, as in Classic. The sheet's status and category filters are
 * session-only and apply client-side over the loaded list, so changing them never
 * refetches. A `filterByStatus`/`filterByCategory` prop still fixes that dimension
 * server-side and removes its section from the sheet.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Feedback, FeedbackSort } from 'feedbackkit-js';
import { useFeedbackList } from '../../hooks/useFeedbackList';
import { layoutDirection, t } from '../../i18n';
import { FeedbackListProps } from '../feedbackListProps';
import { FilterSummaryRow } from './FilterSummaryRow';
import { FilteredEmptyState } from './FilteredEmptyState';
import { ShowcaseCard } from './ShowcaseCard';
import { ShowcaseSkeleton } from './ShowcaseSkeleton';
import { SortFilterButton } from './SortFilterButton';
import { SortFilterSheet } from './SortFilterSheet';
import { FeedbackListUserFilter, applyUserFilter, isFiltered } from './feedbackListState';
import { useShowcaseAppearance } from './useShowcaseAppearance';

export function ShowcaseFeedbackList({
  onFeedbackPress,
  filterByStatus,
  filterByCategory,
  sortBy,
  showSortPicker = true,
  showAddButton = false,
  onAddPress,
  emptyComponent,
  ListHeaderComponent,
  style,
  contentContainerStyle,
  showStatusFilter = true,
  showCategoryFilter = true,
  showStatusBadge = true,
  showCategoryBadge = true,
  showCommentCount = true,
  showVoteCount = true,
  allowUndoVote = true
}: FeedbackListProps) {
  const { palette, metrics } = useShowcaseAppearance();
  const { feedbacks, isLoading, error, refetch, filter, setFilter } = useFeedbackList({
    status: filterByStatus,
    category: filterByCategory,
    sort: sortBy
  });
  const [userFilter, setUserFilter] = useState<FeedbackListUserFilter>({});
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeSort = filter.sort ?? FeedbackSort.Votes;
  const statusFilterOffered = showStatusFilter && filterByStatus === undefined;
  const categoryFilterOffered = showCategoryFilter && filterByCategory === undefined;

  // Same contract as Classic: props own status and category; `sortBy` applies only
  // when passed, so a sort the user picked survives a re-render.
  useEffect(() => {
    setFilter((current) => {
      const nextSort = sortBy !== undefined ? sortBy : current.sort;
      if (
        current.status === filterByStatus &&
        current.category === filterByCategory &&
        current.sort === nextSort
      ) {
        return current;
      }
      return { ...current, status: filterByStatus, category: filterByCategory, sort: nextSort };
    });
  }, [filterByStatus, filterByCategory, sortBy, setFilter]);

  // A filter the sheet no longer offers cannot stay applied invisibly.
  useEffect(() => {
    setUserFilter((current) => {
      const next: FeedbackListUserFilter = {
        status: statusFilterOffered ? current.status : undefined,
        category: categoryFilterOffered ? current.category : undefined
      };
      return next.status === current.status && next.category === current.category ? current : next;
    });
  }, [statusFilterOffered, categoryFilterOffered]);

  const displayed = useMemo(() => applyUserFilter(feedbacks, userFilter), [feedbacks, userFilter]);
  const filtered = isFiltered(userFilter);
  const clearFilters = () => setUserFilter({});
  const showMenuButton =
    (showSortPicker || statusFilterOffered || categoryFilterOffered) && feedbacks.length > 0;

  const renderItem = ({ item }: { item: Feedback }) => (
    <ShowcaseCard
      feedback={item}
      onPress={onFeedbackPress}
      showStatus={showStatusBadge}
      showCategory={showCategoryBadge}
      showCommentCount={showCommentCount}
      showVoteCount={showVoteCount}
      allowUndoVote={allowUndoVote}
      style={{ marginBottom: metrics.cardGap }}
    />
  );

  const errorBlock = error ? (
    <View style={styles.center}>
      <Text style={[styles.errorText, { color: palette.danger }]}>{error.message}</Text>
      <Pressable
        onPress={refetch}
        accessibilityRole="button"
        accessibilityLabel={t('feedback.list.error.retry')}
        style={[styles.textButton, { minHeight: metrics.minTarget }]}
      >
        <Text style={[styles.textButtonLabel, { color: palette.primaryOnBackground }]}>
          {t('feedback.list.error.retry')}
        </Text>
      </Pressable>
    </View>
  ) : null;

  const renderEmpty = () => {
    if (isLoading && feedbacks.length === 0) return <ShowcaseSkeleton gap={metrics.cardGap} />;
    if (error && feedbacks.length === 0) return errorBlock;
    if (filtered && feedbacks.length > 0) return <FilteredEmptyState onClear={clearFilters} />;
    if (emptyComponent) return emptyComponent;
    return (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={[styles.emptyTitle, { color: palette.title }]}>
          {t('feedback.list.empty')}
        </Text>
        <Text style={[styles.emptySubtitle, { color: palette.body }]}>{t('feedback.list.empty.description')}</Text>
        {showAddButton && onAddPress ? (
          <Pressable
            onPress={onAddPress}
            accessibilityRole="button"
            accessibilityLabel={t('feedback.submit.title')}
            android_ripple={metrics.isAndroid ? { color: palette.ripple, foreground: true } : undefined}
            style={[styles.filledButton, { minHeight: metrics.minTarget, backgroundColor: palette.primary }]}
          >
            <Text style={[styles.textButtonLabel, { color: palette.onPrimary }]}>{t('feedback.submit.title')}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const header = (
    <>
      {ListHeaderComponent}
      {showMenuButton ? (
        <View style={styles.toolbar}>
          <SortFilterButton
            sort={activeSort}
            filter={userFilter}
            expanded={sheetOpen}
            onPress={() => setSheetOpen(true)}
          />
        </View>
      ) : null}
      {filtered ? (
        <View style={styles.summary}>
          <FilterSummaryRow filter={userFilter} onClear={clearFilters} />
        </View>
      ) : null}
      {error && feedbacks.length > 0 ? errorBlock : null}
    </>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: palette.background, direction: layoutDirection() }, style]}
    >
      <FlatList
        data={displayed}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { padding: 16 },
          displayed.length === 0 && styles.emptyListContent,
          contentContainerStyle
        ]}
        ListHeaderComponent={header}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && feedbacks.length > 0}
            onRefresh={refetch}
            tintColor={palette.primary}
            colors={[palette.primary]}
            progressBackgroundColor={palette.card}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      {showAddButton && onAddPress && feedbacks.length > 0 ? (
        <Pressable
          onPress={onAddPress}
          accessibilityRole="button"
          accessibilityLabel={t('feedback.submit.title')}
          android_ripple={metrics.isAndroid ? { color: palette.ripple, foreground: true } : undefined}
          style={[
            styles.fab,
            {
              backgroundColor: palette.primary,
              borderRadius: metrics.isAndroid ? 16 : 28,
              bottom: 16,
              end: 16
            }
          ]}
        >
          <Text allowFontScaling={false} style={[styles.fabText, { color: palette.onPrimary }]}>
            +
          </Text>
        </Pressable>
      ) : null}

      <SortFilterSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        sort={activeSort}
        onSortChange={(sort) => setFilter((current) => ({ ...current, sort }))}
        filter={userFilter}
        onFilterChange={setUserFilter}
        showSort={showSortPicker}
        showStatusFilter={statusFilterOffered}
        showCategoryFilter={categoryFilterOffered}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  listContent: {
    flexGrow: 1
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center'
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 12
  },
  summary: {
    marginBottom: 8
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4
  },
  textButton: {
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  textButtonLabel: {
    fontSize: 16,
    fontWeight: '600'
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20
  },
  filledButton: {
    paddingHorizontal: 24,
    borderRadius: 999,
    justifyContent: 'center'
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3
  },
  fabText: {
    fontSize: 28,
    marginTop: -2
  }
});
