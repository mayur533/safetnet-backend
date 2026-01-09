import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateOfficerProfile } from '../../store/slices/authSlice';
import { profileService } from '../../api/services';
import { colors, shadows, spacing, typography } from '../../utils';
import Icon from 'react-native-vector-icons/MaterialIcons';

export const UpdateProfileScreen = ({ navigation, route }: any) => {
  const officer = useAppSelector((state) => state.auth.officer);
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [shiftSchedule, setShiftSchedule] = useState('');

  // Load profile data when component mounts
  useEffect(() => {
    const loadProfileData = async () => {
      if (!(officer && officer.security_id)) return;

      try {
        setIsLoading(true);
        const profile: any = await profileService.getProfile(officer.security_id);

        // Extract and set form values
        setName(
          profile.officer_name ||
          profile.name ||
          (profile.first_name && profile.last_name
            ? `${profile.first_name} ${profile.last_name}`.trim()
            : '') ||
          profile.first_name ||
          officer.name ||
          ''
        );
        setEmail(profile.email_id || profile.email || profile.officer_email || officer.email_id || '');

        // Extract phone number from all possible backend fields
        const phoneNumber =
          // Direct profile fields
          profile.mobile ||
          profile.phone ||
          profile.officer_phone ||
          profile.phone_number ||
          profile.contact_number ||
          profile.contact_phone ||
          profile.phone_no ||
          profile.contact ||
          // Nested user object fields
          (profile.user && profile.user.mobile) ||
          (profile.user && profile.user.phone) ||
          (profile.user && profile.user.phone_number) ||
          (profile.user && profile.user.contact_number) ||
          // SecurityOfficer model fields
          (profile.security_officer && profile.security_officer.mobile) ||
          (profile.security_officer && profile.security_officer.phone) ||
          // Officer profile fields
          (profile.officer && profile.officer.mobile) ||
          (profile.officer && profile.officer.phone) ||
          // Fallback to Redux officer data
          officer.mobile ||
          '';

        console.log('[UpdateProfileScreen] Phone number extraction:', {
          'profile.mobile': profile.mobile,
          'profile.user.mobile': profile.user && profile.user.mobile,
          'profile.security_officer.mobile': profile.security_officer && profile.security_officer.mobile,
          'officer.mobile': officer.mobile,
          'extracted_phone': phoneNumber,
        });

        setMobile(phoneNumber);
        setBadgeNumber(profile.badge_number || profile.badge_id || officer.badge_number || '');
        setShiftSchedule(profile.shift_schedule || profile.shift || officer.shift_schedule || '');
      } catch (error: any) {
        console.error('[UpdateProfileScreen] Error loading profile:', error);
        // Use existing officer data as fallback
        setName(officer.name || '');
        setEmail(officer.email_id || '');
        setMobile(officer.mobile || '');
        setBadgeNumber(officer.badge_number || '');
        setShiftSchedule(officer.shift_schedule || '');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [officer && officer.security_id]);

  const handleSave = async () => {
    if (!(officer && officer.security_id)) {
      Alert.alert('Error', 'Officer ID not found');
      return;
    }

    // Basic validation
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    try {
      setIsSaving(true);
      console.log('[UpdateProfileScreen] Updating profile with:', {
        security_id: officer.security_id,
        name: name.trim(),
        email_id: email.trim(),
        mobile: mobile.trim(),
        badge_number: badgeNumber.trim(),
        shift_schedule: shiftSchedule.trim(),
      });

      // Prepare update payload
      const updateData: any = {
        name: name.trim(),
        email_id: email.trim(),
      };

      if (mobile.trim()) {
        updateData.mobile = mobile.trim();
      }
      if (badgeNumber.trim()) {
        updateData.badge_number = badgeNumber.trim();
      }
      if (shiftSchedule.trim()) {
        updateData.shift_schedule = shiftSchedule.trim();
      }

      // Call update API
      const response = await profileService.updateProfile(officer.security_id, updateData);

      console.log('[UpdateProfileScreen] Profile update response:', response);

      // Update Redux store with the new profile data
      dispatch(updateOfficerProfile({
        name: name.trim(),
        email_id: email.trim(),
        mobile: mobile.trim() || '',
        badge_number: badgeNumber.trim() || '',
        shift_schedule: shiftSchedule.trim() || '',
      }));

      Alert.alert('Success', 'Profile updated successfully');

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (error: any) {
      console.error('[UpdateProfileScreen] Error updating profile:', error);
      const errorMessage = (error.response && error.response.data && error.response.data.message) ||
                          (error.response && error.response.data && error.response.data.error) ||
                          error.message ||
                          'Failed to update profile';

      Alert.alert('Update Failed', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color={colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Update Profile</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Name Field */}
        <View style={styles.section}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={colors.mediumGray}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Email Field */}
        <View style={styles.section}>
          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={colors.mediumGray}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Phone Field */}
        <View style={styles.section}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            placeholderTextColor={colors.mediumGray}
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
          />
        </View>

        {/* Badge Number Field */}
        <View style={styles.section}>
          <Text style={styles.label}>Badge Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter badge number"
            placeholderTextColor={colors.mediumGray}
            value={badgeNumber}
            onChangeText={setBadgeNumber}
            autoCapitalize="characters"
          />
        </View>

        {/* Shift Schedule Field */}
        <View style={styles.section}>
          <Text style={styles.label}>Shift Schedule</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Morning Shift (6 AM - 2 PM)"
            placeholderTextColor={colors.mediumGray}
            value={shiftSchedule}
            onChangeText={setShiftSchedule}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>SAVE CHANGES</Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>CANCEL</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.darkText,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border || '#E5E7EB',
    ...shadows.sm,
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
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.darkText,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.lightGrayBg || '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.darkText,
    borderWidth: 1,
    borderColor: colors.border || '#E5E7EB',
  },
  saveButton: {
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    letterSpacing: 0.5,
  },
  cancelButton: {
    height: 52,
    backgroundColor: colors.white,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border || '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.darkText,
    letterSpacing: 0.5,
  },
});