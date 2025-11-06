import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, Modal, BackHandler, StyleSheet} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useAuthStore} from '../../stores/authStore';

interface CustomDrawerProps {
  visible: boolean;
  onClose: () => void;
  navigation: any;
  showLoginModal?: () => void;
}

const CustomDrawer = ({visible, onClose, navigation, showLoginModal}: CustomDrawerProps) => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [activeScreen, setActiveScreen] = useState('Home');
  
  // Get user name - use email if name is not available
  const userName = user?.name || user?.email?.split('@')[0] || 'User';
  
  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good Morning';
    } else if (hour < 17) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  };
  
  const greeting = getGreeting();

  useEffect(() => {
    if (visible) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        onClose();
        return true;
      });
      return () => backHandler.remove();
    }
  }, [visible, onClose]);

  // Get current route name
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', () => {
      const route = navigation.getState()?.routes[navigation.getState()?.index || 0];
      if (route) {
        setActiveScreen(route.name);
      }
    });
    return unsubscribe;
  }, [navigation]);

  const handleNavigate = (screenName: string) => {
    // Check if user is authenticated for protected screens
    const protectedScreens = ['Alert', 'Community', 'Family', 'Profile', 'Settings'];
    
    if (!isAuthenticated && protectedScreens.includes(screenName)) {
      // Close drawer and show login modal
      onClose();
      if (showLoginModal) {
        showLoginModal();
      }
      return;
    }

    // Allow navigation to Home and HowItWorks without authentication
    if (screenName === 'Home' || screenName === 'HowItWorks' || screenName === 'SafetyTips') {
      setActiveScreen(screenName);
      navigation.navigate(screenName);
      onClose();
      return;
    }

    // For authenticated users, navigate normally
    if (isAuthenticated) {
      setActiveScreen(screenName);
      navigation.navigate(screenName);
      onClose();
    } else {
      // Close drawer and show login modal
      onClose();
      if (showLoginModal) {
        showLoginModal();
      }
    }
  };

  const handleSettings = () => {
    if (!isAuthenticated) {
      onClose();
      if (showLoginModal) {
        showLoginModal();
      }
      return;
    }
    navigation.navigate('Settings');
    onClose();
  };

  const handleProfile = () => {
    if (!isAuthenticated) {
      onClose();
      if (showLoginModal) {
        showLoginModal();
      }
      return;
    }
    navigation.navigate('Profile');
    onClose();
  };

  const menuItems = [
    {name: 'Home', screen: 'Home', icon: 'home', iconType: 'MaterialIcons'},
    {name: 'Alert', screen: 'Alert', icon: 'notifications', iconType: 'MaterialIcons'},
    {name: 'Community', screen: 'Community', icon: 'groups', iconType: 'MaterialIcons'},
    {name: 'Family', screen: 'Family', icon: 'family-restroom', iconType: 'MaterialIcons'},
    {name: 'Safety Tips', screen: 'SafetyTips', icon: 'security', iconType: 'MaterialIcons'},
    {name: 'How it works', screen: 'HowItWorks', icon: 'help-outline', iconType: 'MaterialIcons'},
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.drawerContainer}>
        {/* Drawer Content - Left Side */}
        <View style={styles.drawerContent}>
          {/* Profile/User Section - White background matching home screen */}
          <TouchableOpacity
            style={styles.profileSection}
            onPress={handleProfile}
            activeOpacity={0.7}>
            <View style={styles.userIconCircle}>
              <MaterialIcons name="account-circle" size={60} color="#2563EB" />
            </View>
            <Text style={styles.greetingText}>{greeting}</Text>
            <Text style={styles.userNameText}>{userName}</Text>
          </TouchableOpacity>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => {
              const isActive = activeScreen === item.screen;
              const IconComponent = item.iconType === 'MaterialIcons' ? MaterialIcons : Ionicons;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => handleNavigate(item.screen)}
                  activeOpacity={0.7}>
                  <IconComponent
                    name={item.icon}
                    size={24}
                    color={isActive ? "#2563EB" : "#6B7280"}
                    style={styles.menuIcon}
                  />
                  <Text style={[styles.menuText, isActive && {color: '#2563EB', fontWeight: '600'}]}>{item.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Settings Button */}
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={handleSettings}
            activeOpacity={0.7}>
            <MaterialIcons name="settings" size={24} color="#2563EB" style={styles.menuIcon} />
            <Text style={styles.settingsText}>Settings</Text>
          </TouchableOpacity>
        </View>
        
        {/* Overlay - Right Side */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerContent: {
    width: '75%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 2, height: 0},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  userIconCircle: {
    marginBottom: 12,
  },
  greetingText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  menuContainer: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  menuItemActive: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#374151',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  settingsText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});

export default CustomDrawer;

