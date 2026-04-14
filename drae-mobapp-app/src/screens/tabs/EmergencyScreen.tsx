import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../../App';
import { AppleRefreshControl } from '../../components/AppleRefreshControl';
import { ReadinessScoreWidget } from '../../components/ReadinessScoreWidget';
import {
  type EmergencyDialEntry,
  getEmergencyDialList,
} from '../../data/disasterContent';
import { useAppData } from '../../context/AppDataContext';
import { fetchHotlines } from '../../services/supabaseService';
import { digitsForPhilippineDialOrSms } from '../../utils/phoneFormat';
import { apple } from '../../theme/apple';
import { colors } from '../../theme/colors';

function mergeDialList(
  base: EmergencyDialEntry[],
  remote: { id: string; label: string; phone: string }[],
): EmergencyDialEntry[] {
  const seen = new Set(base.map((b) => b.telDigits));
  const extra: EmergencyDialEntry[] = [];
  for (const h of remote) {
    const digits = h.phone.replace(/\D/g, '');
    if (digits.length < 7 || seen.has(digits)) {
      continue;
    }
    seen.add(digits);
    extra.push({
      id: `db-${h.id}`,
      category: 'Official',
      display: `${h.label}: ${h.phone}`,
      telDigits: digits,
    });
  }
  return [...extra, ...base];
}

const cdrLogo = require('../../../assets/cdr-logo.png');
const cityLogo = require('../../../assets/city-logo.png');

const HAZARD_ROWS: { hazard: string; emoji: string }[] = [
  { hazard: 'Flood', emoji: '🌊' },
  { hazard: 'Landslide', emoji: '⛰️' },
  { hazard: 'Earthquake', emoji: '🏚️' },
  { hazard: 'Fire', emoji: '🔥' },
  { hazard: 'Others', emoji: '📋' },
];

const font = { fontFamily: apple.fontFamily };

function openSafetySms(phoneRaw: string, body: string) {
  const digits = digitsForPhilippineDialOrSms(phoneRaw);
  if (!digits) {
    return false;
  }
  const enc = encodeURIComponent(body);
  const url =
    Platform.OS === 'ios' ? `sms:${digits}&body=${enc}` : `sms:${digits}?body=${enc}`;
  return url;
}

export default function EmergencyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, readiness } = useAppData();
  const [hotlineModalOpen, setHotlineModalOpen] = useState(false);
  const [dialList, setDialList] = useState<EmergencyDialEntry[]>(() =>
    getEmergencyDialList(),
  );
  const [refreshing, setRefreshing] = useState(false);
  const loadDialList = useCallback(async () => {
    const base = getEmergencyDialList();
    try {
      const remote = await fetchHotlines();
      if (!remote.length) {
        setDialList(base);
        return;
      }
      setDialList(mergeDialList(base, remote));
    } catch {
      setDialList(base);
    }
  }, []);

  useEffect(() => {
    loadDialList();
  }, [loadDialList]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDialList();
    } finally {
      setRefreshing(false);
    }
  };

  const dial = async (telDigits: string) => {
    try {
      await Linking.openURL(`tel:${telDigits}`);
    } catch {
      Alert.alert('Call failed', 'Unable to open the phone dialer on this device.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <AppleRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.brandRow}>
          <View style={styles.logoCircle}>
            <Image source={cityLogo} style={styles.logoImage} resizeMode="contain" accessibilityLabel="City of Dasmariñas" />
          </View>
          <View style={styles.logoCircle}>
            <Image source={cdrLogo} style={styles.logoImage} resizeMode="contain" accessibilityLabel="CDRRMO" />
          </View>
        </View>

        <Text style={styles.pageTitle}>Report Emergency</Text>

        <ReadinessScoreWidget readiness={readiness} profile={profile} variant="compact" />

        <TouchableOpacity
          style={styles.safeButton}
          activeOpacity={0.88}
          onPress={() => {
            const phone =
              profile.contactPersonNumber?.trim() || profile.contactNumber?.trim() || '';
            const name = profile.fullName?.trim() || 'Resident';
            const body = `I am safe — ${name}. Time: ${new Date().toLocaleString('en-PH')}. (Sent via DRAE / CDRRMO Dasmariñas app)`;
            const url = openSafetySms(phone, body);
            if (!url) {
              Alert.alert(
                'Add a contact',
                'Add your mobile or emergency contact number in Profile → Edit Profile so we can open SMS.',
              );
              return;
            }
            Linking.openURL(url).catch(() => {
              Alert.alert('SMS', 'Could not open the SMS app. Try again or call your contact.');
            });
            Alert.alert('Status', 'Opening SMS with your safety message. Tap Send in your messaging app.');
          }}
          accessibilityRole="button"
          accessibilityLabel="I am safe — send SMS to your emergency contact"
        >
          <Text style={styles.safeButtonTitle}>I am safe</Text>
          <Text style={styles.safeButtonSub}>One tap — SMS to your saved emergency number</Text>
        </TouchableOpacity>

        <View style={styles.groupCard}>
          {HAZARD_ROWS.map((row, index) => (
            <TouchableOpacity
              key={row.hazard}
              style={[styles.listRow, index < HAZARD_ROWS.length - 1 && styles.listRowDivider]}
              onPress={() =>
                navigation.navigate('IncidentReport', {
                  prefillHazard: row.hazard,
                })
              }
              activeOpacity={0.65}
            >
              <Text style={styles.rowEmoji}>{row.emoji}</Text>
              <Text style={styles.rowLabel}>{row.hazard}</Text>
              <Ionicons name="chevron-forward" size={20} color="#c7c7cc" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.groupCard}>
          <TouchableOpacity
            style={[styles.linkRow, styles.listRowDivider]}
            onPress={() => setHotlineModalOpen(true)}
            activeOpacity={0.65}
          >
            <Text style={styles.linkRowText}>Emergency Hotlines</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('EvacuationCenters')}
            activeOpacity={0.65}
          >
            <Text style={styles.linkRowText}>Evacuation Centers</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={hotlineModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setHotlineModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setHotlineModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalBrand}>
              <Image source={cityLogo} style={styles.modalLogo} resizeMode="contain" />
              <Image source={cdrLogo} style={styles.modalLogo} resizeMode="contain" />
            </View>
            <Text style={styles.modalTitle}>Choose a number</Text>
            <Text style={styles.modalSub}>Tap any line to call on your phone.</Text>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {dialList.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.dialRow}
                  onPress={() => dial(item.telDigits)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dialRowText}>
                    <Text style={styles.dialCategory}>{item.category}</Text>
                    <Text style={styles.dialDisplay}>{item.display}</Text>
                  </View>
                  <Text style={styles.dialCall}>Call</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setHotlineModalOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: apple.groupedBackground,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: apple.groupedBackground,
    paddingHorizontal: apple.insetGroupedMargin,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 16,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginBottom: 4,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...apple.cardShadow,
  },
  logoImage: {
    width: '88%',
    height: '88%',
  },
  pageTitle: {
    ...font,
    color: colors.text,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  safeButton: {
    backgroundColor: '#145a38',
    borderRadius: apple.cardRadius,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 4,
    ...apple.cardShadow,
  },
  safeButtonTitle: {
    ...font,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  safeButtonSub: {
    ...font,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  groupCard: {
    backgroundColor: colors.card,
    borderRadius: apple.cardRadius,
    overflow: 'hidden',
    ...apple.cardShadow,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  listRowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: apple.divider,
  },
  rowEmoji: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  rowLabel: {
    ...font,
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '400',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  linkRowText: {
    ...font,
    color: colors.primary,
    fontSize: 17,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  modalBrand: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 10,
  },
  modalLogo: {
    width: 52,
    height: 52,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
  },
  modalSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalScroll: {
    maxHeight: 420,
  },
  dialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    marginBottom: 6,
    borderRadius: 10,
  },
  dialRowText: {
    flex: 1,
    marginRight: 10,
  },
  dialCategory: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dialDisplay: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  dialCall: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  modalCloseBtn: {
    marginTop: 14,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
});
