import React, {useState, useEffect, useMemo} from 'react';
import {View, Text, ScrollView, ActivityIndicator, RefreshControl} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {apiService} from '../../services/apiService';

const SafetyTipsScreen = () => {
  const [tips, setTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const theme = useTheme();
  const {colors, dark} = theme;

  const themeColors = useMemo(
    () => ({
      background: colors.background || (dark ? '#0F172A' : '#F9FAFB'),
      surface: colors.card || (dark ? '#1E293B' : '#FFFFFF'),
      text: colors.text || (dark ? '#F8FAFC' : '#111827'),
      textMuted: dark ? 'rgba(248, 250, 252, 0.7)' : '#6B7280',
      primary: colors.primary || '#2563EB',
      badgeBg: dark ? 'rgba(37, 99, 235, 0.15)' : '#EFF6FF',
      badgeText: dark ? '#93C5FD' : '#1E40AF',
      border: colors.border || (dark ? 'rgba(148, 163, 184, 0.3)' : '#E5E7EB'),
    }),
    [colors, dark],
  );

  const loadTips = async () => {
    try {
      const response = await apiService.getSafetyTips();
      setTips(response.tips || []);
    } catch (error) {
      console.error('Error loading safety tips:', error);
      // Fallback to default tips
      setTips([
        {
          id: '1',
          title: 'Personal Safety',
          content: 'Always inform someone about your location when traveling alone. Keep emergency contacts easily accessible.',
          category: 'general',
        },
        {
          id: '2',
          title: 'Walking Safety',
          content: 'Stay alert and aware of your surroundings. Walk in well-lit areas, avoid isolated paths, and keep your phone charged. Trust your instincts - if something feels wrong, leave immediately.',
          category: 'walking',
        },
        {
          id: '3',
          title: 'Vehicle Safety',
          content: 'Lock your doors immediately after entering your vehicle. Park in well-lit areas. Keep your keys ready before reaching your car. Check the back seat before getting in.',
          category: 'vehicle',
        },
        {
          id: '4',
          title: 'Home Security',
          content: 'Keep doors and windows locked, especially at night. Install security systems and motion-sensor lights. Never open the door to strangers. Keep emergency numbers near your phone.',
          category: 'home',
        },
        {
          id: '5',
          title: 'Public Transportation',
          content: 'Wait in well-lit, populated areas. Sit near the driver or conductor. Keep your belongings close. Be aware of exits and emergency buttons. Trust your instincts if someone makes you uncomfortable.',
          category: 'transport',
        },
        {
          id: '6',
          title: 'Online Safety',
          content: 'Never share your location in real-time on social media. Be cautious when meeting people from online platforms. Meet in public places and inform someone about your plans.',
          category: 'online',
        },
        {
          id: '7',
          title: 'Emergency Preparedness',
          content: 'Program emergency contacts in your phone. Know your location at all times. Keep a charged power bank with you. Save important numbers for quick access. Practice using the SOS feature.',
          category: 'emergency',
        },
        {
          id: '8',
          title: 'Travel Safety',
          content: 'Share your itinerary with trusted contacts. Keep copies of important documents. Stay in touch regularly. Research your destination beforehand. Know local emergency numbers.',
          category: 'travel',
        },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTips();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTips();
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: themeColors.background,
        }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={{flex: 1, backgroundColor: themeColors.background}}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={themeColors.primary}
          colors={[themeColors.primary]}
        />
      }>
      <View style={{paddingHorizontal: 24, paddingVertical: 16}}>
        <Text style={{fontSize: 24, fontWeight: 'bold', color: themeColors.text, marginBottom: 16}}>
          Safety Tips
        </Text>

        {tips.length === 0 ? (
          <View style={{padding: 32, alignItems: 'center'}}>
            <Text style={{color: themeColors.textMuted, fontSize: 16}}>No safety tips available</Text>
          </View>
        ) : (
          tips.map((tip) => (
          <View
              key={tip.id}
            style={{
                backgroundColor: themeColors.surface,
                borderRadius: 14,
                padding: 18,
              marginBottom: 16,
                shadowColor: dark ? '#000' : '#111827',
                shadowOffset: {width: 0, height: 4},
                shadowOpacity: dark ? 0.35 : 0.1,
                shadowRadius: 12,
                elevation: 3,
                borderWidth: dark ? 1 : 0,
                borderColor: dark ? themeColors.border : 'transparent',
            }}>
              <Text style={{fontSize: 18, fontWeight: '600', color: themeColors.text, marginBottom: 8}}>
                {tip.title}
              </Text>
              <Text style={{fontSize: 14, color: themeColors.textMuted, lineHeight: 20}}>
                {tip.content}
              </Text>
              {tip.category && (
                <View
                  style={{
                    marginTop: 12,
                    alignSelf: 'flex-start',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    backgroundColor: themeColors.badgeBg,
                    borderRadius: 999,
                  }}>
                  <Text style={{fontSize: 12, color: themeColors.badgeText, fontWeight: '600', textTransform: 'capitalize'}}>
                    {tip.category}
            </Text>
              </View>
              )}
          </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

export default SafetyTipsScreen;
