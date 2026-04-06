import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Advisory,
  fetchActiveAdvisories,
  subscribeToActiveAdvisories,
} from '../../services/supabaseService';
import {
  fetchCurrentWeather,
  fetchForecast24h,
  isWeatherApiConfigured,
  weatherIconUrl,
  type ForecastSlot,
  type WeatherCurrent,
} from '../../services/weatherService';
import { AppleRefreshControl } from '../../components/AppleRefreshControl';
import { apple } from '../../theme/apple';
import { colors } from '../../theme/colors';

const font = { fontFamily: apple.fontFamily };

const WEATHER_POLL_MS = 10 * 60 * 1000;

export default function WeatherScreen() {
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeather, setCurrentWeather] = useState<WeatherCurrent | null>(null);
  const [forecastSlots, setForecastSlots] = useState<ForecastSlot[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadWeather = useCallback(async () => {
    if (!isWeatherApiConfigured) {
      setCurrentWeather(null);
      setForecastSlots([]);
      setWeatherError(null);
      return;
    }
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const [current, forecast] = await Promise.all([
        fetchCurrentWeather(),
        fetchForecast24h(),
      ]);
      setCurrentWeather(current);
      setForecastSlots(forecast);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Weather could not be loaded.';
      setWeatherError(message);
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWeather();
    }, [loadWeather]),
  );

  useEffect(() => {
    if (!isWeatherApiConfigured) {
      return;
    }
    const id = setInterval(loadWeather, WEATHER_POLL_MS);
    return () => clearInterval(id);
  }, [loadWeather]);

  const loadAdvisories = useCallback(async () => {
    try {
      const data = await fetchActiveAdvisories();
      setAdvisories(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    loadAdvisories();
    const unsubscribe = subscribeToActiveAdvisories((data) => {
      if (isMounted) {
        setAdvisories(data);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [loadAdvisories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWeather(), loadAdvisories()]);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <AppleRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Weather & Alerts</Text>

        <View style={styles.alertCard}>
          <Text style={styles.alertLabel}>CURRENT ALERT</Text>
          <Text style={styles.alertValue}>
            {advisories[0]?.title ?? 'No severe warning at this time.'}
          </Text>
          <Text style={styles.alertSub}>
            {advisories[0]?.message ??
              'Stay updated and monitor official advisories from CDRRMO and PAGASA.'}
          </Text>
        </View>

        <Text style={styles.sectionHeading}>CDRRMO Advisories</Text>
        {isLoading ? <ActivityIndicator color={colors.primary} style={styles.sectionSpinner} /> : null}
        {!isLoading && advisories.length === 0 ? (
          <Text style={styles.emptyAdvisory}>No active advisories right now.</Text>
        ) : null}
        {advisories.map((advisory) => (
          <View style={styles.advisoryCardOuter} key={advisory.id}>
            <View style={styles.advisoryHeader}>
              <Text style={styles.advisoryTitle}>{advisory.title}</Text>
              <View
                style={[
                  styles.severityBadge,
                  advisory.severity === 'high'
                    ? styles.severityHigh
                    : advisory.severity === 'medium'
                      ? styles.severityMedium
                      : styles.severityLow,
                ]}
              >
                <Text
                  style={[
                    styles.severityText,
                    advisory.severity === 'high'
                      ? styles.severityTextHigh
                      : advisory.severity === 'medium'
                        ? styles.severityTextMedium
                        : styles.severityTextLow,
                  ]}
                >
                  {advisory.severity.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.advisoryMessage}>{advisory.message}</Text>
            <Text style={styles.advisoryMeta}>
              {advisory.source} · {formatDate(advisory.createdAt)}
            </Text>
          </View>
        ))}

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Quick Reminders</Text>
        <Text style={styles.item}>- Keep emergency go-bag ready.</Text>
        <Text style={styles.item}>- Save CDRRMO and emergency hotline numbers.</Text>
        <Text style={styles.item}>- Charge mobile devices before heavy rain.</Text>
      </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Live weather (OpenWeather)</Text>
          <Text style={styles.weatherMeta}>
            {isWeatherApiConfigured
              ? 'Refreshes when you open this tab, every 10 minutes, and when you pull down.'
              : 'Add EXPO_PUBLIC_OPENWEATHER_API_KEY to your .env (free key from openweathermap.org).'}
          </Text>
          {!isWeatherApiConfigured ? (
            <Text style={styles.item}>
              Optional: set coordinates with EXPO_PUBLIC_WEATHER_LAT and EXPO_PUBLIC_WEATHER_LON
              (defaults to Dasmariñas area).
            </Text>
          ) : null}
          {isWeatherApiConfigured && weatherLoading && !currentWeather ? (
            <ActivityIndicator color={colors.primary} style={styles.weatherSpinner} />
          ) : null}
          {weatherError ? <Text style={styles.weatherErr}>{weatherError}</Text> : null}
          {currentWeather ? (
            <View style={styles.currentRow}>
              <Image
                source={{ uri: weatherIconUrl(currentWeather.iconCode) }}
                style={styles.weatherIcon}
                accessibilityLabel={currentWeather.description}
              />
              <View style={styles.currentTextCol}>
                <Text style={styles.currentTemp}>{Math.round(currentWeather.tempC)}°C</Text>
                <Text style={styles.currentDesc}>{currentWeather.description}</Text>
                <Text style={styles.currentSub}>
                  Feels like {Math.round(currentWeather.feelsLikeC)}°C · Humidity{' '}
                  {currentWeather.humidity}% · Wind {currentWeather.windSpeedMs.toFixed(1)} m/s
                </Text>
                <Text style={styles.currentLoc}>
                  {currentWeather.locationName}, {currentWeather.country}
                </Text>
                <Text style={styles.currentUpdated}>
                  Updated {formatDate(currentWeather.fetchedAt)}
                </Text>
              </View>
            </View>
          ) : null}
          {forecastSlots.length > 0 ? (
            <View style={styles.forecastBlock}>
              <Text style={styles.forecastHeading}>Next ~24 hours (3-hour steps)</Text>
              {forecastSlots.map((slot) => (
                <View style={styles.forecastRow} key={slot.id}>
                  <Image
                    source={{ uri: weatherIconUrl(slot.iconCode) }}
                    style={styles.forecastIcon}
                    accessibilityLabel={slot.description}
                  />
                  <View style={styles.forecastMid}>
                    <Text style={styles.forecastTime}>{slot.timeLabel}</Text>
                    <Text style={styles.forecastDesc}>{slot.description}</Text>
                  </View>
                  <Text style={styles.forecastTemp}>{Math.round(slot.tempC)}°</Text>
                  {slot.popPercent > 0 ? (
                    <Text style={styles.forecastPop}>{slot.popPercent}% rain</Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : isWeatherApiConfigured && !weatherLoading && !weatherError ? (
            <Text style={styles.item}>No forecast slots returned.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: apple.groupedBackground,
  },
  container: {
    flexGrow: 1,
    backgroundColor: apple.groupedBackground,
    paddingHorizontal: apple.insetGroupedMargin,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  title: {
    ...font,
    color: colors.text,
    fontWeight: '700',
    fontSize: 24,
    marginBottom: 4,
  },
  alertCard: {
    backgroundColor: colors.card,
    borderRadius: apple.cardRadius,
    padding: 16,
    ...apple.cardShadow,
  },
  alertLabel: {
    ...font,
    color: colors.mutedHint,
    fontWeight: '500',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  alertValue: {
    ...font,
    color: colors.text,
    fontWeight: '700',
    fontSize: 17,
    marginBottom: 8,
  },
  alertSub: {
    ...font,
    color: colors.secondaryText,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  sectionHeading: {
    ...font,
    color: colors.text,
    fontWeight: '600',
    fontSize: 17,
    marginTop: 4,
    marginBottom: 4,
  },
  sectionSpinner: {
    marginVertical: 8,
  },
  emptyAdvisory: {
    ...font,
    color: colors.secondaryText,
    fontSize: 14,
    marginBottom: 8,
  },
  advisoryCardOuter: {
    backgroundColor: colors.card,
    borderRadius: apple.cardRadius,
    padding: 14,
    marginBottom: 10,
    gap: 8,
    ...apple.cardShadow,
  },
  advisoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  advisoryTitle: {
    ...font,
    flex: 1,
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  advisoryMessage: {
    ...font,
    color: colors.secondaryText,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  advisoryMeta: {
    ...font,
    color: colors.mutedHint,
    fontSize: 12,
    fontWeight: '400',
  },
  severityBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  severityLow: {
    backgroundColor: '#d1f0e3',
  },
  severityMedium: {
    backgroundColor: '#fff0cc',
  },
  severityHigh: {
    backgroundColor: '#ffe5e5',
  },
  severityText: {
    ...font,
    fontSize: 10,
    fontWeight: '700',
  },
  severityTextLow: {
    color: colors.primary,
  },
  severityTextMedium: {
    color: '#996600',
  },
  severityTextHigh: {
    color: '#b42318',
  },
  panel: {
    backgroundColor: colors.card,
    borderRadius: apple.cardRadius,
    padding: 16,
    gap: 10,
    ...apple.cardShadow,
  },
  panelTitle: {
    ...font,
    color: colors.text,
    fontWeight: '600',
    fontSize: 17,
  },
  item: {
    ...font,
    color: colors.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  weatherMeta: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 18,
  },
  weatherSpinner: {
    marginVertical: 12,
  },
  weatherErr: {
    color: '#b42318',
    fontSize: 13,
    marginBottom: 8,
  },
  currentRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  weatherIcon: {
    width: 88,
    height: 88,
  },
  currentTextCol: {
    flex: 1,
    gap: 4,
  },
  currentTemp: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.text,
  },
  currentDesc: {
    fontSize: 16,
    fontWeight: '600',
    color: '#30403B',
    textTransform: 'capitalize',
  },
  currentSub: {
    fontSize: 13,
    color: colors.muted,
  },
  currentLoc: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  currentUpdated: {
    fontSize: 12,
    color: colors.muted,
  },
  forecastBlock: {
    marginTop: 14,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#D3E9DA',
    paddingTop: 12,
  },
  forecastHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eef5f0',
  },
  forecastIcon: {
    width: 40,
    height: 40,
  },
  forecastMid: {
    flex: 1,
  },
  forecastTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#30403B',
  },
  forecastDesc: {
    fontSize: 12,
    color: colors.muted,
    textTransform: 'capitalize',
  },
  forecastTemp: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
  forecastPop: {
    fontSize: 11,
    color: '#1565c0',
    minWidth: 56,
    textAlign: 'right',
  },
});
