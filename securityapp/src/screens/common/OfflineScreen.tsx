import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../utils/colors';
import { typography, spacing } from '../../utils';
import Icon from 'react-native-vector-icons/MaterialIcons';

export const OfflineScreen = ({ navigation }: any) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);

    // Simulate connection test
    await new Promise(resolve => setTimeout(() => resolve(undefined), 2000));

    // For demo purposes, assume connection is restored
    setIsRetrying(false);
    navigation.goBack();
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Offline Icon */}
        <View style={styles.iconContainer}>
          <Icon name="wifi-off" size={80} color={colors.warningOrange} />
        </View>

        {/* Title */}
        <Text style={styles.title}>No Internet Connection</Text>

        {/* Description */}
        <Text style={styles.description}>
          It looks like you're offline. Please check your internet connection and try again.
        </Text>

        {/* Features Available Offline */}
        <View style={styles.offlineFeatures}>
          <Text style={styles.featuresTitle}>Available Offline:</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={16} color={colors.successGreen} />
              <Text style={styles.featureText}>View saved alerts</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={16} color={colors.successGreen} />
              <Text style={styles.featureText}>Access profile information</Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={16} color={colors.successGreen} />
              <Text style={styles.featureText}>Emergency SOS functionality</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.retryButton, isRetrying && styles.retryButtonDisabled]}
            onPress={handleRetry}
            disabled={isRetrying}
            activeOpacity={0.8}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Icon name="refresh" size={20} color={colors.white} />
            )}
            <Text style={styles.retryButtonText}>
              {isRetrying ? 'Testing Connection...' : 'Retry Connection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            activeOpacity={0.8}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  iconContainer: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.screenHeader,
    color: colors.darkText,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.mediumGray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  offlineFeatures: {
    backgroundColor: colors.lightGrayBg,
    borderRadius: 12,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.xl,
  },
  featuresTitle: {
    ...typography.cardTitle,
    color: colors.darkText,
    marginBottom: spacing.md,
  },
  featureList: {
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    ...typography.body,
    color: colors.darkText,
    marginLeft: spacing.sm,
  },
  buttonContainer: {
    width: '100%',
    gap: spacing.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    gap: spacing.sm,
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonText: {
    ...typography.buttonLarge,
    color: colors.white,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  backButtonText: {
    ...typography.buttonLarge,
    color: colors.primary,
  },
});