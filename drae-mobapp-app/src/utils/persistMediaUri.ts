import * as FileSystemLegacy from 'expo-file-system/legacy';

const PERSIST_ROOT = 'persisted-media';

function isRemoteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

function safeExtension(uri: string, fallback: string): string {
  const raw = uri.split('.').pop()?.split('?')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
  if (!raw || raw.length > 8) {
    return fallback;
  }
  return raw;
}

function normalizeLocalUri(uri: string): string {
  const t = uri.trim();
  if (!t || isRemoteUri(t) || t.startsWith('file:') || t.startsWith('content:')) {
    return t;
  }
  return t.startsWith('/') ? `file://${t}` : `file:///${t}`;
}

async function duplicateLocalFileToDest(sourceUri: string, dest: string): Promise<void> {
  try {
    await FileSystemLegacy.copyAsync({ from: sourceUri, to: dest });
  } catch {
    const b64 = await FileSystemLegacy.readAsStringAsync(sourceUri, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
    await FileSystemLegacy.writeAsStringAsync(dest, b64, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });
  }
}

/**
 * ImagePicker / recorder URIs often point at cache paths that Android deletes quickly.
 * Copy into app document storage so upload/sync can run later without ENOENT.
 */
export async function persistPickedMediaUri(
  sourceUri: string,
  family: 'avatar' | 'incident-photo' | 'incident-audio',
): Promise<string> {
  let trimmed = normalizeLocalUri(sourceUri?.trim() ?? '');
  if (!trimmed || isRemoteUri(trimmed)) {
    return trimmed;
  }

  const doc = FileSystemLegacy.documentDirectory;
  if (!doc) {
    return trimmed;
  }

  const prefix = `${doc}${PERSIST_ROOT}/`;
  if (trimmed.startsWith(prefix)) {
    return trimmed;
  }

  const fallbackExt =
    family === 'incident-audio' ? 'm4a' : family === 'avatar' ? 'jpg' : 'jpg';
  const ext = safeExtension(trimmed, fallbackExt);
  const destDir = `${doc}${PERSIST_ROOT}/${family}/`;
  await FileSystemLegacy.makeDirectoryAsync(destDir, { intermediates: true });
  const dest = `${destDir}${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  await duplicateLocalFileToDest(trimmed, dest);
  return dest;
}

export type IncidentReportPersistablePayload = {
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

/**
 * Ensures incident attachments live under documentDirectory before submit or queueing.
 * Prevents offline queue + later sync from holding dead ImagePicker cache paths.
 */
export async function persistIncidentReportPayloadMedia(
  payload: IncidentReportPersistablePayload,
): Promise<IncidentReportPersistablePayload> {
  const doc = FileSystemLegacy.documentDirectory ?? '';
  const stablePrefix = doc ? `${doc}${PERSIST_ROOT}/` : '';

  let photoUri = payload.photoUri;
  if (photoUri && !isRemoteUri(photoUri)) {
    if (!stablePrefix || !photoUri.startsWith(stablePrefix)) {
      photoUri = await persistPickedMediaUri(photoUri, 'incident-photo');
    }
  }

  let audioUri = payload.audioUri;
  if (audioUri && !isRemoteUri(audioUri)) {
    if (!stablePrefix || !audioUri.startsWith(stablePrefix)) {
      audioUri = await persistPickedMediaUri(audioUri, 'incident-audio');
    }
  }

  return { ...payload, photoUri, audioUri };
}
