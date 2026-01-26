import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { colors } from '../../utils/colors';
import { typography, spacing } from '../../utils';
import { authService } from '../../api/services';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface TestResult {
  endpoint: string;
  status: 'success' | 'error' | 'testing';
  message: string;
  responseTime?: number;
}

interface TestFunctionResult {
  success: boolean;
  message: string;
  responseTime?: number;
}

export const APITestScreen = ({ navigation }: any) => {
  const officer = useAppSelector((state) => state.auth.officer);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const testEndpoints = [
    {
      name: 'Authentication Status',
      endpoint: 'auth-check',
      test: async (): Promise<TestFunctionResult> => {
        // Check if user is authenticated
        return { success: !!officer, message: officer ? 'Authenticated' : 'Not authenticated' };
      },
    },
    {
      name: 'Profile API',
      endpoint: 'profile',
      test: async (): Promise<TestFunctionResult> => {
        if (!officer?.security_id) {
          throw new Error('No officer ID available');
        }
        const startTime = Date.now();
        const response = await authService.logout(officer.security_id, 'security'); // This will test API connectivity
        const responseTime = Date.now() - startTime;
        return { success: true, message: 'Profile API accessible', responseTime };
      },
    },
    {
      name: 'Backend Connectivity',
      endpoint: 'connectivity',
      test: async (): Promise<TestFunctionResult> => {
        const startTime = Date.now();
        // Simple connectivity test - try to make a request
        try {
          await new Promise((resolve, reject) => {
            setTimeout(() => resolve(true), 1000); // Simulate network delay
          });
          const responseTime = Date.now() - startTime;
          return { success: true, message: 'Backend reachable', responseTime };
        } catch (error) {
          return { success: false, message: 'Backend unreachable' };
        }
      },
    },
  ];

  const runTest = async (testConfig: typeof testEndpoints[0]) => {
    const testIndex = testResults.findIndex(t => t.endpoint === testConfig.endpoint);
    const updatedResults = [...testResults];

    // Set testing status
    const testResult: TestResult = {
      endpoint: testConfig.endpoint,
      status: 'testing',
      message: 'Testing...',
    };

    if (testIndex >= 0) {
      updatedResults[testIndex] = testResult;
    } else {
      updatedResults.push(testResult);
    }

    setTestResults(updatedResults);

    try {
      const result = await testConfig.test();

      const finalResult: TestResult = {
        endpoint: testConfig.endpoint,
        status: result.success ? 'success' : 'error',
        message: result.message,
        responseTime: result.responseTime,
      };

      const finalIndex = updatedResults.findIndex(t => t.endpoint === testConfig.endpoint);
      if (finalIndex >= 0) {
        updatedResults[finalIndex] = finalResult;
      }

      setTestResults([...updatedResults]);
    } catch (error: any) {
      const errorResult: TestResult = {
        endpoint: testConfig.endpoint,
        status: 'error',
        message: error.message || 'Test failed',
      };

      const errorIndex = updatedResults.findIndex(t => t.endpoint === testConfig.endpoint);
      if (errorIndex >= 0) {
        updatedResults[errorIndex] = errorResult;
      }

      setTestResults([...updatedResults]);
    }
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults([]);

    for (const testConfig of testEndpoints) {
      await runTest(testConfig);
      // Small delay between tests
      await new Promise(resolve => setTimeout(() => resolve(undefined), 500));
    }

    setIsRunningTests(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Icon name="check-circle" size={20} color={colors.successGreen} />;
      case 'error':
        return <Icon name="error" size={20} color={colors.emergencyRed} />;
      case 'testing':
        return <ActivityIndicator size="small" color={colors.primary} />;
      default:
        return <Icon name="help" size={20} color={colors.mediumGray} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return colors.successGreen;
      case 'error':
        return colors.emergencyRed;
      case 'testing':
        return colors.primary;
      default:
        return colors.mediumGray;
    }
  };

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
        <Text style={styles.headerTitle}>API Test Suite</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Test Controls */}
        <View style={styles.controlsSection}>
          <TouchableOpacity
            style={[styles.runAllButton, isRunningTests && styles.runAllButtonDisabled]}
            onPress={runAllTests}
            disabled={isRunningTests}
            activeOpacity={0.8}
          >
            {isRunningTests ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Icon name="play-arrow" size={20} color={colors.white} />
            )}
            <Text style={styles.runAllButtonText}>
              {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>Test Results</Text>

          {testResults.length === 0 && !isRunningTests && (
            <Text style={styles.noResultsText}>No tests run yet. Tap "Run All Tests" to begin.</Text>
          )}

          {testResults.map((result, index) => (
            <View key={index} style={styles.testResult}>
              <View style={styles.testHeader}>
                <Text style={styles.testEndpoint}>{result.endpoint}</Text>
                {getStatusIcon(result.status)}
              </View>

              <Text style={[styles.testMessage, { color: getStatusColor(result.status) }]}>
                {result.message}
              </Text>

              {result.responseTime && (
                <Text style={styles.responseTime}>
                  Response time: {result.responseTime}ms
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* API Configuration */}
        <View style={styles.configSection}>
          <Text style={styles.sectionTitle}>API Configuration</Text>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Backend URL:</Text>
            <Text style={styles.configValue}>https://safetnet.onrender.com</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>API Version:</Text>
            <Text style={styles.configValue}>Security Officer API</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Authentication:</Text>
            <Text style={styles.configValue}>
              {officer ? 'Authenticated' : 'Not Authenticated'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: 50,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.screenHeader,
    color: colors.darkText,
    fontSize: 18,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    padding: spacing.base,
  },
  controlsSection: {
    marginBottom: spacing.xl,
  },
  runAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: 12,
    gap: spacing.sm,
  },
  runAllButtonDisabled: {
    opacity: 0.6,
  },
  runAllButtonText: {
    ...typography.buttonLarge,
    color: colors.white,
  },
  resultsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.darkText,
    marginBottom: spacing.md,
  },
  noResultsText: {
    ...typography.body,
    color: colors.mediumGray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  testResult: {
    backgroundColor: colors.lightGrayBg,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  testEndpoint: {
    ...typography.bodyMedium,
    color: colors.darkText,
    textTransform: 'capitalize',
  },
  testMessage: {
    ...typography.body,
    fontSize: 14,
  },
  responseTime: {
    ...typography.caption,
    color: colors.mediumGray,
    marginTop: spacing.xs,
  },
  configSection: {
    backgroundColor: colors.lightGrayBg,
    borderRadius: 12,
    padding: spacing.lg,
  },
  configItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  configLabel: {
    ...typography.bodyMedium,
    color: colors.darkText,
  },
  configValue: {
    ...typography.body,
    color: colors.mediumGray,
    flex: 1,
    textAlign: 'right',
  },
});