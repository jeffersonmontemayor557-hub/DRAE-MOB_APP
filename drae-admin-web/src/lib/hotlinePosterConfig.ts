/**
 * Emergency hotline poster (Guides → Emergency Hotlines). Duplicated from mobile app for admin editing.
 */

export type HotlinePosterBlock = {
  title: string;
  lines: string[];
};

export type HotlinePosterFooterRow = {
  label: string;
  value: string;
};

export type HotlinePosterConfig = {
  headerSubtitle: string;
  headerLocation: string;
  mainTitle: string;
  tagalogReminder: string;
  leftColumn: HotlinePosterBlock[];
  rightColumn: HotlinePosterBlock[];
  footer: HotlinePosterFooterRow[];
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isBlock(v: unknown): v is HotlinePosterBlock {
  if (!v || typeof v !== 'object') {
    return false;
  }
  const o = v as Record<string, unknown>;
  if (!isNonEmptyString(o.title) || !Array.isArray(o.lines)) {
    return false;
  }
  return o.lines.every((x) => typeof x === 'string');
}

function isFooterRow(v: unknown): v is HotlinePosterFooterRow {
  if (!v || typeof v !== 'object') {
    return false;
  }
  const o = v as Record<string, unknown>;
  return isNonEmptyString(o.label) && typeof o.value === 'string' && o.value.trim().length > 0;
}

export const defaultHotlinePoster: HotlinePosterConfig = {
  headerSubtitle: 'CITY DISASTER RISK REDUCTION AND MANAGEMENT OFFICE',
  headerLocation: 'CITY OF DASMARIÑAS, CAVITE',
  mainTitle: 'EMERGENCY HOTLINES',
  tagalogReminder:
    'Maging mapagmatyag at makipagtulungan, ipagbigay-alam ang mga kaganapan sa inyong mga nasasakupan. Makipag-ugnayan sa mga sumusunod na numero:',
  leftColumn: [
    {
      title: 'EMERGENCY OPERATION CENTER 24 / 7 HOTLINE',
      lines: ['(046) 435-0183', '(046) 481-0555', '0908-818-5555'],
    },
    {
      title: 'AMBULANCE CENTER / CITY RESCUE GROUP',
      lines: ['0998-566-5555', '0917-777-5263'],
    },
    {
      title: 'BUREAU OF FIRE PROTECTION',
      lines: [
        '(046) 416-0875',
        '(046) 884-6131',
        '0998-336-9534',
        '0992-448-7857',
        'FB: BFP DASMA FS CAVITE',
      ],
    },
  ],
  rightColumn: [
    {
      title: 'CITY DISASTER RISK REDUCTION AND MANAGEMENT OFFICE',
      lines: ['(046) 513-1766', '0917-721-8825', '0998-843-5477'],
    },
    {
      title: 'MERALCO',
      lines: ['0917-551-6211', '0920-971-6211'],
    },
    {
      title: 'PHILIPPINE NATIONAL POLICE',
      lines: ['(046) 416-0256', '0998-598-5508', '0956-803-3329'],
    },
  ],
  footer: [
    { label: 'Email', value: 'dasmacity.drrmo@yahoo.com' },
    { label: 'Mobile', value: '0917-721-8825' },
    { label: 'Facebook', value: 'Dasmariñas DRRMO' },
  ],
};

export function parseHotlinePosterConfig(input: unknown): HotlinePosterConfig | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const o = input as Record<string, unknown>;
  if (
    !isNonEmptyString(o.headerSubtitle) ||
    !isNonEmptyString(o.headerLocation) ||
    !isNonEmptyString(o.mainTitle) ||
    !isNonEmptyString(o.tagalogReminder)
  ) {
    return null;
  }
  if (!Array.isArray(o.leftColumn) || !Array.isArray(o.rightColumn) || !Array.isArray(o.footer)) {
    return null;
  }
  if (!o.leftColumn.length || !o.rightColumn.length || !o.footer.length) {
    return null;
  }
  if (!o.leftColumn.every(isBlock) || !o.rightColumn.every(isBlock)) {
    return null;
  }
  if (!o.footer.every(isFooterRow)) {
    return null;
  }
  return {
    headerSubtitle: o.headerSubtitle.trim(),
    headerLocation: o.headerLocation.trim(),
    mainTitle: o.mainTitle.trim(),
    tagalogReminder: o.tagalogReminder.trim(),
    leftColumn: o.leftColumn,
    rightColumn: o.rightColumn,
    footer: o.footer.map((r) => ({
      label: r.label.trim(),
      value: String(r.value).trim(),
    })),
  };
}
