import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';
import { goBackOrMainTabs } from '../navigation/goBackOrMainTabs';
import { AppleRefreshControl } from '../components/AppleRefreshControl';
import { useAppData } from '../context/AppDataContext';
import {
  fetchStaffAssignments,
  StaffAssignmentReport,
  subscribeToStaffAssignmentList,
} from '../services/supabaseService';
import { formatPhilippineMobileDisplay } from '../utils/phoneFormat';
import { apple } from '../theme/apple';
import { colors } from '../theme/colors';

function prettyStatus(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusColor(status: string) {
  if (status === 'resolved') {
    return colors.primary;
  }
  if (status === 'in_progress') {
    return '#B54708';
  }
  return '#1e40af';
}

export default function StaffAssignmentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { staffMemberId, refreshStaffAssignmentStats } = useAppData();
  const [reports, setReports] = useState<StaffAssignmentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isPull = false) => {
    if (isPull) {
      setRefreshing(true);
    }
    try {
      if (!staffMemberId) {
        setReports([]);
        return;
      }
      const rows = await fetchStaffAssignments(staffMemberId);
      setReports(rows);
      await refreshStaffAssignmentStats();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!staffMemberId) {
      setLoading(false);
      setReports([]);
      return;
    }
    setLoading(true);
    void load();
    const unsub = subscribeToStaffAssignmentList(staffMemberId, setReports);
    return unsub;
  }, [staffMemberId]);

  if (!staffMemberId) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => goBackOrMainTabs(navigation)} hitSlop={12}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Not linked as staff</Text>
          <Text style={styles.emptyText}>
            Your profile is not linked to a CDRRMO staff record. Ask an administrator to set
            staff_members.profile_id to your profile id.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => goBackOrMainTabs(navigation)} hitSlop={12}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>My assignments</Text>
        <Text style={styles.subtitle}>
          Emergency reports assigned to you as a responder. Updates when the admin dashboard
          changes assignment or status.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading assignments…</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={reports}
          keyExtractor={(item) => item.id}
          refreshControl={
            <AppleRefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No assignments</Text>
              <Text style={styles.emptyText}>
                When a report is assigned to you, it will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.hazard}>{item.hazardType || 'Hazard'}</Text>
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
              <Text style={styles.reporter}>
                {item.reporterName || 'Reporter'}
                {item.reporterContact
                  ? ` · ${formatPhilippineMobileDisplay(item.reporterContact)}`
                  : ''}
              </Text>
              <Text style={styles.meta}>
                {new Date(item.createdAt).toLocaleString()} • {item.locationText || 'No location'}
              </Text>
              <Text style={styles.description}>{item.description || '—'}</Text>
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
  headerRow: {
    paddingHorizontal: apple.insetGroupedMargin,
    paddingTop: 4,
    paddingBottom: 4,
  },
  back: {
    fontSize: 17,
    color: colors.primary,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: apple.insetGroupedMargin,
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
    lineHeight: 20,
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
    lineHeight: 20,
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
  reporter: {
    color: apple.label,
    fontSize: 14,
    fontWeight: '600',
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
  },
  description: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
