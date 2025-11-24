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
