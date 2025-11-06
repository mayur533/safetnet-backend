import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface CustomHeaderProps {
  title: string;
  onMenuPress: () => void;
  onSettingsPress?: () => void;
  showNotification?: boolean;
  subtitle?: string;
  icon?: string;
  showSettings?: boolean;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  onMenuPress,
  onSettingsPress,
  showNotification = false,
  subtitle,
  icon,
  showSettings = false,
}) => {
  const insets = useSafeAreaInsets();
  const statusBarHeight = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : insets.top;

  return (
    <View style={[styles.header, {paddingTop: statusBarHeight}]}>
      {/* Top row - Drawer, Title with icon, Settings */}
      <View style={styles.headerTopRow}>
        {/* Left side - Drawer icon */}
        <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
          <MaterialIcons name="menu" size={24} color="#374151" />
        </TouchableOpacity>
        
        {/* Left - Title aligned to left */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
        
        {/* Right side - Settings icon (only on Home page) */}
        {showSettings && (
          <TouchableOpacity
            onPress={onSettingsPress}
            style={styles.settingsButton}>
            <View style={styles.settingsContainer}>
              <MaterialIcons name="settings" size={24} color="#374151" />
              {showNotification && <View style={styles.notificationDot} />}
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    minHeight: 48,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  menuButton: {
    padding: 4,
    width: 40,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'left',
  },
  settingsButton: {
    padding: 4,
    width: 40,
    alignItems: 'flex-end',
  },
  settingsContainer: {
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#F3F4F6',
  },
});

export default CustomHeader;

