import { DASMARINAS_BARANGAYS } from '../constants/dasmarinasBarangays';
import {
  DASMA_APP_CITY,
  DASMA_APP_PROVINCE,
  DASMA_APP_REGION,
  DASMA_APP_ZIP,
} from '../constants/dasmarinasLocale';

export type ParsedDasmarinasAddress = {
  street: string;
  barangay: string;
  landmark: string;
};

const STRUCTURED_TAIL = `, ${DASMA_APP_CITY}, ${DASMA_APP_PROVINCE} ${DASMA_APP_ZIP}, ${DASMA_APP_REGION}`;
const BARANGAY_MARKER = ', Barangay ';

function tryParseStructured(body: string): ParsedDasmarinasAddress | null {
  if (!body.endsWith(STRUCTURED_TAIL)) {
    return null;
  }
  const prefix = body.slice(0, body.length - STRUCTURED_TAIL.length);
  const j = prefix.indexOf(BARANGAY_MARKER);
  if (j <= 0) {
    return null;
  }
  const street = prefix.slice(0, j).trim();
  const barangay = prefix.slice(j + BARANGAY_MARKER.length).trim();
  if (!street || !barangay) {
    return null;
  }
  return { street, barangay, landmark: '' };
}

function stripLandmark(raw: string): { body: string; landmark: string } {
  const idx = raw.search(/\s·\s*Landmark:\s*/i);
  if (idx >= 0) {
    return {
      body: raw.slice(0, idx).trim(),
      landmark: raw.slice(idx).replace(/^\s·\s*Landmark:\s*/i, '').trim(),
    };
  }
  const m = raw.match(/\sLandmark:\s*(.+)$/i);
  if (m) {
    return { body: raw.slice(0, m.index).trim().replace(/,\s*$/, ''), landmark: m[1].trim() };
  }
  return { body: raw.trim(), landmark: '' };
}

/** Longest barangay name contained in `text` (case-insensitive), or ''. */
function matchBarangayInText(text: string): string {
  const lower = text.toLowerCase();
  let best = '';
  for (const b of DASMARINAS_BARANGAYS) {
    if (lower.includes(b.toLowerCase()) && b.length > best.length) {
      best = b;
    }
  }
  return best;
}

/**
 * Split stored profile `address` into fields for the Dasmariñas-only form.
 * Supports the composed format from `composeDasmarinasProfileAddress` and best-effort legacy text.
 */
export function parseDasmarinasProfileAddress(raw: string): ParsedDasmarinasAddress {
  const { body, landmark } = stripLandmark(String(raw ?? ''));
  if (!body) {
    return { street: '', barangay: '', landmark };
  }

  const structured = tryParseStructured(body);
  if (structured) {
    return { ...structured, landmark: landmark || structured.landmark };
  }

  const barangay = matchBarangayInText(body);
  if (!barangay) {
    return { street: body, barangay: '', landmark };
  }

  let street = body
    .replace(new RegExp(barangay.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
    .replace(/\s*,\s*Dasmariñas.*$/i, '')
    .replace(/\s*,\s*Dasmarinas.*$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/,\s*$/, '')
    .trim();

  if (!street) {
    street = '';
  }

  return { street, barangay, landmark };
}

/** Single-line address for `profiles.address` (and profile card display). */
export function composeDasmarinasProfileAddress(parts: {
  street: string;
  barangay: string;
  landmark: string;
}): string {
  const street = parts.street.trim();
  const barangay = parts.barangay.trim();
  const landmark = parts.landmark.trim();
  const core = `${street}, Barangay ${barangay}${STRUCTURED_TAIL}`;
  if (!landmark) {
    return core;
  }
  return `${core} · Landmark: ${landmark}`;
}
