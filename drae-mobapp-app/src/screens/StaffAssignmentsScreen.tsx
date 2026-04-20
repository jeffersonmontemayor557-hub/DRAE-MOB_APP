import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  resolveStaffAssignment,
  StaffAssignmentReport,
  startStaffAssignment,
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
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  const handleAction = async (
    reportId: string,
    kind: 'start' | 'resolve',
  ) => {
    if (actionPendingId) {
      return;
    }
    setActionPendingId(reportId);
    try {
      if (kind === 'start') {
        await startStaffAssignment(reportId);
      } else {
        await resolveStaffAssignment(reportId);
      }
      const rows = await fetchStaffAssignments(staffMemberId!);
      setReports(rows);
      await refreshStaffAssignmentStats();
    } catch (err: any) {
      const msg =
        err?.message || err?.hint || 'Unable to update the report. Please try again.';
      Alert.alert(
        kind === 'start' ? 'Could not start report' : 'Could not resolve report',
        msg,
      );
    } finally {
      setActionPendingId(null);
    }
  };

  const confirmResolve = (reportId: string, hazard: string) => {
    Alert.alert(
      'Mark as resolved?',
      `Confirm this ${hazard || 'report'} has been handled. Once resolved, the next queued report can be dispatched to you.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark resolved',
          style: 'destructive',
          onPress: () => void handleAction(reportId, 'resolve'),
        },
      ],
    );
  };

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
              {item.status !== 'resolved' ? (
                <View style={styles.actionsRow}>
                  {item.status === 'submitted' ? (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        styles.actionBtnStart,
                        actionPendingId === item.id && styles.actionBtnDisabled,
                      ]}
                      disabled={actionPendingId === item.id}
                      onPress={() => void handleAction(item.id, 'start')}
                    >
                      {actionPendingId === item.id ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.actionBtnText}>Accept · Start response</Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                  {item.status === 'in_progress' ? (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        styles.actionBtnResolve,
                        actionPendingId === item.id && styles.actionBtnDisabled,
                      ]}
                      disabled={actionPendingId === item.id}
                      onPress={() => confirmResolve(item.id, item.hazardType)}
                    >
                      {actionPendingId === item.id ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.actionBtnText}>Mark as resolved</Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
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
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnStart: {
    backgroundColor: '#B54708',
  },
  actionBtnResolve: {
    backgroundColor: colors.primary,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
