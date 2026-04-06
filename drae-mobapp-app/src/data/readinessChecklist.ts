export type ReadinessItem = {
  id: string;
  label: string;
  description: string;
};

export const readinessChecklist: ReadinessItem[] = [
  {
    id: 'go_bag',
    label: 'Emergency Go-Bag Ready',
    description: 'Prepared bag with food, water, flashlight, and medicine.',
  },
  {
    id: 'hotlines',
    label: 'Emergency Hotlines Saved',
    description: 'Important numbers are stored and accessible offline.',
  },
  {
    id: 'evac_plan',
    label: 'Evacuation Plan Known',
    description: 'Family knows evacuation center and route.',
  },
  {
    id: 'first_aid',
    label: 'First Aid Kit Available',
    description: 'Basic first aid supplies are complete and reachable.',
  },
  {
    id: 'documents',
    label: 'Important Documents Secured',
    description: 'IDs and records are protected in a waterproof container.',
  },
  {
    id: 'alerts',
    label: 'Alert Sources Monitored',
    description: 'Residents follow CDRRMO and PAGASA advisories regularly.',
  },
];

export function computeReadinessScore(checkedIds: string[]) {
  if (readinessChecklist.length === 0) {
    return 0;
  }
  return Math.round((checkedIds.length / readinessChecklist.length) * 100);
}
