/**
 * Demo hazard exposure zones for Dasmariñas City (illustrative GIS-style overlay).
 * Levels 1 = lower, 3 = higher. Not a substitute for official CDRRMO hazard maps.
 */
export type RiskHazard = 'flood' | 'landslide' | 'fire';

export type DasmarinasRiskZone = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  /** Circle radius in meters */
  radius: number;
  flood: 1 | 2 | 3;
  landslide: 1 | 2 | 3;
  fire: 1 | 2 | 3;
};

export const DASMA_CENTER_REGION = {
  latitude: 14.327,
  longitude: 120.937,
  latitudeDelta: 0.11,
  longitudeDelta: 0.11,
};

export const DASMA_RISK_ZONES: DasmarinasRiskZone[] = [
  {
    id: 'upland-west',
    label: 'Upland west (Langkaan / upland)',
    latitude: 14.352,
    longitude: 120.915,
    radius: 3200,
    flood: 2,
    landslide: 3,
    fire: 2,
  },
  {
    id: 'paliparan-corridor',
    label: 'Paliparan corridor',
    latitude: 14.318,
    longitude: 120.965,
    radius: 2800,
    flood: 3,
    landslide: 2,
    fire: 2,
  },
  {
    id: 'salawag-lowland',
    label: 'Salawag / low-lying',
    latitude: 14.308,
    longitude: 120.928,
    radius: 2600,
    flood: 3,
    landslide: 1,
    fire: 2,
  },
  {
    id: 'poblacion-core',
    label: 'Poblacion / central',
    latitude: 14.33,
    longitude: 120.938,
    radius: 2200,
    flood: 2,
    landslide: 2,
    fire: 3,
  },
  {
    id: 'salitran-east',
    label: 'Salitran / east',
    latitude: 14.335,
    longitude: 120.955,
    radius: 2400,
    flood: 2,
    landslide: 2,
    fire: 2,
  },
];

export function zoneLevelForHazard(zone: DasmarinasRiskZone, hazard: RiskHazard | 'all'): number {
  if (hazard === 'all') {
    return Math.max(zone.flood, zone.landslide, zone.fire);
  }
  return zone[hazard];
}

/** Fill color for map circle (high contrast for emergencies). */
export function riskZoneFill(level: number): string {
  if (level >= 3) {
    return 'rgba(180, 35, 24, 0.38)';
  }
  if (level === 2) {
    return 'rgba(181, 71, 8, 0.32)';
  }
  return 'rgba(26, 122, 74, 0.22)';
}

export function riskZoneStroke(level: number): string {
  if (level >= 3) {
    return '#8B1E14';
  }
  if (level === 2) {
    return '#8B4A08';
  }
  return '#145a38';
}

/** Illustrative incident / monitoring notes for the demo map (not official records). */
export const RISK_ZONE_INCIDENT_NOTES: Record<string, string> = {
  'upland-west':
    'Monitor during sustained rain; historical slope movement and localized debris flow risk.',
  'paliparan-corridor':
    'Flood-prone catchment; water can rise quickly on main roads during heavy storms.',
  'salawag-lowland':
    'Low-lying rice and residential fringe; frequent sheet flooding in habagat.',
  'poblacion-core':
    'Dense structures and traffic; fire spread and evacuation congestion are key concerns.',
  'salitran-east':
    'Mixed residential–commercial; moderate flood and fire exposure during peak storms.',
};
