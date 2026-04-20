import { defaultHotlinePoster, type HotlinePosterConfig } from './hotlinePosterConfig';

export type { HotlinePosterConfig } from './hotlinePosterConfig';

export type DisasterStage = 'Before' | 'During' | 'After';
export type DisasterHazard =
  | 'Landslide'
  | 'Flood'
  | 'Earthquake'
  | 'Fire'
  | 'Tropical Cyclone';

export const stageOrder: DisasterStage[] = ['Before', 'During', 'After'];

export const stageLabels: Record<DisasterStage, string> = {
  Before: 'Bago',
  During: 'Habang',
  After: 'Pagkatapos',
};

/** Uppercase line under the guidebook title (matches CDRRMO print materials). */
export const hazardTaglines: Record<DisasterHazard, string> = {
  Landslide: 'LANDSLIDE o PAGGUHO NG LUPA',
  Flood: 'FLOOD o BAHA',
  Earthquake: 'EARTHQUAKE o LINDOL',
  Fire: 'FIRE o SUNOG',
  'Tropical Cyclone': 'TROPICAL CYCLONE o BAGYO',
};

export type BilingualLine = { tagalog: string; english: string };

/** Optional short line under the stage banner. */
export const stageIntro: Partial<
  Record<DisasterHazard, Partial<Record<DisasterStage, BilingualLine>>>
> = {
  Landslide: {
    After: {
      tagalog: 'Bantayan ang sitwasyon at manatiling alerto.',
      english: 'Monitor the situation and stay alert.',
    },
  },
};

export const stageHeaderColor: Record<DisasterStage, string> = {
  Before: '#C45C00',
  During: '#B91C1C',
  After: '#0F766E',
};

/**
 * One preparedness tip: Tagalog primary, English secondary in the app UI.
 * Optional `image` overrides the icon (see `assets/infographics/calamities/README.txt`).
 */
export type GuideTip = BilingualLine & {
  icon: string;
  image?: number;
};

/** Large theme icon per hazard (Ionicons) when no hero PNG is provided. */
export const hazardThemeIcon: Record<DisasterHazard, string> = {
  Landslide: 'triangle-outline',
  Flood: 'water-outline',
  Earthquake: 'pulse-outline',
  Fire: 'flame-outline',
  'Tropical Cyclone': 'thunderstorm-outline',
};

/**
 * Optional hero images: add e.g. `landslide.png` under `assets/infographics/calamities/`.
 */
export const hazardHeroImage: Record<DisasterHazard, number> = {
  Landslide: require('../../assets/infographics/calamities/landslide.png'),
  Flood: require('../../assets/infographics/calamities/flood.png'),
  Earthquake: require('../../assets/infographics/calamities/earthquake.png'),
  Fire: require('../../assets/infographics/calamities/fire.png'),
  'Tropical Cyclone': require('../../assets/infographics/calamities/cyclone.png'),
};

const t = (
  tagalog: string,
  english: string,
  icon: string,
  image?: number,
): GuideTip => ({ tagalog, english, icon, ...(image !== undefined ? { image } : {}) });

export const disasterGuideContent: Record<
  DisasterHazard,
  Record<DisasterStage, GuideTip[]>
> = {
  Landslide: {
    Before: [
      t(
        'Tukuyin ang mga lugar na delikado sa pagguho at alamin ang mga babala.',
        'Identify areas that are at risk of landslides and understand warning signs.',
        'map-outline',
      ),
      t(
        'Manatiling updated sa balita ng panahon, alerto, at abiso.',
        'Stay updated by following weather news, alerts, and advisories.',
        'newspaper-outline',
      ),
      t(
        'Maghanda ng emergency go-bag ng pamilya na may mga pangunahing kagamitan.',
        "Prepare your family's emergency go-bag with essential supplies.",
        'bag-handle-outline',
      ),
      t(
        'Alamin ang mga evacuation center at pinakaligtas na daan papunta roon.',
        'Know where the evacuation centers are and the safest route to reach them.',
        'navigate-outline',
      ),
      t(
        'Agad na lumikas sa mas ligtas na lugar kapag may abiso ang awtoridad.',
        'Evacuate immediately to a safer place when authorities give notice.',
        'exit-outline',
      ),
    ],
    During: [
      t(
        'Kung hindi makalikas, manatili sa loob ng bahay at lumipat sa ligtas na bahagi.',
        'If evacuation is not possible, stay indoors and move to a safe location.',
        'home-outline',
      ),
      t(
        'Kung nasa labas, lumayo sa matarik na dalisdis at lumipat sa mas ligtas na lugar.',
        'If outdoors, stay away from steep slopes and move to safer grounds.',
        'trending-down-outline',
      ),
      t(
        'Kung hindi maiwasan ang pagguho, protektahan ang ulo at leeg hangga’t maaari.',
        'If landslide cannot be avoided, protect your head and neck as possible.',
        'shield-outline',
      ),
      t(
        'Iwasan ang pagtawid sa mga sirang kalsada at tulay.',
        'Avoid crossing roads and bridges that are damaged.',
        'car-outline',
      ),
      t(
        'Huwag pumasok sa hindi matatag na lugar hangga’t hindi pinapayagan ng awtoridad.',
        'Do not enter unstable areas until authorities declare it safe.',
        'close-circle-outline',
      ),
    ],
    After: [
      t(
        'Umalis lamang sa evacuation area kapag sinabi ng awtoridad na ligtas na.',
        'Leave the evacuation area only when authorities say it is safe.',
        'walk-outline',
      ),
      t(
        'Iwasan ang mga lugar na naapektuhan ng pagguho.',
        'Avoid landslide affected areas.',
        'warning-outline',
      ),
      t(
        'Mag-ingat sa posibleng biglaang baha dahil sa baradong ilog o sapa.',
        'Watch out for possible flash flood due to clogging of creeks or rivers.',
        'water-outline',
      ),
      t(
        'Hanapin ang nawawala at iulat sa awtoridad.',
        'Check for missing persons and report it to authorities.',
        'people-outline',
      ),
      t(
        'Dalhin ang sugatan at may sakit sa pinakamalapit na ospital.',
        'Bring the injured and sick to the nearest hospital.',
        'medical-outline',
      ),
      t(
        'Suriin ang bahay kung may pinsala at kumpunihin kung kinakailangan.',
        'Check your house for possible damages and repair as necessary.',
        'home-outline',
      ),
      t(
        'Iulat ang natumbang puno at poste ng kuryente sa tamang awtoridad.',
        'Report fallen trees and electric poles to proper authorities.',
        'call-outline',
      ),
    ],
  },
  Flood: {
    Before: [
      t(
        'Bantayan ang babala sa baha at panatilihing naka-on ang emergency radio.',
        'Monitor flood warnings and keep emergency radio updates on.',
        'radio-outline',
      ),
      t(
        'Ilipat ang alagang hayop sa ligtas at itinakdang lugar.',
        'Bring pets and livestock to safe and designated areas.',
        'paw-outline',
      ),
      t(
        'Ilipat ang mga appliance at mahahalagang gamit sa mas mataas na lugar.',
        'Move home appliances and valuables to higher places.',
        'trending-up-outline',
      ),
      t(
        'Maghanda ng emergency na pagkain, malinis na tubig, at gamot.',
        'Prepare emergency food, clean water, and medicine.',
        'restaurant-outline',
      ),
      t(
        'Patayin ang kuryente kapag tumaas na ang tubig malapit sa mga outlet.',
        'Switch off electricity if water begins to rise near outlets.',
        'flash-off-outline',
      ),
    ],
    During: [
      t(
        'Agad na lumipat sa mas mataas na lugar kapag tumataas ang tubig-baha.',
        'Immediately move to higher ground when flood water rises.',
        'arrow-up-outline',
      ),
      t(
        'Huwag hawakan ang mga de-kuryenteng gamit sa binahang lugar.',
        'Avoid touching electrical devices in flooded areas.',
        'hand-left-outline',
      ),
      t(
        'Huwag lumangoy o gumamit ng bangka sa mabilis na agos ng baha.',
        'Do not swim or use boats in fast-moving flood currents.',
        'water-outline',
      ),
      t(
        'Huwag tumawid sa ilog at binahang kalsada.',
        'Never cross rivers and flooded roads.',
        'ban-outline',
      ),
      t(
        'Iwasan ang paglalakad sa baha kung hindi naman kailangan.',
        'Avoid wading through floodwater if there is no urgent need.',
        'alert-circle-outline',
      ),
    ],
    After: [
      t(
        'Bumalik lamang sa tahanan kapag kinumpirma ng awtoridad na ligtas na.',
        'Return home only after authorities confirm it is safe.',
        'home-outline',
      ),
      t(
        'Mag-ingat sa natumbang kawad at sirang linya ng kuryente.',
        'Watch out for fallen wires and damaged electrical lines.',
        'flash-outline',
      ),
      t(
        'Suriin ang mga outlet at appliance bago gamitin.',
        'Inspect electrical outlets and appliances before use.',
        'construct-outline',
      ),
      t(
        'Siyasatin ang bahay kung may structural damage.',
        'Examine your house for structural damage.',
        'business-outline',
      ),
      t(
        'Tiyaking ligtas ang pagkain at inuming tubig.',
        'Ensure all food and water are uncontaminated.',
        'nutrition-outline',
      ),
    ],
  },
  Earthquake: {
    Before: [
      t(
        'I-secure ang mabibigat na muwebles, estante, at appliance.',
        'Secure heavy furniture, shelves, and appliances.',
        'lock-closed-outline',
      ),
      t(
        'Maghanda ng emergency kit at plano sa komunikasyon ng pamilya.',
        'Prepare emergency kit and family communication plan.',
        'clipboard-outline',
      ),
      t(
        'Tukuyin ang ligtas na pook sa ilalim ng matibay na muwebles.',
        'Identify safe spots under sturdy furniture.',
        'location-outline',
      ),
      t(
        'Magsanay ng drop, cover, at hold kasama ang pamilya.',
        'Practice drop, cover, and hold with family members.',
        'people-circle-outline',
      ),
    ],
    During: [
      t('Drop, cover, at hold agad.', 'Drop, cover, and hold immediately.', 'hand-left-outline'),
      t(
        'Lumayo sa mga bintana, salamin, at aparador.',
        'Stay away from windows, mirrors, and cabinets.',
        'grid-outline',
      ),
      t(
        'Kung nasa labas, lumayo sa mga gusali at linya ng kuryente.',
        'If outside, move away from buildings and power lines.',
        'walk-outline',
      ),
      t(
        'Huwag gumamit ng elevator habang malakas ang pagyanig.',
        'Do not use elevators during strong shaking.',
        'close-outline',
      ),
    ],
    After: [
      t(
        'Asahan ang aftershock at manatiling alerto.',
        'Expect aftershocks and stay alert.',
        'pulse-outline',
      ),
      t(
        'Suriin ang mga sugat at magbigay ng first aid.',
        'Check injuries and provide first aid.',
        'medical-outline',
      ),
      t(
        'Siyasatin ang bahay kung may bitak at tagas.',
        'Inspect your home for cracks and leaks.',
        'search-outline',
      ),
      t(
        'Sundin ang opisyal na abiso bago bumalik sa delikadong lugar.',
        'Follow official advisories before re-entering unsafe areas.',
        'megaphone-outline',
      ),
    ],
  },
  Fire: {
    Before: [
      t(
        'Suriin nang regular ang kable at koneksyon ng gas.',
        'Check electrical wiring and gas connections regularly.',
        'flash-outline',
      ),
      t(
        'Panatilihing accessible at gumagana ang mga aparador ng apoy.',
        'Keep fire extinguishers accessible and functional.',
        'flame-outline',
      ),
      t(
        'Magsanay ng fire drill kasama ang pamilya.',
        'Practice fire evacuation drills with household members.',
        'people-outline',
      ),
      t(
        'Itago nang tama ang mga materyal na madaling masunog.',
        'Store flammable materials properly.',
        'cube-outline',
      ),
    ],
    During: [
      t(
        'Buksan ang alarm at tumawag agad sa emergency responders.',
        'Activate alarm and call emergency responders immediately.',
        'notifications-outline',
      ),
      t(
        'Gamitin ang pinakamalapit na ligtas na labasan at gumapang kung may usok.',
        'Use nearest safe exit and crawl low under smoke.',
        'arrow-forward-outline',
      ),
      t(
        'Huwag buksan ang mainit na pinto; humanap ng ibang daan.',
        'Never open a hot door; find another route.',
        'door-closed-outline',
      ),
      t(
        'Huwag bumalik sa loob ng nasusunog na gusali.',
        'Do not return inside a burning structure.',
        'ban-outline',
      ),
    ],
    After: [
      t(
        'Maghintay hanggang ideklara ng bumbero na ligtas na ang lugar.',
        'Wait for fire officers to declare area safe.',
        'checkmark-shield-outline',
      ),
      t(
        'Suriin ang mga sugat at sintomas ng paglanghap ng usok.',
        'Check for injuries and smoke inhalation symptoms.',
        'medical-outline',
      ),
      t(
        'I-document ang pinsala at makipag-ugnayan sa awtoridad para sa tulong.',
        'Document damages and contact authorities for assistance.',
        'camera-outline',
      ),
      t(
        'Huwag hawakan ang sirang kagamitang de-kuryente.',
        'Avoid touching damaged electrical equipment.',
        'hand-left-outline',
      ),
    ],
  },
  'Tropical Cyclone': {
    Before: [
      t(
        'Bantayan ang mga bulletin ng PAGASA at lokal na babala.',
        'Monitor PAGASA bulletins and local alerts.',
        'cloud-download-outline',
      ),
      t(
        'Palakasin ang mga bintana at i-secure ang bubong.',
        'Reinforce windows and secure roof materials.',
        'home-outline',
      ),
      t(
        'Maghanda ng pagkain, tubig, at baterya para sa ilang araw.',
        'Prepare food, water, and batteries for several days.',
        'basket-outline',
      ),
      t(
        'I-charge ang mga device bago tumama ang bagyo.',
        'Charge communication devices before landfall.',
        'battery-charging-outline',
      ),
    ],
    During: [
      t(
        'Manatili sa loob ng bahay at lumayo sa mga bintana.',
        'Stay indoors and away from windows.',
        'home-outline',
      ),
      t(
        'Iwasan ang biyahe maliban kung kinakailangan ng awtoridad.',
        'Avoid travel unless officially required.',
        'car-outline',
      ),
      t(
        'Panatilihing available ang emergency contacts.',
        'Keep emergency contacts available at all times.',
        'call-outline',
      ),
      t(
        'Lumikas sa evacuation center kung inutos.',
        'Move to evacuation center if instructed.',
        'navigate-outline',
      ),
    ],
    After: [
      t(
        'Mag-ingat sa natumbang linya ng kuryente at mga kalat.',
        'Beware of fallen power lines and debris.',
        'warning-outline',
      ),
      t(
        'Iwasan ang baha at hindi matatag na istruktura.',
        'Avoid floodwater and unstable structures.',
        'water-outline',
      ),
      t(
        'Pakuluan o linisin ang tubig bago uminom.',
        'Boil or purify water before drinking.',
        'beaker-outline',
      ),
      t(
        'Iulat ang pinsala sa CDRRMO.',
        'Report damages to CDRRMO.',
        'chatbubble-ellipses-outline',
      ),
    ],
  },
};

/** Official CDRRMO emergency hotline poster (fallback when remote config is unavailable). */
export const emergencyHotlinePoster: HotlinePosterConfig = defaultHotlinePoster;

/** Legacy flat list (optional use); poster above is authoritative. */
export const emergencyHotlineSections = [
  {
    title: 'Emergency Operation Center 24/7',
    numbers: ['(046) 435-0183', '(046) 481-0555', '0908-818-5555'],
  },
  {
    title: 'CDRRMO',
    numbers: ['(046) 513-1766', '0917-721-8825', '0998-843-5477'],
  },
  {
    title: 'Philippine National Police',
    numbers: ['(046) 416-0256', '0998-598-5508', '0956-803-3329'],
  },
  {
    title: 'Bureau of Fire Protection',
    numbers: ['(046) 416-0875', '(046) 884-6131', '0998-336-9534'],
  },
  {
    title: 'Ambulance / City Rescue',
    numbers: ['0998-566-5555', '0917-777-5263'],
  },
];

export const goBagChecklist: BilingualLine[] = [
  {
    tagalog: 'Tubig at handa nang kainin na pagkain',
    english: 'Water and ready-to-eat food',
  },
  {
    tagalog: 'First aid kit at personal na gamot',
    english: 'First aid kit and personal medicines',
  },
  {
    tagalog: 'Flashlight, baterya, at power bank',
    english: 'Flashlight, batteries, and power bank',
  },
  {
    tagalog: 'Pito, radyo, at mahahalagang dokumento',
    english: 'Whistle, radio, and important documents',
  },
  {
    tagalog: 'Ekstrang damit, hygiene kit, at mask',
    english: 'Extra clothes, hygiene kit, and masks',
  },
];

/** Extract digits for tel: links; returns null for non-phone lines (e.g. Facebook). */
export function getTelDigitsFromHotlineLine(line: string): string | null {
  const t = line.trim();
  if (/^fb:/i.test(t)) {
    return null;
  }
  const digits = t.replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}

export type EmergencyDialEntry = {
  id: string;
  category: string;
  display: string;
  telDigits: string;
};

/** All unique dialable numbers from the official hotline poster (for picker / tap-to-call). */
export function getEmergencyDialList(poster: HotlinePosterConfig = emergencyHotlinePoster): EmergencyDialEntry[] {
  const seen = new Set<string>();
  const out: EmergencyDialEntry[] = [];
  let n = 0;

  const blocks = [...poster.leftColumn, ...poster.rightColumn];

  const shortCat = (title: string): string => {
    if (title.includes('EMERGENCY OPERATION')) {
      return 'EOC 24/7';
    }
    if (title.includes('AMBULANCE')) {
      return 'Ambulance / Rescue';
    }
    if (title.includes('FIRE')) {
      return 'BFP';
    }
    if (title.includes('DISASTER RISK') && title.includes('MANAGEMENT OFFICE')) {
      return 'CDRRMO';
    }
    if (title.includes('MERALCO')) {
      return 'MERALCO';
    }
    if (title.includes('POLICE')) {
      return 'PNP';
    }
    return title.slice(0, 28);
  };

  for (const block of blocks) {
    const cat = shortCat(block.title);
    for (const line of block.lines) {
      const digits = getTelDigitsFromHotlineLine(line);
      if (!digits || seen.has(digits)) {
        continue;
      }
      seen.add(digits);
      n += 1;
      out.push({
        id: `hotline-${n}-${digits}`,
        category: cat,
        display: line.trim(),
        telDigits: digits,
      });
    }
  }

  const mobileFooter = poster.footer.find((r) => r.label.toLowerCase() === 'mobile');
  if (mobileFooter) {
    const digits = getTelDigitsFromHotlineLine(mobileFooter.value);
    if (digits && !seen.has(digits)) {
      n += 1;
      out.push({
        id: `hotline-${n}-${digits}-footer`,
        category: 'CDRRMO (footer)',
        display: mobileFooter.value,
        telDigits: digits,
      });
    }
  }

  return out;
}
