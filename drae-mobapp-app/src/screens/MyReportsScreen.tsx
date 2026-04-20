import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
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
import {
  loadIncidentReportQueue,
  processIncidentReportQueue,
  type QueuedIncidentReport,
} from '../services/incidentReportQueue';
import { formatPhilippineMobileDisplay } from '../utils/phoneFormat';
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

function assistanceStepIndex(status: string) {
  if (status === 'resolved') {
    return 3;
  }
  if (status === 'in_progress') {
    return 1;
  }
  return 0;
}

function AssistanceTracker({ status, referenceId }: { status: string; referenceId: string }) {
  const steps = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'validating', label: 'Validating' },
    { key: 'approved', label: 'Approved' },
  ] as const;
  const active = assistanceStepIndex(status);
  return (
    <View style={trackerStyles.wrap}>
      <Text style={trackerStyles.refLabel}>Reference</Text>
      <Text style={trackerStyles.refId} selectable>
        {referenceId}
      </Text>
      <View style={trackerStyles.row}>
        {steps.map((step, i) => {
          const done = i < active;
          const current = i === active && active < 3;
          return (
            <View key={step.key} style={trackerStyles.stepCol}>
              <View
                style={[
                  trackerStyles.dot,
                  done && trackerStyles.dotDone,
                  current && trackerStyles.dotCurrent,
                ]}
              />
              <Text
                style={[
                  trackerStyles.stepText,
                  (done || current) && trackerStyles.stepTextActive,
                ]}
                numberOfLines={2}
              >
                {step.label}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={trackerStyles.hint}>
        {status === 'resolved'
          ? 'Your report is closed. Keep this reference for any follow-up.'
          : status === 'in_progress'
            ? 'Responders are reviewing your report.'
            : 'Queued for validation. You will see updates here.'}
      </Text>
    </View>
  );
}

const trackerStyles = StyleSheet.create({
  wrap: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#C5D9CE',
    gap: 6,
  },
  refLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.3,
  },
  refId: {
    fontSize: 12,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: colors.text,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 6,
  },
  stepCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#d0d5dd',
  },
  dotDone: {
    backgroundColor: '#1a7a4a',
  },
  dotCurrent: {
    backgroundColor: '#B54708',
    transform: [{ scale: 1.25 }],
  },
  stepText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
  },
  stepTextActive: {
    color: colors.primaryDark,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    lineHeight: 16,
  },
});

export default function MyReportsScreen() {
  const { profile, profileRecordId } = useAppData();
  const [reports, setReports] = useState<MyIncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<QueuedIncidentReport[]>([]);
  const [syncBusy, setSyncBusy] = useState(false);

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

  const reloadOfflineQueue = useCallback(async () => {
    const q = await loadIncidentReportQueue();
    setOfflineQueue(q);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reloadOfflineQueue();
    }, [reloadOfflineQueue]),
  );

  const onSyncQueue = async () => {
    setSyncBusy(true);
    try {
      const { processed, errors, failedLocalIds } = await processIncidentReportQueue();
      await reloadOfflineQueue();
      if (!processed && !errors.length) {
        return;
      }
      if (errors.length) {
        const uniqueErrors = [...new Set(errors)];
        const detailLines = uniqueErrors.slice(0, 2).join('\n');
        const more =
          uniqueErrors.length > 2 ? `\n… and ${uniqueErrors.length - 2} more` : '';
        const title =
          processed > 0 ? 'Some uploads failed' : 'Uploads failed';
        const hint = '\n\nTap Sync again when your connection is stable.';
        Alert.alert(
          title,
          [
            processed > 0 ? `Uploaded ${processed} report(s). ` : '',
            `${failedLocalIds.length} still in the queue.`,
            '\n',
            detailLines,
            more,
            hint,
          ].join(''),
        );
        return;
      }
      Alert.alert('Sync complete', `Uploaded ${processed} report(s).`);
    } finally {
      setSyncBusy(false);
    }
  };

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
              onRefresh={async () => {
                await reloadOfflineQueue();
                await loadReports(true);
              }}
            />
          }
          ListHeaderComponent={
            offlineQueue.length > 0 ? (
              <View style={styles.queueSection}>
                <Text style={styles.queueTitle}>Offline queue</Text>
                <Text style={styles.queueSub}>
                  Reports saved on your device sync when you are back online.
                </Text>
                {offlineQueue.map((item) => {
                  const needsRetry = Boolean(item.lastError);
                  const pillSyncing = syncBusy || item.status === 'syncing';
                  return (
                    <View style={styles.queueCard} key={item.localId}>
                      <View style={styles.queueCardTop}>
                        <Text style={styles.queueHazard}>{item.payload.hazardType || 'Report'}</Text>
                        <View
                          style={[
                            styles.queueStatusPill,
                            pillSyncing && styles.queueStatusSyncing,
                            needsRetry && !pillSyncing && styles.queueStatusRetry,
                          ]}
                        >
                          <Text
                            style={[
                              styles.queueStatusText,
                              pillSyncing && styles.queueStatusTextSyncing,
                              needsRetry && !pillSyncing && styles.queueStatusTextRetry,
                            ]}
                          >
                            {pillSyncing ? 'SYNCING' : needsRetry ? 'NEEDS RETRY' : 'PENDING'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.queueMeta}>
                        Saved {new Date(item.createdAt).toLocaleString()}
                        {item.lastSyncAttemptAt
                          ? ` · Last try ${new Date(item.lastSyncAttemptAt).toLocaleString()}`
                          : ''}
                      </Text>
                      {item.lastError ? (
                        <Text style={styles.queueErrorText} numberOfLines={3}>
                          {item.lastError}
                        </Text>
                      ) : null}
                      <Text style={styles.queuePreview} numberOfLines={2}>
                        {item.payload.locationText || item.payload.description || '—'}
                      </Text>
                    </View>
                  );
                })}
                <TouchableOpacity
                  style={[styles.syncButton, syncBusy && styles.syncButtonDisabled]}
                  onPress={onSyncQueue}
                  disabled={syncBusy}
                >
                  <Text style={styles.syncButtonText}>{syncBusy ? 'SYNCING…' : 'SYNC NOW'}</Text>
                </TouchableOpacity>
              </View>
            ) : null
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
                  {item.assignedStaffPhone
                    ? ` • ${formatPhilippineMobileDisplay(item.assignedStaffPhone)}`
                    : ''}
                </Text>
              ) : item.status === 'submitted' ? (
                <Text style={styles.queueLine}>
                  In queue — all CDRRMO responders are handling other emergencies. You&apos;ll be
                  notified as soon as one is assigned.
                </Text>
              ) : null}
              <Text style={styles.description}>{item.description || '-'}</Text>

              <AssistanceTracker status={item.status} referenceId={item.id} />

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
  queueLine: {
    color: '#B54708',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
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
  queueSection: {
    marginBottom: 16,
    gap: 10,
  },
  queueTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: '800',
  },
  queueSub: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  queueCard: {
    backgroundColor: '#fff8e6',
    borderRadius: apple.cardRadius,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#f5c16c',
  },
  queueCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  queueHazard: {
    flex: 1,
    color: colors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  queueStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#ffe8cc',
  },
  queueStatusSyncing: {
    backgroundColor: '#dbeafe',
  },
  queueStatusRetry: {
    backgroundColor: '#fee4e2',
  },
  queueStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#996600',
  },
  queueStatusTextSyncing: {
    color: '#1d4ed8',
  },
  queueStatusTextRetry: {
    color: '#b42318',
  },
  queueMeta: {
    fontSize: 11,
    color: colors.muted,
  },
  queueErrorText: {
    fontSize: 12,
    color: '#b42318',
    lineHeight: 16,
  },
  queuePreview: {
    fontSize: 13,
    color: colors.text,
  },
  syncButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.3,
  },
});
