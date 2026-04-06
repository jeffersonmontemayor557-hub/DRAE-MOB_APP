import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '../context/AppDataContext';
import {
  fetchMyIncidentReports,
  MyIncidentReport,
  subscribeToMyIncidentReports,
} from '../services/supabaseService';
import { AppleRefreshControl } from '../components/AppleRefreshControl';
import { apple } from '../theme/apple';
import { colors } from '../theme/colors';

function prettyStatus(status: string) {
  return status.replaceAll('_', ' ').toUpperCase();
}

function statusColor(status: string) {
  if (status === 'resolved') {
    return '#1a7a4a';
  }
  if (status === 'in_progress') {
    return '#B54708';
  }
  return '#344054';
}

export default function MyReportsScreen() {
  const { profile, profileRecordId } = useAppData();
  const [reports, setReports] = useState<MyIncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filter = useMemo(
    () => ({
      profileId: profileRecordId,
      reporterName: profile.fullName,
      reporterContact: profile.contactNumber,
    }),
    [profileRecordId, profile.fullName, profile.contactNumber],
  );

  const loadReports = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    }
    try {
      const rows = await fetchMyIncidentReports(filter);
      setReports(rows);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadReports();
    const unsubscribe = subscribeToMyIncidentReports(filter, setReports);
    return unsubscribe;
  }, [filter]);

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open file', 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Reports</Text>
        <Text style={styles.subtitle}>Track your submitted incidents in real time.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your reports...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={reports}
          keyExtractor={(item) => item.id}
          refreshControl={
            <AppleRefreshControl
              refreshing={refreshing}
              onRefresh={() => loadReports(true)}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No reports yet</Text>
              <Text style={styles.emptyText}>
                Submit an incident from the Emergency tab and it will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.hazard}>{item.hazardType || 'Unspecified Hazard'}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { borderColor: statusColor(item.status), backgroundColor: '#FFFFFF' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                    {prettyStatus(item.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.meta}>
                {new Date(item.createdAt).toLocaleString()} • {item.locationText || 'No location'}
              </Text>
              {item.assignedStaffName ? (
                <Text style={styles.assignedLine}>
                  Assigned responder: {item.assignedStaffName}
                  {item.assignedStaffPhone ? ` • ${item.assignedStaffPhone}` : ''}
                </Text>
              ) : null}
              <Text style={styles.description}>{item.description || '-'}</Text>

              <View style={styles.actions}>
                {item.evidenceUrl ? (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openUrl(item.evidenceUrl)}
                  >
                    <Text style={styles.actionText}>VIEW PHOTO</Text>
                  </TouchableOpacity>
                ) : null}
                {item.audioUrl ? (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openUrl(item.audioUrl)}
                  >
                    <Text style={styles.actionText}>PLAY AUDIO</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: apple.groupedBackground,
  },
  header: {
    paddingHorizontal: apple.insetGroupedMargin,
    paddingTop: 10,
    paddingBottom: 8,
  },
  title: {
    color: apple.label,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.25,
  },
  subtitle: {
    color: apple.secondaryLabel,
    marginTop: 4,
    fontSize: 15,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: colors.muted,
  },
  listContent: {
    paddingHorizontal: apple.insetGroupedMargin,
    paddingVertical: 8,
    paddingBottom: 18,
    gap: 12,
  },
  emptyWrap: {
    marginTop: 36,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: '700',
  },
  emptyText: {
    marginTop: 8,
    color: colors.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: apple.secondaryGrouped,
    borderRadius: apple.cardRadius,
    padding: 14,
    gap: 8,
    ...apple.cardShadow,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  hazard: {
    flex: 1,
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '800',
  },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
  assignedLine: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '700',
  },
  description: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BCD4C4',
    backgroundColor: '#F3FAF6',
  },
  actionText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
});
