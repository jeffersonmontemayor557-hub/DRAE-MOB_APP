export type GuideContext = {
  place: 'home' | 'school' | 'work';
  time: 'day' | 'night';
  situation: 'alone' | 'family' | 'elderly';
};

const tips: Record<string, string[]> = {
  'home-day-alone': [
    'Charge phone and keep a torch where you can reach it in the dark.',
    'Know two ways out of your home; clear hallways of clutter.',
    'Save CDRRMO hotlines in favorites for one-tap dial.',
  ],
  'home-day-family': [
    'Pick a room with few windows for shelter during high wind.',
    'Agree on a meeting point outside if you must evacuate.',
    'Pack IDs and medicines in one grab bag.',
  ],
  'home-day-elderly': [
    'Keep medicines and a written med list in a waterproof pouch.',
    'Ensure slippers/shoes are beside the bed for quick exit.',
    'Program emergency contacts with speed-dial or large icons.',
  ],
  'home-night-alone': [
    'Keep shoes, wallet, and flashlight by the bed.',
    'Sleep with phone plugged in; lower screen brightness after alerts.',
    'If flooding is possible, move valuables above waist height before sleep.',
  ],
  'home-night-family': [
    'Decide who wakes children; practice a quiet evacuation drill.',
    'Use night lights along the path to the exit.',
    'Keep one bag with copies of documents ready to lift.',
  ],
  'home-night-elderly': [
    'Use a bedside lamp you can turn on without standing.',
    'Consider a whistle or bell to signal for help.',
    'Avoid candles; use battery lights only.',
  ],
  'school-day-alone': [
    'Know your classroom’s evacuation route and alternate stairs.',
    'Report damaged ceilings or cracks to staff immediately.',
    'Keep emergency cash and ID in a secure pocket pouch.',
  ],
  'school-day-family': [
    'Coordinate pickup points with guardians for each child.',
    'Share school emergency numbers with the whole household.',
    'If separated, use text when networks are congested.',
  ],
  'school-day-elderly': [
    'Request ground-floor or accessible shelter areas if mobility is limited.',
    'Carry a list of health conditions for responders.',
    'Stay with a buddy during drills and real events.',
  ],
  'school-night-alone': [
    'Evening classes: note nearest exit and assembly area in daylight.',
    'Share your ETA with someone when traveling home late.',
    'Avoid flooded streets; turn back and alert authorities.',
  ],
  'school-night-family': [
    'Confirm who picks up students if alerts go out after hours.',
    'Keep car fuel above half during monsoon weeks.',
    'Use official CDRRMO channels only for school closure news.',
  ],
  'school-night-elderly': [
    'Arrange escort or ride service before severe weather nights.',
    'Carry a reflective strip or light for visibility.',
    'Rest before travel; fatigue increases fall risk in emergencies.',
  ],
  'work-day-alone': [
    'Locate fire exits and muster points on day one.',
    'Back up critical files to cloud before typhoon days.',
    'Know who is the floor warden or safety officer.',
  ],
  'work-day-family': [
    'Agree who leaves work first if schools close early.',
    'Keep children’s school contacts in your work phone.',
    'Delay non-urgent travel when orange/red alerts are up.',
  ],
  'work-day-elderly': [
    'Request workstation near an accessible exit if possible.',
    'Keep hearing aids charged; ask for visual alert systems.',
    'Schedule breaks; stress and heat worsen chronic conditions.',
  ],
  'work-night-alone': [
    'Park in lit areas; note flood-prone roads on your commute.',
    'Share live location with a trusted contact when OT runs late.',
    'If alone on site, keep building security numbers handy.',
  ],
  'work-night-family': [
    'Text home when leaving; use voice call if networks fail.',
    'Avoid rushing in heavy rain; pull over safely if visibility is poor.',
    'Keep a go-bag in the vehicle during habagat season.',
  ],
  'work-night-elderly': [
    'Prefer daytime shifts during flood advisories when possible.',
    'Use ride-hail or carpool instead of walking long distances at night.',
    'Carry a laminated emergency card with blood type and allergies.',
  ],
};

const FALLBACK_TIPS = [
  'Follow active CDRRMO and PAGASA advisories.',
  'Keep your go-bag and IDs in one place.',
  'Know two routes to the nearest evacuation center.',
];

export function getAdaptiveTips(ctx: GuideContext): string[] {
  const key = `${ctx.place}-${ctx.time}-${ctx.situation}`;
  const map = tips as Record<string, string[]>;
  if (map[key]?.length) {
    return map[key];
  }
  const alt = map[`${ctx.place}-day-family`];
  if (alt?.length) {
    return alt;
  }
  return FALLBACK_TIPS;
}
