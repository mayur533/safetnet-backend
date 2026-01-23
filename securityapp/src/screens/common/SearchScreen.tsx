import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../utils/colors';
import { typography, spacing } from '../../utils';

export const SearchScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    setError(null);

    // Simulate search delay
    setTimeout(() => {
      if (query.trim() === '') {
        setSearchResults([]);
      } else {
        // TODO: Implement real search API call
        // For now, show empty results
        setSearchResults([]);
      }
      setIsSearching(false);
    }, 300);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'alert':
        return 'warning';
      case 'location':
        return 'location-on';
      case 'officer':
        return 'person';
      case 'report':
        return 'description';
      default:
        return 'search';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return colors.emergencyRed;
      case 'normal':
        return colors.primary;
      case 'low':
        return colors.mediumGray;
      default:
        return colors.mediumGray;
    }
  };

  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderLeftColor: getPriorityColor(item.priority) }]}
      activeOpacity={0.7}
      onPress={() => {
        // Handle navigation based on item type
        console.log('Navigate to:', item.type, item.id);
      }}
    >
      <View style={styles.resultIcon}>
        <Icon name={getTypeIcon(item.type)} size={24} color={colors.primary} />
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
        <Text style={styles.resultTimestamp}>{item.timestamp}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={colors.mediumGray} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color={colors.mediumGray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search alerts, locations, officers..."
            placeholderTextColor={colors.mediumGray}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus={true}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              activeOpacity={0.7}
            >
              <Icon name="clear" size={20} color={colors.mediumGray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsCount}>
          {isSearching ? 'Searching...' : `${searchResults.length} results found`}
        </Text>

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderSearchResult}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={
            !isSearching && searchQuery.length > 0 ? (
              <View style={styles.emptyContainer}>
                <Icon name="search-off" size={64} color={colors.mediumGray} />
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your search terms
                </Text>
              </View>
            ) : null
          }
        />
      </View>

      {/* Quick Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filtersTitle}>Quick Filters</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersList}>
          {['Alerts', 'Locations', 'Officers', 'Reports', 'Today', 'This Week'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={styles.filterChip}
              activeOpacity={0.7}
              onPress={() => {
                // Handle filter selection
                console.log('Filter selected:', filter);
              }}
            >
              <Text style={styles.filterText}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    paddingTop: 50, // Account for status bar
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    ...typography.screenHeader,
    color: colors.darkText,
  },
  placeholder: {
    width: 40, // Match back button width
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGrayBg,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.darkText,
    paddingVertical: 0,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  resultsCount: {
    ...typography.caption,
    color: colors.mediumText,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  resultsList: {
    paddingBottom: spacing.xl,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGrayBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    ...typography.body,
    color: colors.darkText,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultSubtitle: {
    ...typography.caption,
    color: colors.mediumText,
    marginBottom: 2,
  },
  resultTimestamp: {
    ...typography.caption,
    color: colors.mediumGray,
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    ...typography.sectionHeader,
    color: colors.mediumText,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.mediumGray,
    textAlign: 'center',
  },
  filtersContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  filtersTitle: {
    ...typography.sectionHeader,
    color: colors.darkText,
    marginBottom: spacing.sm,
  },
  filtersList: {
    marginBottom: spacing.sm,
  },
  filterChip: {
    backgroundColor: colors.lightGrayBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  filterText: {
    ...typography.caption,
    color: colors.darkText,
    fontWeight: '500',
  },
});