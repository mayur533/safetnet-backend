import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, ActivityIndicator, RefreshControl} from 'react-native';
import {apiService} from '../../services/apiService';

const SafetyTipsScreen = () => {
  const [tips, setTips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB'}}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={{flex: 1, backgroundColor: '#F9FAFB'}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{paddingHorizontal: 24, paddingVertical: 16}}>
        <Text style={{fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 16}}>
          Safety Tips
        </Text>

        {tips.length === 0 ? (
          <View style={{padding: 32, alignItems: 'center'}}>
            <Text style={{color: '#6B7280', fontSize: 16}}>No safety tips available</Text>
          </View>
        ) : (
          tips.map((tip) => (
          <View
              key={tip.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
                padding: 16,
              marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 2},
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
            }}>
              <Text style={{fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8}}>
                {tip.title}
              </Text>
              <Text style={{fontSize: 14, color: '#6B7280', lineHeight: 20}}>
                {tip.content}
              </Text>
              {tip.category && (
                <View style={{marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#EFF6FF', borderRadius: 6}}>
                  <Text style={{fontSize: 12, color: '#1E40AF', fontWeight: '500'}}>
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
