import React, {useState, useEffect} from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {useNavigation} from '@react-navigation/native';
import {Text, View, TouchableOpacity, Modal, BackHandler, StyleSheet, Platform} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import HomeScreen from '../screens/main/HomeScreen';
import TraceMeScreen from '../screens/traceme/TraceMeScreen';
import EmergencyContactScreen from '../screens/emergency/EmergencyContactScreen';
import GeofenceAreaScreen from '../screens/geofence/GeofenceAreaScreen';
import AreaMapScreen from '../screens/maps/AreaMapScreen';
import SafetyTipsScreen from '../screens/safety/SafetyTipsScreen';
import HowItWorksScreen from '../screens/howitworks/HowItWorksScreen';
import SupportContactScreen from '../screens/support/SupportContactScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AlertsScreen from '../screens/alerts/AlertsScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import ReportsScreen from '../screens/reports/ReportsScreen';
import {useAuthStore} from '../stores/authStore';

const Stack = createStackNavigator();

// Custom Drawer Component
const CustomDrawer = ({visible, onClose, navigation}: {visible: boolean; onClose: () => void; navigation: any}) => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [activeScreen, setActiveScreen] = useState('Home');

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
    setActiveScreen(screenName);
    navigation.navigate(screenName);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const menuItems = [
    {name: 'Home', screen: 'Home', icon: 'home', iconType: 'MaterialIcons'},
    {name: 'Alert', screen: 'Alert', icon: 'notifications', iconType: 'MaterialIcons'},
    {name: 'Community', screen: 'Community', icon: 'groups', iconType: 'MaterialIcons'},
    {name: 'Family', screen: 'Family', icon: 'family-restroom', iconType: 'MaterialIcons'},
    {name: 'Safety Tips', screen: 'SafetyTips', icon: 'security', iconType: 'MaterialIcons'},
    {name: 'How it works', screen: 'HowItWorks', icon: 'help-outline', iconType: 'MaterialIcons'},
    {name: 'More', screen: 'More', icon: 'more-horiz', iconType: 'MaterialIcons'},
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.drawerContainer}>
        {/* Drawer Content - Left Side */}
        <LinearGradient
          colors={['#60A5FA', '#2563EB', '#1E40AF']}
          style={styles.drawerContent}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}>
          {/* Profile/Logo Section */}
          <View style={styles.profileSection}>
            <View style={styles.logoCircle}>
              <MaterialIcons name="security" size={40} color="#2563EB" />
            </View>
            <Text style={styles.appName}>SafeTNet</Text>
          </View>

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
                    color="#FFFFFF"
                    style={styles.menuIcon}
                  />
                  <Text style={styles.menuText}>{item.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}>
            <MaterialIcons name="logout" size={24} color="#FFFFFF" style={styles.menuIcon} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </LinearGradient>
        
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

const AppNavigator = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const navigation = useNavigation<any>();

  // Common header left component with drawer button
  const DrawerButton = () => (
    <TouchableOpacity
      onPress={() => setDrawerVisible(true)}
      style={{marginLeft: 16}}>
      <Text style={{color: '#FFFFFF', fontSize: 24}}>☰</Text>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: true,
          headerStyle: {backgroundColor: '#2563EB'},
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {fontWeight: 'bold'},
          headerLeft: () => <DrawerButton />,
          gestureEnabled: false, // Disable swipe back gesture
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerTitle: 'HOME',
          }}
        />
        <Stack.Screen name="Alert" component={AlertsScreen} options={{headerTitle: 'ALERT'}} />
        <Stack.Screen name="Community" component={ChatScreen} options={{headerTitle: 'COMMUNITY'}} />
        <Stack.Screen name="Family" component={EmergencyContactScreen} options={{headerTitle: 'FAMILY'}} />
        <Stack.Screen name="SafetyTips" component={SafetyTipsScreen} options={{headerTitle: 'SAFETY TIPS'}} />
        <Stack.Screen name="HowItWorks" component={HowItWorksScreen} options={{headerTitle: 'HOW IT WORKS'}} />
        <Stack.Screen name="More" component={ReportsScreen} options={{headerTitle: 'MORE'}} />
        {/* Keep other screens for backwards compatibility */}
        <Stack.Screen name="TraceMe" component={TraceMeScreen} options={{headerTitle: 'TRACE ME'}} />
        <Stack.Screen name="EmergencyContact" component={EmergencyContactScreen} options={{headerTitle: 'EMERGENCY CONTACT'}} />
        <Stack.Screen name="GeofenceArea" component={GeofenceAreaScreen} options={{headerTitle: 'GEOFENCE AREA'}} />
        <Stack.Screen name="AreaMap" component={AreaMapScreen} options={{headerTitle: 'AREA MAP'}} />
        <Stack.Screen name="SupportContact" component={SupportContactScreen} options={{headerTitle: 'SUPPORT CONTACTS'}} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{headerTitle: 'PROFILE'}} />
      </Stack.Navigator>
      <CustomDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} navigation={navigation} />
    </>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerContent: {
    width: 280,
    height: '100%',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 20,
    paddingHorizontal: 0,
  },
  profileSection: {
    alignItems: 'center',
    paddingBottom: 30,
    paddingTop: 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  menuContainer: {
    flex: 1,
    paddingTop: 10,
    paddingBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginHorizontal: 12,
    marginVertical: 1,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuIcon: {
    marginRight: 16,
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 12,
    marginTop: 20,
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});

export default AppNavigator;
