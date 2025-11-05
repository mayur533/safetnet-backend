import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import {useAuthStore} from '../../stores/authStore';

const {width, height} = Dimensions.get('window');

const HomeScreen = ({navigation}: any) => {
  const user = useAuthStore((state) => state.user);

  const handlePanicButton = () => {
    Alert.alert(
      'PANIC ALERT',
      'Emergency alert will be sent to all contacts. Are you sure?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'SEND ALERT',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Alert Sent', 'Emergency alert has been sent to your contacts and authorities.');
          },
        },
      ]
    );
  };

  const renderPanicDiagram = () => {
    return (
      <View style={styles.diagramContainer}>
        <View style={styles.circleOuter}>
          {/* Family Segment - Top Left */}
          <View style={[styles.segment, styles.segmentTopLeft, {backgroundColor: '#2563EB'}]}>
            <MaterialIcons name="people" size={28} color="#FFFFFF" />
            <Text style={[styles.segmentText, {color: '#FFFFFF'}]}>Family</Text>
          </View>
          
          {/* Community Segment - Top Right */}
          <View style={[styles.segment, styles.segmentTopRight, {backgroundColor: '#2563EB'}]}>
            <MaterialIcons name="groups" size={28} color="#FFFFFF" />
            <Text style={[styles.segmentText, {color: '#FFFFFF'}]}>Community</Text>
          </View>
          
          {/* Police Segment - Bottom Left */}
          <View style={[styles.segment, styles.segmentBottomLeft, {backgroundColor: '#2563EB'}]}>
            <MaterialIcons name="local-police" size={28} color="#FFFFFF" />
            <Text style={[styles.segmentText, {color: '#FFFFFF'}]}>Police</Text>
          </View>
          
          {/* Security Segment - Bottom Right */}
          <View style={[styles.segment, styles.segmentBottomRight, {backgroundColor: '#9CA3AF'}]}>
            <MaterialIcons name="security" size={28} color="#FFFFFF" />
            <Text style={[styles.segmentText, {color: '#FFFFFF'}]}>Security</Text>
          </View>
          
          {/* Central PANIC Button */}
          <TouchableOpacity
            style={styles.panicButton}
            onPress={handlePanicButton}
            activeOpacity={0.8}>
            <Text style={styles.panicText}>PANIC</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Welcome Section with Blue Background */}
      <LinearGradient
        colors={['#60A5FA', '#2563EB']}
        style={styles.welcomeSection}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}>
        <Text style={styles.welcomeText}>Welcome</Text>
        <Text style={styles.userNameText}>{user?.name || 'User'}</Text>
      </LinearGradient>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        <View style={styles.diagramSection}>
          {renderPanicDiagram()}
        </View>
      </View>

      {/* Footer with Logo */}
      <View style={styles.footer}>
        <MaterialIcons name="security" size={20} color="#9CA3AF" />
        <Text style={styles.footerText}>Safe T Net</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flexGrow: 1,
  },
  welcomeSection: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  userNameText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 20,
  },
  diagramSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diagramContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOuter: {
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
    backgroundColor: '#E5E7EB',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  segment: {
    position: 'absolute',
    width: '50%',
    height: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentTopLeft: {
    top: 0,
    left: 0,
    borderTopLeftRadius: width * 0.375,
  },
  segmentTopRight: {
    top: 0,
    right: 0,
    borderTopRightRadius: width * 0.375,
  },
  segmentBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomLeftRadius: width * 0.375,
  },
  segmentBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomRightRadius: width * 0.375,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  panicButton: {
    position: 'absolute',
    top: (width * 0.75) / 2 - 45,
    left: (width * 0.75) / 2 - 45,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  panicText: {
    color: '#1E40AF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingBottom: 24,
  },
  footerText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});

export default HomeScreen;
