import { forwardRef } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  emergencyHotlinePoster,
  type BilingualLine,
  type GuideTip,
  hazardTaglines,
  stageLabels,
  type DisasterHazard,
  type DisasterStage,
} from '../data/disasterContent';

const cityLogo = require('../../assets/city-logo.png');
const cdrLogo = require('../../assets/cdr-logo.png');

export type InfoView = 'hazardMenu' | 'guide' | 'hotlines' | 'goBag';

export const EXPORT_WIDTH = 1080;

type Props = {
  view: InfoView;
  selectedHazard: DisasterHazard;
  stage: DisasterStage;
  allTips: GuideTip[];
  introLine?: BilingualLine;
  goBagItems: BilingualLine[];
};

const hazardMenuLabels: { key: DisasterHazard; label: string }[] = [
  { key: 'Landslide', label: 'Land Slide / Pagguho ng Lupa' },
  { key: 'Flood', label: 'Flood / Baha' },
  { key: 'Earthquake', label: 'Earthquake / Lindol' },
  { key: 'Fire', label: 'Fire / Sunog' },
  { key: 'Tropical Cyclone', label: 'Tropical Cyclone / Bagyo' },
];

/**
 * Off-screen print-style layout for PNG export (not the interactive UI).
 * Fixed width 1080px — scaled for crisp gallery saves.
 */
const InfographicPngExport = forwardRef<View, Props>(function InfographicPngExport(
  { view, selectedHazard, stage, allTips, introLine, goBagItems },
  ref,
) {
  return (
    <View ref={ref} style={styles.root} collapsable={false}>
      {view === 'guide' ? (
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <View style={styles.stripeRed} />
            <View style={styles.stripeBlue} />
            <View style={styles.headerTextBlock}>
              <Text style={styles.kicker}>CDRRMO PREPAREDNESS GUIDEBOOK</Text>
              <Text style={styles.hazardTitle}>{hazardTaglines[selectedHazard]}</Text>
            </View>
          </View>

          <View style={styles.logoRow}>
            <Image source={cityLogo} style={styles.logo} resizeMode="contain" />
            <Image source={cdrLogo} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={[styles.stagePill, stage === 'Before' && styles.stageBefore, stage === 'During' && styles.stageDuring, stage === 'After' && styles.stageAfter]}>
            <Text style={styles.stagePillText}>
              {stageLabels[stage].toUpperCase()} ({stage.toUpperCase()})
            </Text>
          </View>

          {introLine ? (
            <View style={styles.introBlock}>
              <Text style={styles.introTagalog}>{introLine.tagalog}</Text>
              <Text style={styles.introEnglish}>{introLine.english}</Text>
            </View>
          ) : null}

          <View style={styles.tipsArea}>
            {allTips.map((tip, i) => (
              <View key={i} style={styles.tipBlock}>
                <Text style={styles.tipNum}>{i + 1}</Text>
                <View style={styles.tipTextBlock}>
                  <Text style={styles.tipTagalog}>{tip.tagalog}</Text>
                  <Text style={styles.tipEnglish}>{tip.english}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.footerRule} />
          <Text style={styles.footer}>
            City Disaster Risk Reduction and Management Office · City of Dasmariñas, Cavite
          </Text>
          <Text style={styles.footerSub}>DRAE Mobile App — preparedness guide (PNG export)</Text>
        </View>
      ) : null}

      {view === 'hazardMenu' ? (
        <View style={styles.sheet}>
          <View style={styles.logoRow}>
            <Image source={cityLogo} style={styles.logo} resizeMode="contain" />
            <Image source={cdrLogo} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.coverTitle}>PREPAREDNESS{'\n'}GUIDEBOOK</Text>
          <Text style={styles.coverSub}>CDRRMO Dasmariñas — select a hazard in the app to view Before, During, and After tips.</Text>
          <View style={styles.menuList}>
            {hazardMenuLabels.map((row) => (
              <Text key={row.key} style={styles.menuLine}>
                • {row.label}
              </Text>
            ))}
          </View>
          <View style={styles.footerRule} />
          <Text style={styles.footer}>City of Dasmariñas, Cavite · CDRRMO</Text>
        </View>
      ) : null}

      {view === 'hotlines' ? (
        <LinearGradient colors={['#6B1515', '#3D0A0A']} style={styles.hotSheet}>
          <View style={styles.hotLogoRow}>
            <Image source={cityLogo} style={styles.hotLogo} resizeMode="contain" />
            <Image source={cdrLogo} style={styles.hotLogo} resizeMode="contain" />
          </View>
          <Text style={styles.hotOffice}>{emergencyHotlinePoster.headerSubtitle}</Text>
          <Text style={styles.hotCity}>{emergencyHotlinePoster.headerLocation}</Text>
          <View style={styles.hotTitleBar}>
            <View style={styles.hotLine} />
            <Text style={styles.hotTitle}>{emergencyHotlinePoster.mainTitle}</Text>
            <View style={styles.hotLine} />
          </View>
          <Text style={styles.hotTagalog}>{emergencyHotlinePoster.tagalogReminder}</Text>
          <View style={styles.hotCols}>
            <View style={styles.hotCol}>
              {emergencyHotlinePoster.leftColumn.map((block) => (
                <View key={block.title} style={styles.hotBlock}>
                  <Text style={styles.hotBlockTitle}>{block.title}</Text>
                  {block.lines.map((line) => (
                    <Text key={line} style={styles.hotLineText}>
                      {line}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
            <View style={styles.hotCol}>
              {emergencyHotlinePoster.rightColumn.map((block) => (
                <View key={block.title} style={styles.hotBlock}>
                  <Text style={styles.hotBlockTitle}>{block.title}</Text>
                  {block.lines.map((line) => (
                    <Text key={line} style={styles.hotLineText}>
                      {line}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
          <View style={styles.hotFooterBox}>
            {emergencyHotlinePoster.footer.map((row, i) => (
              <Text key={i} style={styles.hotFooterLine}>
                {row.label}: {row.value}
              </Text>
            ))}
          </View>
        </LinearGradient>
      ) : null}

      {view === 'goBag' ? (
        <View style={styles.sheet}>
          <Text style={styles.singleTitle}>EMERGENCY GO BAG</Text>
          {goBagItems.map((line, i) => (
            <View key={line.tagalog} style={styles.goBagBlock}>
              <Text style={styles.goBagNum}>{i + 1}.</Text>
              <View style={styles.goBagTexts}>
                <Text style={styles.goBagTagalog}>{line.tagalog}</Text>
                <Text style={styles.goBagEnglish}>{line.english}</Text>
              </View>
            </View>
          ))}
          <View style={styles.footerRule} />
          <Text style={styles.footer}>City of Dasmariñas · CDRRMO</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    width: EXPORT_WIDTH,
    backgroundColor: '#FFFFFF',
  },
  sheet: {
    width: EXPORT_WIDTH,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 56,
    paddingTop: 48,
    paddingBottom: 56,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 28,
  },
  stripeRed: {
    width: 10,
    height: 120,
    backgroundColor: '#B91C1C',
  },
  stripeBlue: {
    width: 10,
    height: 120,
    backgroundColor: '#1E3A8A',
  },
  headerTextBlock: {
    flex: 1,
    paddingTop: 4,
  },
  kicker: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 1,
  },
  hazardTitle: {
    marginTop: 16,
    fontSize: 34,
    fontWeight: '900',
    color: '#000000',
    lineHeight: 42,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 32,
  },
  logo: {
    width: 120,
    height: 120,
  },
  stagePill: {
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 4,
    marginBottom: 20,
  },
  stageBefore: {
    backgroundColor: '#C45C00',
  },
  stageDuring: {
    backgroundColor: '#B91C1C',
  },
  stageAfter: {
    backgroundColor: '#0F766E',
  },
  stagePillText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  introBlock: {
    marginBottom: 28,
    gap: 8,
  },
  introTagalog: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 34,
  },
  introEnglish: {
    fontSize: 20,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 28,
  },
  tipsArea: {
    gap: 20,
  },
  tipBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D5DB',
  },
  tipNum: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a7a4a',
    width: 44,
  },
  tipTextBlock: {
    flex: 1,
    gap: 8,
  },
  tipTagalog: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 36,
  },
  tipEnglish: {
    fontSize: 20,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 30,
  },
  footerRule: {
    height: 2,
    backgroundColor: '#1a7a4a',
    marginTop: 32,
    marginBottom: 16,
  },
  footer: {
    fontSize: 18,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '700',
  },
  footerSub: {
    marginTop: 8,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  coverTitle: {
    fontSize: 56,
    fontWeight: '900',
    textAlign: 'center',
    color: '#111827',
    lineHeight: 62,
    marginBottom: 20,
  },
  coverSub: {
    fontSize: 22,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 32,
  },
  menuList: {
    gap: 12,
  },
  menuLine: {
    fontSize: 24,
    color: '#111827',
    lineHeight: 34,
  },
  hotSheet: {
    width: EXPORT_WIDTH,
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 48,
  },
  hotLogoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 20,
  },
  hotLogo: {
    width: 88,
    height: 88,
  },
  hotOffice: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
  hotCity: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  hotTitleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  hotLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#22C55E',
  },
  hotTitle: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  hotTagalog: {
    color: 'rgba(254,226,226,0.98)',
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 24,
  },
  hotCols: {
    flexDirection: 'row',
    gap: 24,
  },
  hotCol: {
    flex: 1,
    gap: 20,
  },
  hotBlock: {
    marginBottom: 12,
  },
  hotBlockTitle: {
    color: '#FDE047',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
    lineHeight: 22,
  },
  hotLineText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 30,
    marginBottom: 4,
  },
  hotFooterBox: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.25)',
    gap: 8,
  },
  hotFooterLine: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 18,
    textAlign: 'center',
  },
  singleTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24,
  },
  goBagBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  goBagNum: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a7a4a',
    width: 40,
  },
  goBagTexts: {
    flex: 1,
    gap: 6,
  },
  goBagTagalog: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 34,
  },
  goBagEnglish: {
    fontSize: 20,
    fontWeight: '400',
    color: '#6B7280',
    lineHeight: 30,
  },
});

export default InfographicPngExport;
