import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  InteractionManager,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { AppleRefreshControl } from '../../components/AppleRefreshControl';
import InfographicPngExport, { EXPORT_WIDTH, type InfoView } from '../../components/InfographicPngExport';
import { alertPermissionBlocked, confirmPermissionStep } from '../../utils/permissionDialogs';
import {
  disasterGuideContent,
  DisasterHazard,
  emergencyHotlinePoster,
  getTelDigitsFromHotlineLine,
  goBagChecklist,
  type GuideTip,
  hazardHeroImage,
  hazardTaglines,
  hazardThemeIcon,
  stageIntro,
  stageLabels,
  stageOrder,
} from '../../data/disasterContent';
import { apple } from '../../theme/apple';
import { colors } from '../../theme/colors';

const cdrLogo = require('../../../assets/cdr-logo.png');
const cityLogo = require('../../../assets/city-logo.png');

/** Expo Go cannot use full media-library save; avoid loading that module so the console warning never runs. */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const allHazards: DisasterHazard[] = [
  'Landslide',
  'Flood',
  'Earthquake',
  'Fire',
  'Tropical Cyclone',
];

const hazardMenuButtons: { key: DisasterHazard; label: string }[] = [
  { key: 'Landslide', label: 'Land Slide o\nPagguho ng Lupa' },
  { key: 'Flood', label: 'Flood o\nBaha' },
  { key: 'Earthquake', label: 'Earthquake o\nLindol' },
  { key: 'Fire', label: 'Fire o\nSunog' },
  { key: 'Tropical Cyclone', label: 'Tropical Cyclone o\nBagyo' },
];

export default function InfographicScreen() {
  const exportRef = useRef<View>(null);
  const [downloading, setDownloading] = useState(false);
  const [view, setView] = useState<InfoView>('hazardMenu');
  const [stageIndex, setStageIndex] = useState(0);
  const [selectedHazard, setSelectedHazard] = useState<DisasterHazard>('Landslide');
  const stage = stageOrder[stageIndex];
  const allTips = useMemo(
    () => disasterGuideContent[selectedHazard][stage] as GuideTip[],
    [selectedHazard, stage],
  );
  const hazardHeroSource = hazardHeroImage[selectedHazard];
  const introLine = stageIntro[selectedHazard]?.[stage];
  const [listRefreshing, setListRefreshing] = useState(false);

  const onListRefresh = useCallback(async () => {
    setListRefreshing(true);
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    setListRefreshing(false);
  }, []);

  useEffect(() => {
    setStageIndex(0);
  }, [selectedHazard]);

  const onBackGuide = () => {
    if (stageIndex > 0) {
      setStageIndex((prev) => prev - 1);
      return;
    }
    setView('hazardMenu');
  };

  const onNextGuide = () => {
    if (stageIndex < stageOrder.length - 1) {
      setStageIndex((prev) => prev + 1);
      return;
    }
    setView('hotlines');
  };

  const downloadPng = async () => {
    const proceed = await confirmPermissionStep(
      'Save or share PNG',
      isExpoGo
        ? 'DRAE will create a printable PNG and open the share sheet. Choose Photos, Drive, or another app to save the image.'
        : 'DRAE will create a printable image of this guide. The app may ask to access your photos to save it to your gallery. If saving is not available on your device, you can share the file to Photos or another app instead. You can change photo access anytime in Settings.',
    );
    if (!proceed) {
      return;
    }

    try {
      setDownloading(true);
      await new Promise<void>((resolve) => {
        InteractionManager.runAfterInteractions(() => resolve());
      });
      await new Promise((r) => setTimeout(r, 280));
      const uri = await captureRef(exportRef, {
        format: 'png',
        quality: 1,
        width: EXPORT_WIDTH,
      });

      let galleryPermissionGranted = false;

      if (!isExpoGo) {
        try {
          const ML = require('expo-media-library') as typeof import('expo-media-library');
          const perm = await ML.requestPermissionsAsync();
          galleryPermissionGranted = perm.granted;
          if (perm.granted) {
            try {
              await ML.saveToLibraryAsync(uri);
              Alert.alert('Saved', 'PNG saved to your gallery.');
              return;
            } catch {
              // Fall back to share (e.g. device restrictions).
            }
          }
        } catch {
          // Native module unavailable; fall back to share.
        }
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Save or share PNG',
        });
        return;
      }

      if (!isExpoGo && !galleryPermissionGranted) {
        alertPermissionBlocked(
          'Photo access',
          'Allow photo access for DRAE in Settings to save the PNG to your gallery. You can also use Share when the app offers it.',
        );
        return;
      }

      Alert.alert(
        'Save failed',
        'Could not save to the gallery and sharing is not available on this device. Try again after allowing photo access in Settings, or install the full app for best results.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save the image.';
      Alert.alert('Save failed', message);
    } finally {
      setDownloading(false);
    }
  };

  const dialHotline = (line: string) => {
    const tel = getTelDigitsFromHotlineLine(line);
    if (!tel) {
      return;
    }
    Linking.openURL(`tel:${tel}`).catch(() => {
      Alert.alert('Call failed', 'Unable to open the phone dialer.');
    });
  };

  const openEmail = (address: string) => {
    Linking.openURL(`mailto:${address}`).catch(() => {
      Alert.alert('Email', 'No email app available.');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.shotWrap}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            view === 'hotlines' && styles.containerHotlines,
          ]}
          refreshControl={
            <AppleRefreshControl refreshing={listRefreshing} onRefresh={onListRefresh} />
          }
        >
          {view === 'hazardMenu' ? (
            <View style={styles.menuContainer}>
              <View style={styles.logoRow}>
                <Image source={cityLogo} style={styles.heroLogo} resizeMode="contain" accessibilityLabel="City of Dasmariñas seal" />
                <Image source={cdrLogo} style={styles.heroLogo} resizeMode="contain" accessibilityLabel="CDRRMO logo" />
              </View>
              <View style={styles.menuGreenBand} />
              <Text style={styles.menuKicker}>CDRRMO Dasmariñas</Text>
              <Text style={styles.menuTitle}>PREPAREDNESS{'\n'}GUIDEBOOK</Text>
              <Text style={styles.menuSub}>Select a hazard to view Before, During, and After tips.</Text>
              <View style={styles.menuGrid}>
                {hazardMenuButtons.map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={styles.menuButton}
                    onPress={() => {
                      setSelectedHazard(item.key);
                      setStageIndex(0);
                      setView('guide');
                    }}
                  >
                    <Text style={styles.menuButtonText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.shareWideButton, downloading && styles.shareWideButtonDisabled]}
                onPress={downloadPng}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.shareWideText}>Download PNG (print layout)</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {view === 'guide' ? (
            <>
              <View style={styles.guideHeaderCard}>
                <Text style={styles.guideDisasterTitle}>{hazardTaglines[selectedHazard]}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hazardScroll}>
                  <View style={styles.hazardRow}>
                    {allHazards.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.hazardPill,
                          item === selectedHazard && styles.hazardPillActive,
                        ]}
                        onPress={() => setSelectedHazard(item)}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.hazardPillText,
                            item === selectedHazard && styles.hazardPillTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                <View style={styles.segmented}>
                  {stageOrder.map((item, idx) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.segmentSlot, idx === stageIndex && styles.segmentSlotActive]}
                      onPress={() => setStageIndex(idx)}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.segmentLabel, idx === stageIndex && styles.segmentLabelActive]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.heroTint}>
                {hazardHeroSource != null ? (
                  <Image source={hazardHeroSource} style={styles.heroTintImage} resizeMode="cover" />
                ) : (
                  <View style={styles.heroTintPlaceholder}>
                    <Ionicons name={hazardThemeIcon[selectedHazard] as never} size={28} color={colors.primary} />
                  </View>
                )}
              </View>

              {introLine ? (
                <View style={styles.stageIntroWrap}>
                  <Text style={styles.stageIntroTagalog}>{introLine.tagalog}</Text>
                  <Text style={styles.stageIntroEnglish}>{introLine.english}</Text>
                </View>
              ) : null}

              <View style={styles.tipsBlock}>
                {allTips.map((tip, index) => (
                  <View style={styles.stepCard} key={`${stage}-${index}-${tip.tagalog.slice(0, 12)}`}>
                    <View style={styles.stepIconWrap}>
                      <View style={styles.stepIconCircle}>
                        {tip.image != null ? (
                          <Image source={tip.image} style={styles.stepPhoto} resizeMode="cover" />
                        ) : (
                          <Ionicons name={tip.icon as never} size={18} color={colors.primary} />
                        )}
                      </View>
                      <View style={styles.stepNumBadge}>
                        <Text style={styles.stepNumText}>{index + 1}</Text>
                      </View>
                    </View>
                    <View style={styles.stepTextCol}>
                      <Text style={styles.stepTagalog}>{tip.tagalog}</Text>
                      <Text style={styles.stepEnglish}>{tip.english}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <View style={styles.pagerRow}>
                <TouchableOpacity style={styles.pagerButton} onPress={onBackGuide}>
                  <Text style={styles.pagerText}>BACK</Text>
                </TouchableOpacity>
                <Text style={styles.pagerMeta}>
                  {stageLabels[stage]} · {stageIndex + 1}/3
                </Text>
                <TouchableOpacity style={styles.pagerButton} onPress={onNextGuide}>
                  <Text style={styles.pagerText}>{stageIndex < 2 ? 'NEXT' : 'HOTLINES'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.shareWideButton, downloading && styles.shareWideButtonDisabled]}
                onPress={downloadPng}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.shareWideText}>Download PNG (print layout)</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resourceActions}>
                <TouchableOpacity style={styles.resourceButton} onPress={() => setView('hotlines')}>
                  <Text style={styles.resourceText}>Emergency Hotlines</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.resourceButton} onPress={() => setView('goBag')}>
                  <Text style={styles.resourceText}>Emergency Go Bag</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {view === 'hotlines' ? (
            <LinearGradient
              colors={['#7F1D1D', '#450A0A', '#1C0A0A']}
              locations={[0, 0.55, 1]}
              style={styles.hotlinePoster}
            >
              <View style={styles.hotlineGlowTop} />
              <View style={styles.hotlineLogoRow}>
                <Image source={cityLogo} style={styles.posterLogo} resizeMode="contain" />
                <Image source={cdrLogo} style={styles.posterLogo} resizeMode="contain" />
              </View>
              <Text style={styles.hotlineOfficeLine}>{emergencyHotlinePoster.headerSubtitle}</Text>
              <Text style={styles.hotlineCityLine}>{emergencyHotlinePoster.headerLocation}</Text>

              <View style={styles.hotlineTitleWrap}>
                <View style={styles.hotlineTitleLine} />
                <Text style={styles.hotlineMainTitle}>{emergencyHotlinePoster.mainTitle}</Text>
                <View style={styles.hotlineTitleLine} />
              </View>

              <Text style={styles.hotlineTagalog}>{emergencyHotlinePoster.tagalogReminder}</Text>

              <View style={styles.hotlineTwoCol}>
                <View style={styles.hotlineCol}>
                  {emergencyHotlinePoster.leftColumn.map((block) => (
                    <View key={block.title} style={styles.hotlineBlock}>
                      <Text style={styles.hotlineBlockTitle}>{block.title}</Text>
                      {block.lines.map((line, idx) => {
                        const tel = getTelDigitsFromHotlineLine(line);
                        const key = `l-${block.title}-${idx}`;
                        return tel ? (
                          <TouchableOpacity
                            key={key}
                            style={styles.hotlineDialRow}
                            onPress={() => dialHotline(line)}
                            activeOpacity={0.75}
                          >
                            <Text style={styles.hotlineBlockLine}>{line}</Text>
                            <Text style={styles.hotlineDialCue}>Call</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text key={key} style={styles.hotlineBlockLineMuted}>
                            {line}
                          </Text>
                        );
                      })}
                    </View>
                  ))}
                </View>
                <View style={styles.hotlineCol}>
                  {emergencyHotlinePoster.rightColumn.map((block) => (
                    <View key={block.title} style={styles.hotlineBlock}>
                      <Text style={styles.hotlineBlockTitle}>{block.title}</Text>
                      {block.lines.map((line, idx) => {
                        const tel = getTelDigitsFromHotlineLine(line);
                        const key = `r-${block.title}-${idx}`;
                        return tel ? (
                          <TouchableOpacity
                            key={key}
                            style={styles.hotlineDialRow}
                            onPress={() => dialHotline(line)}
                            activeOpacity={0.75}
                          >
                            <Text style={styles.hotlineBlockLine}>{line}</Text>
                            <Text style={styles.hotlineDialCue}>Call</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text key={key} style={styles.hotlineBlockLineMuted}>
                            {line}
                          </Text>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.hotlineFooter}>
                {emergencyHotlinePoster.footer.map((row, i) => {
                  const key = `${row.label}-${i}`;
                  const labelLower = row.label.toLowerCase();
                  if (labelLower === 'email') {
                    return (
                      <TouchableOpacity key={key} onPress={() => openEmail(row.value)}>
                        <Text style={styles.hotlineFooterLine}>
                          <Text style={styles.hotlineFooterLabel}>{row.label}: </Text>
                          <Text style={styles.hotlineFooterLink}>{row.value}</Text>
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                  if (labelLower === 'mobile') {
                    const tel = getTelDigitsFromHotlineLine(row.value);
                    return tel ? (
                      <TouchableOpacity key={key} onPress={() => dialHotline(row.value)}>
                        <Text style={styles.hotlineFooterLine}>
                          <Text style={styles.hotlineFooterLabel}>{row.label}: </Text>
                          <Text style={styles.hotlineFooterLink}>{row.value}</Text>
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text key={key} style={styles.hotlineFooterLine}>
                        <Text style={styles.hotlineFooterLabel}>{row.label}: </Text>
                        {row.value}
                      </Text>
                    );
                  }
                  return (
                    <Text key={key} style={styles.hotlineFooterLine}>
                      <Text style={styles.hotlineFooterLabel}>{row.label}: </Text>
                      {row.value}
                    </Text>
                  );
                })}
              </View>

              <View style={styles.utilityFooter}>
                <TouchableOpacity style={styles.pagerButtonLight} onPress={() => setView('guide')}>
                  <Text style={styles.pagerTextDark}>BACK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pagerButtonLight, styles.shareMini, downloading && styles.shareWideButtonDisabled]}
                  onPress={downloadPng}
                  disabled={downloading}
                >
                  {downloading ? (
                    <ActivityIndicator color="#1f2937" size="small" />
                  ) : (
                    <Text style={styles.pagerTextDark}>PNG</Text>
                  )}
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ) : null}

          {view === 'goBag' ? (
            <View style={styles.utilityPanelLight}>
              <Text style={styles.utilityTitleDark}>EMERGENCY GO BAG</Text>
              <Text style={styles.utilitySubDark}>
                Checklist — pack these before an emergency.
              </Text>
              <View style={styles.goBagList}>
                {goBagChecklist.map((item, idx) => (
                  <View key={item.tagalog} style={styles.goBagRow}>
                    <View style={styles.goBagNumBadge}>
                      <Text style={styles.goBagNumText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.goBagTextCol}>
                      <Text style={styles.goBagTagalog}>{item.tagalog}</Text>
                      <Text style={styles.goBagEnglish}>{item.english}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.utilityFooter}>
                <TouchableOpacity style={styles.pagerButton} onPress={() => setView('guide')}>
                  <Text style={styles.pagerText}>BACK</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pagerButton, styles.shareMini, downloading && styles.shareWideButtonDisabled]}
                  onPress={downloadPng}
                  disabled={downloading}
                >
                  {downloading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.pagerText}>PNG</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>
      <View style={styles.exportHost} pointerEvents="none" collapsable={false}>
        <InfographicPngExport
          ref={exportRef}
          view={view}
          selectedHazard={selectedHazard}
          stage={stage}
          allTips={allTips}
          introLine={introLine}
          goBagItems={goBagChecklist}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: apple.groupedBackground,
  },
  shotWrap: {
    flex: 1,
  },
  /** Off-screen host so the print-layout export view lays out at full size for captureRef. */
  exportHost: {
    position: 'absolute',
    left: -10000,
    top: 0,
    opacity: 1,
  },
  container: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: apple.groupedBackground,
    gap: 12,
  },
  containerHotlines: {
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  menuContainer: {
    borderRadius: apple.cardRadius,
    backgroundColor: apple.secondaryGrouped,
    padding: 20,
    ...apple.cardShadow,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 10,
  },
  heroLogo: {
    width: 88,
    height: 88,
  },
  menuGreenBand: {
    height: 5,
    backgroundColor: colors.primary,
    borderRadius: 3,
    marginBottom: 14,
  },
  menuKicker: {
    textAlign: 'center',
    color: apple.secondaryLabel,
    fontSize: apple.infographic.labelCaps,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  menuTitle: {
    textAlign: 'center',
    color: apple.label,
    fontSize: apple.infographic.titleLarge,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 40,
  },
  menuSub: {
    textAlign: 'center',
    color: apple.secondaryLabel,
    fontSize: apple.infographic.english + 1,
    fontWeight: '400',
    lineHeight: 22,
    marginBottom: 18,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  menuButton: {
    width: '48%',
    minHeight: 88,
    borderRadius: 14,
    backgroundColor: apple.groupedBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: apple.divider,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  menuButtonText: {
    textAlign: 'center',
    color: apple.label,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
  },
  guideHeaderCard: {
    backgroundColor: colors.card,
    marginHorizontal: -14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: apple.cardRadius,
    borderBottomRightRadius: apple.cardRadius,
    marginBottom: 12,
    ...apple.cardShadow,
  },
  guideDisasterTitle: {
    fontFamily: apple.fontFamily,
    fontSize: apple.infographic.titleMedium,
    fontWeight: '700',
    color: apple.label,
    lineHeight: 28,
    marginBottom: 12,
  },
  hazardScroll: {
    marginBottom: 12,
  },
  hazardRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  hazardPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#e5e5ea',
  },
  hazardPillActive: {
    backgroundColor: colors.primary,
  },
  hazardPillText: {
    fontFamily: apple.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#3a3a3c',
    maxWidth: 140,
  },
  hazardPillTextActive: {
    color: '#ffffff',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#e5e5ea',
    borderRadius: 9,
    padding: 2,
    gap: 2,
  },
  segmentSlot: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSlotActive: {
    backgroundColor: '#ffffff',
    ...apple.cardShadow,
  },
  segmentLabel: {
    fontFamily: apple.fontFamily,
    fontSize: 13,
    fontWeight: '500',
    color: '#6c6c70',
  },
  segmentLabelActive: {
    color: '#000000',
    fontWeight: '600',
  },
  heroTint: {
    height: 72,
    borderRadius: apple.cardRadius,
    backgroundColor: '#def0fb',
    overflow: 'hidden',
    marginBottom: 12,
  },
  heroTintImage: {
    width: '100%',
    height: '100%',
  },
  heroTintPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageIntroWrap: {
    marginBottom: 14,
    paddingHorizontal: 2,
    gap: 4,
  },
  stageIntroTagalog: {
    fontFamily: apple.fontFamily,
    color: apple.label,
    fontSize: apple.infographic.tagalog,
    fontWeight: '600',
    lineHeight: apple.infographic.tagalogLineHeight,
  },
  stageIntroEnglish: {
    fontFamily: apple.fontFamily,
    color: apple.secondaryLabel,
    fontSize: apple.infographic.english,
    fontWeight: '400',
    lineHeight: apple.infographic.englishLineHeight,
  },
  tipsBlock: {
    gap: 12,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: apple.cardRadius,
    backgroundColor: colors.card,
    ...apple.cardShadow,
  },
  stepIconWrap: {
    width: 34,
    height: 34,
    position: 'relative',
    marginTop: 2,
  },
  stepIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f0f5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stepPhoto: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  stepNumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: apple.fontFamily,
    fontSize: 9,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 11,
  },
  stepTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  stepTagalog: {
    fontFamily: apple.fontFamily,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  stepEnglish: {
    fontFamily: apple.fontFamily,
    color: colors.secondaryText,
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
  },
  pagerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 2,
  },
  pagerButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    minWidth: 88,
    alignItems: 'center',
  },
  pagerButtonLight: {
    backgroundColor: apple.secondaryGrouped,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: apple.divider,
    minWidth: 88,
    alignItems: 'center',
  },
  pagerText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  pagerTextDark: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
  },
  pagerMeta: {
    color: apple.secondaryLabel,
    fontWeight: '600',
    fontSize: 13,
  },
  resourceActions: {
    marginTop: 8,
    gap: 10,
  },
  resourceButton: {
    borderRadius: 12,
    backgroundColor: apple.secondaryGrouped,
    paddingVertical: 14,
    ...apple.cardShadow,
  },
  resourceText: {
    textAlign: 'center',
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  utilityPanelLight: {
    borderRadius: apple.cardRadius,
    backgroundColor: apple.secondaryGrouped,
    padding: 18,
    gap: 10,
    ...apple.cardShadow,
  },
  utilityTitleDark: {
    textAlign: 'left',
    color: apple.label,
    fontWeight: '700',
    fontSize: apple.infographic.titleMedium,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  utilitySubDark: {
    color: apple.secondaryLabel,
    fontSize: apple.infographic.english,
    fontWeight: '400',
    lineHeight: apple.infographic.englishLineHeight,
    marginBottom: 8,
  },
  hotlinePoster: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 20,
    borderRadius: apple.cardRadius,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  hotlineGlowTop: {
    height: 2,
    backgroundColor: '#22C55E',
    opacity: 0.85,
    marginBottom: 10,
    borderRadius: 2,
  },
  hotlineLogoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 8,
  },
  posterLogo: {
    width: 56,
    height: 56,
  },
  hotlineOfficeLine: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  hotlineCityLine: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 12,
  },
  hotlineTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  hotlineTitleLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#22C55E',
    opacity: 0.9,
    borderRadius: 1,
  },
  hotlineMainTitle: {
    flexShrink: 0,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    fontStyle: 'italic',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hotlineTagalog: {
    color: 'rgba(254, 226, 226, 0.95)',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  hotlineTwoCol: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  hotlineCol: {
    flex: 1,
    gap: 12,
  },
  hotlineBlock: {
    marginBottom: 4,
  },
  hotlineBlockTitle: {
    color: '#FDE047',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 6,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  hotlineBlockLine: {
    color: '#FFFFFF',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 0,
    flex: 1,
  },
  hotlineBlockLineMuted: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    lineHeight: 17,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  hotlineDialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  hotlineDialCue: {
    color: '#FDE047',
    fontSize: 11,
    fontWeight: '800',
  },
  hotlineFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    gap: 4,
  },
  hotlineFooterLine: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    textAlign: 'center',
  },
  hotlineFooterLabel: {
    fontWeight: '700',
    color: '#FDE047',
  },
  hotlineFooterLink: {
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
  goBagList: {
    gap: 10,
    marginTop: 4,
  },
  goBagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: apple.groupedBackground,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: apple.divider,
  },
  goBagNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  goBagNumText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  goBagTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  goBagTagalog: {
    color: apple.label,
    fontSize: apple.infographic.tagalog,
    fontWeight: '700',
    lineHeight: apple.infographic.tagalogLineHeight,
  },
  goBagEnglish: {
    color: apple.secondaryLabel,
    fontSize: apple.infographic.english,
    fontWeight: '400',
    lineHeight: apple.infographic.englishLineHeight,
  },
  shareWideButton: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: apple.secondaryGrouped,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    ...apple.cardShadow,
  },
  shareWideButtonDisabled: {
    opacity: 0.65,
  },
  shareWideText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  utilityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  shareMini: {
    flex: 1,
    alignItems: 'center',
  },
});
