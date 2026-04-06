import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';
import { AppleRefreshControl } from '../components/AppleRefreshControl';
import {
  EvacuationCenter,
  fetchEvacuationCenters,
} from '../services/supabaseService';
import { apple } from '../theme/apple';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'EvacuationCenters'>;

export default function EvacuationCentersScreen({}: Props) {
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);

  const loadCenters = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setIsLoading(true);
    }
    try {
      const data = await fetchEvacuationCenters();
      setCenters(data);
      if (data.length > 0) {
        setSelectedCenterId((prev) => {
          if (prev && data.some((c) => c.id === prev)) {
            return prev;
          }
          return data[0].id;
        });
      }
    } finally {
      if (!opts?.silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadCenters();
  }, [loadCenters]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCenters({ silent: true });
    } finally {
      setRefreshing(false);
    }
  };

  const openMapsSearch = async (name: string, address: string) => {
    const query = encodeURIComponent(`${name}, ${address}`);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Cannot open maps', 'Google Maps link is unavailable on this device.');
      return;
    }
    await Linking.openURL(url);
  };

  const mappedCenters = centers.filter(
    (center) => center.latitude != null && center.longitude != null,
  );
  const selectedCenter =
    centers.find((center) => center.id === selectedCenterId) || centers[0] || null;
  const mapRegion = selectedCenter?.latitude != null &&
    selectedCenter.longitude != null && {
      latitude: selectedCenter.latitude,
      longitude: selectedCenter.longitude,
      latitudeDelta: 0.06,
      longitudeDelta: 0.06,
    };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <AppleRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Evacuation Centers</Text>
        <Text style={styles.subtitle}>
          View nearby centers on map, then open external directions if needed.
        </Text>

        <View style={styles.segmentWrap}>
          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'map' && styles.segmentButtonActive]}
            onPress={() => setViewMode('map')}
          >
            <Text
              style={[styles.segmentButtonText, viewMode === 'map' && styles.segmentButtonTextActive]}
            >
              MAP
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentButton, viewMode === 'list' && styles.segmentButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Text
              style={[styles.segmentButtonText, viewMode === 'list' && styles.segmentButtonTextActive]}
            >
              LIST
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : null}

        {!isLoading && viewMode === 'map' && mapRegion ? (
          <View style={styles.mapPanel}>
            <MapView style={styles.map} initialRegion={mapRegion}>
              {mappedCenters.map((center) =>
                center.latitude != null && center.longitude != null ? (
                  <Marker
                    key={center.id}
                    coordinate={{ latitude: center.latitude, longitude: center.longitude }}
                    title={center.name}
                    description={center.address}
                    onPress={() => setSelectedCenterId(center.id)}
                  />
                ) : null,
              )}
            </MapView>
            {selectedCenter ? (
              <View style={styles.selectedCenterCard}>
                <Text style={styles.cardTitle}>{selectedCenter.name}</Text>
                <Text style={styles.cardLine}>{selectedCenter.address}</Text>
                <Text style={styles.cardLine}>Contact: {selectedCenter.contact || '-'}</Text>
                <TouchableOpacity
                  style={styles.directionButton}
                  onPress={() => openMapsSearch(selectedCenter.name, selectedCenter.address)}
                >
                  <Text style={styles.directionButtonText}>OPEN DIRECTIONS</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        {!isLoading && viewMode === 'list'
          ? centers.map((center) => (
              <TouchableOpacity
                key={center.id}
                style={styles.card}
                onPress={() => openMapsSearch(center.name, center.address)}
              >
                <Text style={styles.cardTitle}>{center.name}</Text>
                <Text style={styles.cardLine}>{center.address}</Text>
                <Text style={styles.cardLine}>Contact: {center.contact || '-'}</Text>
              </TouchableOpacity>
            ))
          : null}

        {!isLoading && centers.length === 0 ? (
          <Text style={styles.emptyText}>No evacuation centers found.</Text>
        ) : null}
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
    letterSpacing: 0.25,
  },
  subtitle: {
    color: apple.secondaryLabel,
    fontSize: 15,
    lineHeight: 22,
  },
  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: apple.tertiaryFill,
    borderRadius: 10,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: apple.secondaryGrouped,
    ...apple.cardShadow,
  },
  segmentButtonText: {
    color: apple.secondaryLabel,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  segmentButtonTextActive: {
    color: colors.primary,
  },
  mapPanel: {
    gap: 10,
  },
  map: {
    height: 260,
    borderRadius: apple.cardRadius,
    overflow: 'hidden',
    ...apple.cardShadow,
  },
  selectedCenterCard: {
    backgroundColor: apple.secondaryGrouped,
    borderRadius: apple.cardRadius,
    padding: 14,
    gap: 4,
    ...apple.cardShadow,
  },
  card: {
    backgroundColor: apple.secondaryGrouped,
    borderRadius: apple.cardRadius,
    padding: 14,
    gap: 4,
    ...apple.cardShadow,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 17,
  },
  cardLine: {
    color: '#3D3D3D',
  },
  directionButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  directionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  emptyText: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 18,
  },
});
