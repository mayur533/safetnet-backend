import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, TouchableOpacity, RefreshControl} from 'react-native';
import {format} from 'date-fns';
import {useAuthStore} from '../../stores/authStore';
import {apiService} from '../../services/apiService';

interface Report {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  location: {address: string};
  createdAt: Date;
}

const ReportsScreen = ({navigation}: any) => {
  const user = useAuthStore((state) => state.user);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // Load reports from API (using SOS events as reports)
  useEffect(() => {
    if (user?.id) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const sosEvents = await apiService.getSOSEvents(parseInt(user.id));
      // Transform SOS events to reports format
      const transformedReports: Report[] = Array.isArray(sosEvents)
        ? sosEvents.map((event: any, index: number) => ({
            id: event.id?.toString() || `report-${index}`,
            title: event.notes || 'SOS Event',
            description: `Emergency SOS triggered${event.location ? ' with location data' : ''}`,
            type: 'Emergency',
            status: event.status || 'resolved',
            location: {
              address: event.location 
                ? `${event.location.latitude.toFixed(4)}, ${event.location.longitude.toFixed(4)}`
                : 'Location not available',
            },
            createdAt: event.created_at ? new Date(event.created_at) : new Date(),
          }))
        : [];
      setReports(transformedReports);
    } catch (error) {
      console.error('Failed to load reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return {bg: '#FEF3C7', text: '#92400E'};
      case 'in_progress':
        return {bg: '#DBEAFE', text: '#1E40AF'};
      case 'resolved':
        return {bg: '#D1FAE5', text: '#065F46'};
      default:
        return {bg: '#F3F4F6', text: '#374151'};
    }
  };

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: '#F9FAFB'}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{paddingHorizontal: 24, paddingVertical: 16}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
          <Text style={{fontSize: 24, fontWeight: 'bold', color: '#111827'}}>Reports</Text>
          <TouchableOpacity
            style={{backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8}}
            onPress={() => {}}>
            <Text style={{color: '#FFFFFF', fontWeight: '600'}}>+ New</Text>
          </TouchableOpacity>
        </View>

        {reports.length === 0 && !loading ? (
          <View style={{padding: 32, alignItems: 'center'}}>
            <Text style={{fontSize: 16, color: '#6B7280'}}>No reports available</Text>
          </View>
        ) : (
          reports.map((report) => {
          const statusColors = getStatusColor(report.status);
          return (
            <TouchableOpacity
              key={report.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: {width: 0, height: 1},
                shadowOpacity: 0.05,
                shadowRadius: 2,
              }}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8}}>
                <Text style={{color: '#111827', fontWeight: 'bold', fontSize: 16, flex: 1}}>
                  {report.title}
                </Text>
                <View style={{backgroundColor: statusColors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12}}>
                  <Text style={{color: statusColors.text, fontSize: 12, fontWeight: '600', textTransform: 'capitalize'}}>
                    {report.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
              <Text style={{color: '#6B7280', fontSize: 14, marginBottom: 8}}>{report.description}</Text>
              <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
                <Text style={{fontSize: 12, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4}}>
                  {report.type}
                </Text>
              </View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8}}>
                <Text style={{color: '#9CA3AF', fontSize: 12}}>📍 {report.location.address}</Text>
                <Text style={{color: '#9CA3AF', fontSize: 12}}>
                  {format(report.createdAt, 'MMM d, yyyy')}
                </Text>
              </View>
            </TouchableOpacity>
          );
          })
        )}
      </View>
    </ScrollView>
  );
};

export default ReportsScreen;
