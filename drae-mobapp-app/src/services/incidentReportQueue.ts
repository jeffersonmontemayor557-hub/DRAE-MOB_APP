import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { persistIncidentReportPayloadMedia } from '../utils/persistMediaUri';
import { submitIncidentReport, type SubmitIncidentResult } from './supabaseService';

const QUEUE_KEY = 'drae_incident_report_queue_v1';

export type QueuedIncidentReport = {
  localId: string;
  createdAt: string;
  status: 'pending' | 'syncing';
  lastError?: string;
  /** Set when a sync attempt fails (for “last tried” in the UI). */
  lastSyncAttemptAt?: string;
  payload: {
    profileId: string | null;
    reporterName: string;
    reporterContact: string;
    hazardType: string;
    locationText: string;
    description: string;
    photoUri: string | null;
    audioUri: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
};

function newLocalId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Supabase / storage errors are often plain objects, not `instanceof Error`. */
function formatSyncError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === 'string' && err.trim()) {
    return err;
  }
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const message = typeof o.message === 'string' ? o.message.trim() : '';
    const code = o.code != null && String(o.code) ? String(o.code) : '';
    const details = typeof o.details === 'string' && o.details.trim() ? o.details.trim() : '';
    const hint = typeof o.hint === 'string' && o.hint.trim() ? o.hint.trim() : '';
    const parts = [
      message,
      code ? `(code ${code})` : '',
      hint,
      details,
    ].filter(Boolean);
    if (parts.length) {
      return parts.join(' ');
    }
  }
  return fallback;
}

export async function loadIncidentReportQueue(): Promise<QueuedIncidentReport[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const rawList = parsed as QueuedIncidentReport[];
    let changed = false;
    const normalized = rawList.map((q) => {
      if (q.status === 'syncing') {
        changed = true;
        return { ...q, status: 'pending' as const };
      }
      return q;
    });
    if (changed) {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return [];
  }
}

async function saveQueue(items: QueuedIncidentReport[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueIncidentReport(
  payload: QueuedIncidentReport['payload'],
): Promise<QueuedIncidentReport> {
  const queue = await loadIncidentReportQueue();
  const item: QueuedIncidentReport = {
    localId: newLocalId(),
    createdAt: new Date().toISOString(),
    status: 'pending',
    payload,
  };
  queue.push(item);
  await saveQueue(queue);
  return item;
}

export async function removeQueuedIncidentReport(localId: string) {
  const queue = await loadIncidentReportQueue();
  await saveQueue(queue.filter((q) => q.localId !== localId));
}

export async function updateQueuedIncidentReport(
  localId: string,
  patch: Partial<
    Pick<QueuedIncidentReport, 'status' | 'lastError' | 'lastSyncAttemptAt' | 'payload'>
  >,
) {
  const queue = await loadIncidentReportQueue();
  await saveQueue(
    queue.map((q) => (q.localId === localId ? { ...q, ...patch } : q)),
  );
}

export async function getPendingIncidentReportCount(): Promise<number> {
  const q = await loadIncidentReportQueue();
  return q.filter((i) => i.status === 'pending').length;
}

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (!state.isConnected) {
      return false;
    }
    if (state.isInternetReachable === false) {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

export async function processIncidentReportQueue(): Promise<{
  processed: number;
  errors: string[];
  failedLocalIds: string[];
}> {
  const errors: string[] = [];
  const failedLocalIds: string[] = [];
  let processed = 0;
  const queue = await loadIncidentReportQueue();
  const pending = queue.filter((q) => q.status === 'pending');
  for (const item of pending) {
    await updateQueuedIncidentReport(item.localId, {
      status: 'syncing',
      lastError: undefined,
    });
    try {
      let payload = item.payload;
      try {
        payload = await persistIncidentReportPayloadMedia(item.payload);
        if (
          payload.photoUri !== item.payload.photoUri ||
          payload.audioUri !== item.payload.audioUri
        ) {
          await updateQueuedIncidentReport(item.localId, { payload });
        }
      } catch (persistErr) {
        const hint =
          'Photo or audio is no longer on this device (cache was cleared). Remove this queued report in My Reports, then submit again with new attachments.';
        const msg = formatSyncError(persistErr, hint);
        errors.push(msg);
        failedLocalIds.push(item.localId);
        await updateQueuedIncidentReport(item.localId, {
          status: 'pending',
          lastError: msg,
          lastSyncAttemptAt: new Date().toISOString(),
        });
        continue;
      }
      await submitIncidentReport(payload);
      await removeQueuedIncidentReport(item.localId);
      processed += 1;
    } catch (err) {
      const msg = formatSyncError(err, 'Sync failed');
      errors.push(msg);
      failedLocalIds.push(item.localId);
      await updateQueuedIncidentReport(item.localId, {
        status: 'pending',
        lastError: msg,
        lastSyncAttemptAt: new Date().toISOString(),
      });
    }
  }
  return { processed, errors, failedLocalIds };
}

export async function trySubmitIncidentReportOrQueue(
  payload: QueuedIncidentReport['payload'],
): Promise<
  { ok: true; mode: 'submitted'; result: SubmitIncidentResult } | { ok: true; mode: 'queued'; localId: string }
> {
  const withMedia = await persistIncidentReportPayloadMedia(payload);
  const online = await isOnline();
  if (!online) {
    const q = await enqueueIncidentReport(withMedia);
    return { ok: true, mode: 'queued', localId: q.localId };
  }
  try {
    const result = await submitIncidentReport(withMedia);
    return { ok: true, mode: 'submitted', result };
  } catch (err) {
    const message = formatSyncError(err, 'Submit failed');
    const q = await enqueueIncidentReport(withMedia);
    await updateQueuedIncidentReport(q.localId, {
      lastError: message,
      lastSyncAttemptAt: new Date().toISOString(),
    });
    return { ok: true, mode: 'queued', localId: q.localId };
  }
}
