import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  useColorScheme,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useNetworkStatus} from '../../services/networkService';
import {useNetworkToastStore} from '../../stores/networkToastStore';

export const NetworkErrorToast = () => {
  const {isConnected, isInternetReachable} = useNetworkStatus();
  const {isVisible, isDismissed, show, hide, dismiss, reset} = useNetworkToastStore();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  const isNetworkAvailable = isConnected && isInternetReachable;

  // Show toast when network is unavailable
  useEffect(() => {
    if (!isNetworkAvailable && !isDismissed) {
      show();
    }
  }, [isNetworkAvailable, isDismissed, show]);

  // Hide toast and reset when network comes back
  useEffect(() => {
    if (isNetworkAvailable && isVisible) {
      hide();
      reset(); // Reset dismissed state when network comes back
    }
  }, [isNetworkAvailable, isVisible, hide, reset]);

  // Animate toast appearance
  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, slideAnim, opacityAnim]);

  if (!isVisible) {
    return null;
  }

  const backgroundColor = isDark ? '#1F2937' : '#FFFFFF';
  const textColor = isDark ? '#F9FAFB' : '#1F2937';
  const borderColor = isDark ? '#374151' : '#E5E7EB';
  const errorColor = '#EF4444';
  const iconBgColor = isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          transform: [{translateY: slideAnim}],
          opacity: opacityAnim,
        },
      ]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, {backgroundColor: iconBgColor}]}>
          <MaterialIcons name="wifi-off" size={24} color={errorColor} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, {color: textColor}]}>No Internet Connection</Text>
          <Text style={[styles.message, {color: textColor, opacity: 0.7}]}>
            Please check your network settings
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismiss}
          activeOpacity={0.7}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <MaterialIcons name="close" size={20} color={textColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default NetworkErrorToast;

