import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { authService } from '../../api/services';
import { useAppDispatch } from '../../store/hooks';
import { loginSuccess } from '../../store/slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../utils/colors';
import type { SecurityOfficer } from '../../types/user.types';

type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  ForgotPassword: undefined;
};

type AuthNavigationProp = NativeStackNavigationProp<AuthStackParamList>;

// Safe logo loading - will use image if file exists, otherwise fallback to emoji
const LOGO_PATH = '../../assets/images/safetnet-logo.png';
let logoSource = null;
try {
  logoSource = require(LOGO_PATH);
} catch (e) {
  logoSource = null;
}

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);
  const dispatch = useAppDispatch();
  const navigation = useNavigation<AuthNavigationProp>();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      setIsLoading(true);
      
      // Make login request
      const res = await authService.login({ 
        email, 
        password, 
        device_type: Platform.OS === 'ios' ? 'ios' : 'android' 
      });
      
      // Extract tokens and user data (optimized - minimal processing)
      const accessToken = res.access;
      const user = res.user || { 
        id: 0, 
        username: '', 
        email: '', 
        role: '',
        first_name: '',
        last_name: '',
        mobile: '',
        geofence_id: '',
        user_image: '',
        status: ''
      };
      
      if (!accessToken) {
        throw new Error("Access token not received from server");
      }

      const normalizedRole: SecurityOfficer['security_role'] = (() => {
        switch ((user.role || '').toLowerCase()) {
          case 'admin':
            return 'admin';
          case 'supervisor':
            return 'supervisor';
          case 'guard':
            return 'guard';
          case 'security_officer':
          case 'security':
          default:
            return 'guard';
        }
      })();

      const normalizedStatus: SecurityOfficer['status'] =
        (user.status || '').toLowerCase() === 'inactive' ? 'inactive' : 'active';

      const officer: SecurityOfficer = {
        security_id: String(user.id || ''),
        name: (user.first_name && user.last_name)
          ? `${user.first_name} ${user.last_name}`.trim()
          : (user.first_name || user.username || email),
        email_id: user.email || user.username || email,
        mobile: user.mobile || '',
        security_role: normalizedRole,
        geofence_id: user.geofence_id || '',
        user_image: user.user_image || '',
        status: normalizedStatus,
      };

      // Dispatch login success immediately - navigation happens automatically
      dispatch(loginSuccess({ token: accessToken, officer, navigateToSOS: false }));
      setIsLoading(false); // Clear loading state immediately
    } catch (err: any) {
      setIsLoading(false); // Clear loading state on error
      console.error("Login error:", err);
      console.error("Error response:", err.response && err.response.data ? err.response.data : 'unknown');
      console.error("Error status:", err.response && err.response.status ? err.response.status : 'unknown');
      
      const status = err.response && err.response.status ? err.response.status : undefined;
      const isNetworkError = err.code === 'ERR_NETWORK' || err.message === 'Network Error' || !err.response;
      let errorMessage = 'Invalid Credentials';
      
      // Handle network errors (no response from server)
      if (isNetworkError) {
        errorMessage = 'Cannot reach server. The backend service may be sleeping (Render free tier takes 30-90 seconds to wake up). Please wait 1-2 minutes and try again.';
      } else if (status === 502) {
        // Bad Gateway - Render service is down or sleeping
        errorMessage = 'Backend service is not responding. The service may be sleeping (Render free tier takes 30-90 seconds to wake up). Please wait and try again, or check Render dashboard.';
      } else if (status === 503) {
        errorMessage = 'Service temporarily unavailable. The server is starting up or overloaded. Please wait 1-2 minutes and try again.';
      } else if (status === 400) {
        // 400 Bad Request - show backend's specific error message
        // Handle Django REST Framework error formats
        const backendError = err.response && err.response.data ? err.response.data : null;
        
        if (backendError) {
          // Format: { "non_field_errors": ["Invalid credentials."] }
          if (backendError.non_field_errors && Array.isArray(backendError.non_field_errors)) {
            errorMessage = backendError.non_field_errors[0];
          }
          // Format: { "message": "Invalid credentials" }
          else if (backendError.message) {
            errorMessage = backendError.message;
          }
          // Format: { "error": "Invalid credentials" }
          else if (backendError.error) {
            errorMessage = backendError.error;
          }
          // Format: { "detail": "Invalid credentials" }
          else if (backendError.detail) {
            errorMessage = backendError.detail;
          }
          // Format: string
          else if (typeof backendError === 'string') {
            errorMessage = backendError;
          }
          // Fallback
          else {
            errorMessage = err.message || 'Invalid credentials. Please check your username and password.';
          }
        } else {
          errorMessage = err.message || 'Invalid credentials. Please check your username and password.';
        }
        
        // Log full error details for debugging
        console.error("400 Error Details:", JSON.stringify(backendError, null, 2));
      } else if (status === 401) {
        errorMessage = 'Invalid username or password. Please try again.';
      } else if (status === 503) {
        errorMessage = 'Service temporarily unavailable. The server is down or overloaded. Please try again later.';
      } else if (status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (!err.response) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else {
        errorMessage = (err.response && err.response.data && err.response.data.message) || (err.response && err.response.data && err.response.data.error) || err.message || 'Invalid Credentials';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Section (40% of screen) */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {logoSource ? (
              <Image
                source={logoSource}
                style={styles.logoImage}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.logoFallback}>🛡️</Text>
            )}
          </View>
          <Text style={styles.appName}>SafeTNet Security</Text>
          <Text style={styles.subtitle}>Officer Portal</Text>
        </View>

        {/* Form Section (60% of screen) */}
        <View style={styles.form}>
          <Text style={styles.welcomeText}>Welcome Back</Text>
          <Text style={styles.welcomeSubtext}>Sign in to continue monitoring</Text>

          <Text style={styles.inputLabel}>Badge ID or Email</Text>
          <TextInput
            style={[styles.input, emailFocused && styles.inputFocused]}
            placeholder="Enter your badge ID or email"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={colors.mediumGray}
            returnKeyType="next"
            onSubmitEditing={() => {
              // Focus password field when Enter is pressed on email field
              if (passwordInputRef.current) {
                passwordInputRef.current.focus();
              }
            }}
          />

          <Text style={styles.inputLabel}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              ref={passwordInputRef}
              style={[
                styles.input,
                styles.passwordInput,
                passwordFocused && styles.inputFocused,
              ]}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              secureTextEntry={!showPassword}
              placeholderTextColor={colors.mediumGray}
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.eyeIconText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? 'LOGGING IN...' : 'LOGIN'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>v2.2.0</Text>
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
  scrollContent: {
    flexGrow: 1,
  },
  // Header Section (40% of screen)
  header: {
    backgroundColor: colors.secondary, // #1E3A8A
    paddingTop: 80, // Account for status bar
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logoContainer: {
    width: 200,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoFallback: {
    fontSize: 80,
    color: colors.white,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.white,
    opacity: 0.7,
    marginTop: 4,
  },
  // Form Section (60% of screen)
  form: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    marginTop: -24, // Overlap with header
    flex: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.darkText,
    letterSpacing: -0.5,
  },
  welcomeSubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.lightText,
    marginTop: 4,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.lightText,
    marginBottom: 8,
  },
  input: {
    height: 52,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border, // #E2E8F0
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '400',
    color: colors.darkText,
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 14,
    padding: 4,
    zIndex: 1,
  },
  eyeIconText: {
    fontSize: 20,
    color: colors.mediumGray,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPassword: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.primary,
    textAlign: 'right',
  },
  loginButton: {
    height: 52,
    backgroundColor: colors.primary, // #2563EB
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 0.5,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.captionText,
    textAlign: 'center',
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
  },
});
