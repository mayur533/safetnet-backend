import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loginStart, loginSuccess, loginFailure } from '../../store/slices/authSlice';
import { authService } from '../../api/services';
import { colors } from '../../utils/colors';
import Icon from 'react-native-vector-icons/MaterialIcons';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    dispatch(loginStart());

    try {
      const response = await authService.login({
        email: email.trim(),
        password,
        device_type: 'android',
      });

      if (response.result === 'success' && response.security_id) {
        // Convert legacy response to Redux format
        dispatch(loginSuccess({
          token: response.access || 'mock_token',
          officer: {
            security_id: response.security_id,
            name: response.name || 'Officer',
            email_id: response.email_id || email,
            mobile: response.mobile || '',
            security_role: response.security_role || 'guard',
            geofence_id: response.geofence_id || 'GEO001',
            status: response.status || 'active',
          },
        }));
        navigation.replace('Dashboard');
      } else {
        dispatch(loginFailure(response.msg || 'Login failed'));
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail ||
                          error.response?.data?.message ||
                          error.message ||
                          'Login failed';
      dispatch(loginFailure(errorMessage));
      Alert.alert('Login Failed', errorMessage);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>SafeTNet</Text>
          <Text style={styles.subtitleText}>Security Officer Login</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Email or Badge ID</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email or badge ID"
            placeholderTextColor={colors.mediumGray}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={colors.mediumGray}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Icon
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={24}
                color={colors.darkText}
              />
            </TouchableOpacity>
          </View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.demoContainer}>
          <Text style={styles.demoTitle}>Demo Credentials:</Text>
          <Text style={styles.demoText}>Email: officer@safetnet.com</Text>
          <Text style={styles.demoText}>Password: securepass456</Text>
          <Text style={styles.demoText}>Or Badge ID: BADGE001, Password: officer123</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: colors.mediumGray,
  },
  formContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: colors.lightGrayBg,
    color: colors.darkText,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 8,
    backgroundColor: colors.lightGrayBg,
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: colors.darkText,
    paddingRight: 0, // Remove right padding since icon is outside
  },
  eyeIcon: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  errorText: {
    color: colors.emergencyRed,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    backgroundColor: colors.mediumGray,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 16,
  },
  demoContainer: {
    backgroundColor: colors.lightGrayBg,
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 8,
  },
  demoText: {
    fontSize: 12,
    color: colors.mediumGray,
    marginBottom: 4,
  },
});