import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import {useTheme} from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useIncidentStore} from '../../stores/incidentStore';

const {width} = Dimensions.get('window');
const CARD_WIDTH = width - 32;

const IncidentHistoryScreen = () => {
  const {colors, dark} = useTheme();
  const insets = useSafeAreaInsets();
  const loadIncidents = useIncidentStore((state) => state.load);
  const incidents = useIncidentStore((state) => state.incidents);
  const clearIncidents = useIncidentStore((state) => state.clearIncidents);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  useEffect(() => {
    loadIncidents().catch((error) => console.warn('Failed to load incidents', error));
  }, [loadIncidents]);

  const tokens = useMemo(
    () => ({
      surfaceMuted: dark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
      border: colors.border || (dark ? 'rgba(148, 163, 184, 0.35)' : '#E2E8F0'),
      accent: colors.primary || '#2563EB',
      text: colors.text || '#0F172A',
      muted: dark ? 'rgba(226, 232, 240, 0.7)' : '#475569',
      card: colors.card || (dark ? '#0F172A' : '#FFFFFF'),
      success: '#22C55E',
      warning: '#F97316',
    }),
    [colors, dark],
  );

  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadIncidents().catch((error) => console.warn('Failed to refresh incidents', error));
    setRefreshing(false);
  };

  const renderItem = ({item}: typeof incidents extends (infer Incident)[] ? {item: Incident} : never) => {
    const timestamp = new Date(item.timestamp);
    const formattedDate = timestamp.toLocaleString();
    return (
      <TouchableOpacity
        style={[
          styles.incidentCard,
          {
            backgroundColor: tokens.card,
            borderColor: tokens.border,
          },
        ]}
        onPress={() => setSelectedIncidentId(item.id)}
        activeOpacity={0.85}>
        <View style={styles.incidentHeader}>
          <View style={styles.headerLeft}>
            <MaterialIcons
              name={item.smsSent ? 'sms' : 'sms-failed'}
              size={20}
              color={item.smsSent ? tokens.success : tokens.warning}
            />
            <Text style={[styles.incidentTitle, {color: tokens.text}]}>
              {item.smsSent ? 'SOS dispatched' : 'SOS pending'}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <MaterialIcons
              name={item.callPlaced ? 'call' : 'call-end'}
              size={14}
              color={item.callPlaced ? tokens.success : tokens.warning}
            />
            <Text
              style={[
                styles.statusText,
                {color: item.callPlaced ? tokens.success : tokens.warning},
              ]}>
              {item.callPlaced ? 'Call placed' : 'Call not placed'}
            </Text>
          </View>
        </View>
        <Text style={[styles.incidentMessage, {color: tokens.text}]} numberOfLines={2}>
          {item.message || 'No message recorded for this incident.'}
        </Text>
        <Text style={[styles.incidentMeta, {color: tokens.muted}]}>{formattedDate}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: colors.background, paddingTop: insets.top + 12}]}>
      <View style={styles.header}>
        <MaterialIcons name="history" size={22} color={tokens.accent} />
        <Text style={[styles.headerTitle, {color: tokens.text}]}>Incident history</Text>
        <TouchableOpacity
          onPress={() => clearIncidents().catch((error) => console.warn('Failed to clear incidents', error))}
          activeOpacity={0.7}>
          <Text style={[styles.clearText, {color: tokens.accent}]}>Clear</Text>
        </TouchableOpacity>
      </View>

      {incidents.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="check-circle" size={54} color={tokens.muted} />
          <Text style={[styles.emptyTitle, {color: tokens.text}]}>No incidents yet</Text>
          <Text style={[styles.emptySubtitle, {color: tokens.muted}]}>
            Your SOS history will appear here once you trigger alerts.
          </Text>
        </View>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal
        visible={!!selectedIncident}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedIncidentId(null)}>
        <View style={[styles.modalOverlay, {backgroundColor: dark ? 'rgba(2,6,23,0.7)' : 'rgba(15,23,42,0.45)'}]}>
          <View style={[styles.modalContainer, {backgroundColor: tokens.card, borderColor: tokens.border}]}>
            <View style={styles.modalHeader}>
              <MaterialIcons name="report" size={22} color={tokens.accent} />
              <Text style={[styles.modalTitle, {color: tokens.text}]}>Incident details</Text>
              <TouchableOpacity onPress={() => setSelectedIncidentId(null)} activeOpacity={0.7}>
                <MaterialIcons name="close" size={24} color={tokens.muted} />
              </TouchableOpacity>
            </View>
            {selectedIncident ? (
              <>
                <View style={styles.modalBadgeRow}>
                  <View
                    style={[
                      styles.modalBadge,
                      {backgroundColor: selectedIncident.smsSent ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)'},
                    ]}>
                    <MaterialIcons
                      name={selectedIncident.smsSent ? 'task-alt' : 'priority-high'}
                      size={16}
                      color={selectedIncident.smsSent ? tokens.success : tokens.warning}
                    />
                    <Text
                      style={[
                        styles.modalBadgeText,
                        {color: selectedIncident.smsSent ? tokens.success : tokens.warning},
                      ]}>
                      {selectedIncident.smsSent ? 'SMS delivered' : 'SMS not confirmed'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.modalBadge,
                      {backgroundColor: selectedIncident.callPlaced ? 'rgba(34,197,94,0.12)' : 'rgba(249,115,22,0.12)'},
                    ]}>
                    <MaterialIcons
                      name={selectedIncident.callPlaced ? 'call' : 'call-end'}
                      size={16}
                      color={selectedIncident.callPlaced ? tokens.success : tokens.warning}
                    />
                    <Text
                      style={[
                        styles.modalBadgeText,
                        {color: selectedIncident.callPlaced ? tokens.success : tokens.warning},
                      ]}>
                      {selectedIncident.callPlaced ? 'Call placed' : 'Call skipped'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.modalMessage, {color: tokens.text}]}>
                  {selectedIncident.message || 'No message recorded.'}
                </Text>
                <View style={styles.metaRow}>
                  <MaterialIcons name="schedule" size={18} color={tokens.muted} />
                  <Text style={[styles.metaText, {color: tokens.muted}]}>
                    {new Date(selectedIncident.timestamp).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialIcons name="phone" size={18} color={tokens.muted} />
                  <Text style={[styles.metaText, {color: tokens.muted}]}>
                    {selectedIncident.callNumber ? selectedIncident.callNumber : 'No call number'}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialIcons name="contacts" size={18} color={tokens.muted} />
                  <Text style={[styles.metaText, {color: tokens.muted}]}>
                    Recipients: {selectedIncident.recipients.join(', ') || 'None recorded'}
                  </Text>
                </View>
              </>
            ) : null}
            <TouchableOpacity
              style={[
                styles.closeModalButton,
                {backgroundColor: tokens.surfaceMuted, borderColor: tokens.border},
              ]}
              onPress={() => setSelectedIncidentId(null)}
              activeOpacity={0.75}>
              <Text style={[styles.closeModalText, {color: tokens.text}]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  incidentCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 12,
    alignSelf: 'center',
    marginBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incidentTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  incidentMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  incidentMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 13,
    flex: 1,
  },
  closeModalButton: {
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  closeModalText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default IncidentHistoryScreen;


