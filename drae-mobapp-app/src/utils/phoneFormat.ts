/**
 * Philippine mobile numbers: +63 9XX XXX XXXX (E.164: +639XXXXXXXXX).
 * Landlines and other formats are left unchanged.
 */

function nationalMobileTenDigits(digits: string): string | null {
  if (digits.length === 10 && digits.startsWith('9')) {
    return digits;
  }
  if (digits.length === 11 && digits.startsWith('09')) {
    return digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith('639')) {
    return digits.slice(3);
  }
  return null;
}

/** Normalize any stored PH mobile to national 10 digits (9XXXXXXXXX), or null if not a PH mobile. */
export function toPhilippineNationalTenDigits(input: string | null | undefined): string | null {
  if (input == null || !String(input).trim()) {
    return null;
  }
  return nationalMobileTenDigits(String(input).replace(/\D/g, ''));
}

/**
 * While typing: strip to national segment, max 10 digits, must start with 9.
 * Accepts pasted 09… / 63… / spaces.
 */
export function normalizePhilippineMobileTyping(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('63')) {
    d = d.slice(2);
  }
  if (d.startsWith('0')) {
    d = d.slice(1);
  }
  if (d.length === 0) {
    return '';
  }
  const nineAt = d.indexOf('9');
  if (nineAt === -1) {
    return '';
  }
  d = d.slice(nineAt);
  return d.slice(0, 10);
}

/** Display pattern 9XX XXX XXXX (national 10 digits). */
export function formatPhilippineMobileNationalSpacing(nationalTen: string): string {
  const d = nationalTen.slice(0, 10);
  if (d.length <= 3) {
    return d;
  }
  if (d.length <= 6) {
    return `${d.slice(0, 3)} ${d.slice(3)}`;
  }
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

/** Store as 09XXXXXXXXX for DB / profile compatibility. */
export function nationalTenToProfileContact(nationalTen: string): string {
  if (nationalTen.length === 10 && nationalTen.startsWith('9')) {
    return `0${nationalTen}`;
  }
  return nationalTen;
}

/** Display as +639… when the value looks like a PH mobile; otherwise return trimmed input. */
export function formatPhilippineMobileDisplay(input: string | null | undefined): string {
  if (input == null || !String(input).trim()) {
    return '';
  }
  const raw = String(input).trim();
  const ten = nationalMobileTenDigits(raw.replace(/\D/g, ''));
  if (ten && ten.length === 10 && ten.startsWith('9')) {
    return `+63${ten}`;
  }
  return raw;
}

/**
 * Digits for sms:/tel: URIs. PH mobiles become 639XXXXXXXXX (12 digits). Other numbers: digits only if long enough.
 */
export function digitsForPhilippineDialOrSms(input: string): string | null {
  const d = input.replace(/\D/g, '');
  const ten = nationalMobileTenDigits(d);
  if (ten && ten.length === 10 && ten.startsWith('9')) {
    return `63${ten}`;
  }
  if (d.length >= 10) {
    return d;
  }
  return null;
}
