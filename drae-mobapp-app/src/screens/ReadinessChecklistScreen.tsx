import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';
import { AppleRefreshControl } from '../components/AppleRefreshControl';
import {
  computeReadinessScore,
  readinessChecklist,
} from '../data/readinessChecklist';
import { useAppData } from '../context/AppDataContext';
import { apple } from '../theme/apple';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'ReadinessChecklist'>;

export default function ReadinessChecklistScreen({ navigation }: Props) {
  const { readiness, setReadiness, refreshFromRemote } = useAppData();
  const [refreshing, setRefreshing] = useState(false);

  const toggleItem = async (itemId: string) => {
    const checkedIds = readiness.checkedIds.includes(itemId)
      ? readiness.checkedIds.filter((id) => id !== itemId)
      : [...readiness.checkedIds, itemId];

    await setReadiness({
      checkedIds,
      score: computeReadinessScore(checkedIds),
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFromRemote();
    } finally {
      setRefreshing(false);
    }
  }, [refreshFromRemote]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <AppleRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Household Readiness Score</Text>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreValue}>{readiness.score}%</Text>
          <Text style={styles.scoreLabel}>Preparedness Score</Text>
          <Text style={styles.scoreSub}>
            Complete more items to improve household disaster readiness.
          </Text>
        </View>

        {readinessChecklist.map((item) => {
          const checked = readiness.checkedIds.includes(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.itemCard, checked && styles.itemCardChecked]}
              onPress={() => toggleItem(item.id)}
            >
              <View style={[styles.checkDot, checked && styles.checkDotChecked]} />
              <View style={styles.itemTextWrap}>
                <Text style={styles.itemTitle}>{item.label}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
          <Text style={styles.doneButtonText}>DONE</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: apple.groupedBackground,
  },
  container: {
    flexGrow: 1,
    backgroundColor: apple.groupedBackground,
    padding: apple.insetGroupedMargin,
    gap: 12,
  },
  title: {
    color: apple.label,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.25,
  },
  scoreCard: {
    backgroundColor: apple.secondaryGrouped,
    borderRadius: apple.cardRadius,
    padding: 18,
    alignItems: 'center',
    ...apple.cardShadow,
  },
  scoreValue: {
    color: colors.primary,
    fontSize: 42,
    fontWeight: '800',
  },
  scoreLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  scoreSub: {
    marginTop: 6,
    color: apple.secondaryLabel,
    textAlign: 'center',
    fontSize: 13,
  },
  itemCard: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: apple.secondaryGrouped,
    borderRadius: apple.cardRadius,
    padding: 14,
    ...apple.cardShadow,
  },
  itemCardChecked: {
    backgroundColor: '#EDF9F0',
    borderColor: colors.primary,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#A8A8A8',
    backgroundColor: '#FFFFFF',
  },
  checkDotChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  itemDescription: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  doneButton: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 10,
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 17,
  },
});
