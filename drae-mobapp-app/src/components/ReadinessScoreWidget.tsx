import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RootStackParamList } from '../../App';
import { computeReadinessScore, readinessChecklist } from '../data/readinessChecklist';
import { apple } from '../theme/apple';
import { colors } from '../theme/colors';
import type { PersonalInfo } from '../types/profile';
import type { ReadinessState } from '../types/readiness';

const font = { fontFamily: apple.fontFamily };

function scoreColor(score: number): string {
  if (score >= 70) {
    return '#1a7a4a';
  }
  if (score >= 40) {
    return '#B54708';
  }
  return '#B42318';
}

function scoreLabel(score: number): string {
  if (score >= 70) {
    return 'Good readiness';
  }
  if (score >= 40) {
    return 'Moderate — keep improving';
  }
  return 'Needs attention';
}

type Props = {
  readiness: ReadinessState;
  profile: PersonalInfo;
  variant: 'compact' | 'full';
};

export function ReadinessScoreWidget({ readiness, profile, variant }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const score = computeReadinessScore(readiness.checkedIds);
  const tint = scoreColor(score);
  const unchecked = readinessChecklist.filter((item) => !readiness.checkedIds.includes(item.id));
  const suggestions = unchecked.slice(0, 3).map((item) => item.label);
  const hasEmergencyContact = Boolean(
    (profile.contactPerson?.trim() && profile.contactPersonNumber?.trim()) ||
      profile.contactNumber?.trim(),
  );
  const goBagOk = readiness.checkedIds.includes('go_bag');
  const evacOk = readiness.checkedIds.includes('evac_plan');
  const hotlinesOk = readiness.checkedIds.includes('hotlines');

  const openChecklist = () => navigation.navigate('ReadinessChecklist');

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactCard}
        onPress={openChecklist}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`Readiness score ${score} percent. Opens checklist.`}
      >
        <View style={styles.compactTop}>
          <Text style={[styles.compactTitle, font]}>Household readiness</Text>
          <Text style={[styles.compactPercent, { color: tint }, font]}>{score}%</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${score}%`, backgroundColor: tint }]} />
        </View>
        <Text style={[styles.compactHint, font]}>{scoreLabel(score)} · Tap to update checklist</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.fullCard}>
      <View style={styles.fullHeader}>
        <Text style={[styles.fullTitle, font]}>Readiness score</Text>
        <Text style={[styles.fullPercent, { color: tint }, font]}>{score}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${score}%`, backgroundColor: tint }]} />
      </View>
      <Text style={[styles.fullLabel, { color: tint }, font]}>{scoreLabel(score)}</Text>

      <View style={styles.checkGrid}>
        <View style={styles.checkRow}>
          <Text style={[styles.checkIcon, goBagOk ? styles.checkYes : styles.checkNo]}>
            {goBagOk ? '\u2713' : '\u25CB'}
          </Text>
          <Text style={[styles.checkText, font]}>Go-bag ready</Text>
        </View>
        <View style={styles.checkRow}>
          <Text style={[styles.checkIcon, hasEmergencyContact ? styles.checkYes : styles.checkNo]}>
            {hasEmergencyContact ? '\u2713' : '\u25CB'}
          </Text>
          <Text style={[styles.checkText, font]}>Emergency contacts</Text>
        </View>
        <View style={styles.checkRow}>
          <Text style={[styles.checkIcon, evacOk ? styles.checkYes : styles.checkNo]}>
            {evacOk ? '\u2713' : '\u25CB'}
          </Text>
          <Text style={[styles.checkText, font]}>Evacuation plan</Text>
        </View>
        <View style={styles.checkRow}>
          <Text style={[styles.checkIcon, hotlinesOk ? styles.checkYes : styles.checkNo]}>
            {hotlinesOk ? '\u2713' : '\u25CB'}
          </Text>
          <Text style={[styles.checkText, font]}>Hotlines saved</Text>
        </View>
      </View>

      {suggestions.length > 0 ? (
        <View style={styles.suggestBox}>
          <Text style={[styles.suggestTitle, font]}>Improve readiness</Text>
          {suggestions.map((line) => (
            <Text key={line} style={[styles.suggestLine, font]}>
              • {line}
            </Text>
          ))}
        </View>
      ) : null}

      <TouchableOpacity style={styles.fullCta} onPress={openChecklist} activeOpacity={0.9}>
        <Text style={[styles.fullCtaText, font]}>Open full checklist</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    backgroundColor: colors.card,
    borderRadius: apple.cardRadius,
    padding: 14,
    ...apple.cardShadow,
  },
  compactTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  compactPercent: {
    fontSize: 20,
    fontWeight: '800',
  },
  compactHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.muted,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8E8ED',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  fullCard: {
    backgroundColor: colors.card,
    borderRadius: apple.cardRadius,
    padding: 16,
    ...apple.cardShadow,
    marginBottom: 12,
  },
  fullHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  fullPercent: {
    fontSize: 26,
    fontWeight: '800',
  },
  fullLabel: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  checkGrid: {
    marginTop: 14,
    gap: 10,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkIcon: {
    fontSize: 16,
    width: 22,
    textAlign: 'center',
    fontWeight: '700',
  },
  checkYes: {
    color: '#1a7a4a',
  },
  checkNo: {
    color: colors.muted,
  },
  checkText: {
    fontSize: 15,
    color: colors.text,
  },
  suggestBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FFFB',
    borderWidth: 1,
    borderColor: '#D6E5DB',
  },
  suggestTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 6,
  },
  suggestLine: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  fullCta: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fullCtaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
