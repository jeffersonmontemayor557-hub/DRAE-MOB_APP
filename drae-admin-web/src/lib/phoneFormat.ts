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
