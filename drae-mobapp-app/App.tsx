import { NavigationContainer } from '@react-navigation/native';
import { NativeStackScreenProps, createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CdrrmoStartupLoader, {
  STARTUP_LOADER_MS,
} from './src/components/CdrrmoStartupLoader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppDataProvider, useAppData } from './src/context/AppDataContext';
import {
  initializeAdvisoryNotifications,
  notifyNewAdvisory,
} from './src/services/advisoryNotifications';
import { processIncidentReportQueue } from './src/services/incidentReportQueue';
import EvacuationCentersScreen from './src/screens/EvacuationCentersScreen';
import IncidentReportScreen from './src/screens/IncidentReportScreen';
import MyReportsScreen from './src/screens/MyReportsScreen';
import StaffAssignmentsScreen from './src/screens/StaffAssignmentsScreen';
import ReadinessChecklistScreen from './src/screens/ReadinessChecklistScreen';
import {
  fetchActiveAdvisories,
  getAuthSession,
  subscribeToActiveAdvisories,
} from './src/services/supabaseService';
import EmergencyScreen from './src/screens/tabs/EmergencyScreen';
import InfographicScreen from './src/screens/tabs/InfographicScreen';
import ProfileScreen from './src/screens/tabs/ProfileScreen';
import WeatherScreen from './src/screens/tabs/WeatherScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ChangePasswordScreen from './src/screens/ChangePasswordScreen';
import PersonalInformationScreen from './src/screens/PersonalInformationScreen';
import StartScreen from './src/screens/StartScreen';
import { apple } from './src/theme/apple';
import { colors } from './src/theme/colors';

export type RootStackParamList = {
  SessionGate: undefined;
  Start: undefined;
  Login: undefined;
  SignUp: undefined;
  ChangePassword: undefined;
  PersonalInformation: undefined;
  MainTabs: undefined;
  IncidentReport: { prefillHazard?: string } | undefined;
  MyReports: undefined;
  StaffAssignments: undefined;
  EvacuationCenters: undefined;
  ReadinessChecklist: undefined;
};

export type MainTabParamList = {
  Weather: undefined;
  Guides: undefined;
  Emergency: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const styles = StyleSheet.create({
  tabBar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -0.5 },
    shadowOpacity: 0.08,
    shadowRadius: 0,
  },
});

function AdvisoryNotificationBridge() {
  const knownAdvisoryIds = useRef<Set<string>>(new Set());
  const isBootstrapped = useRef(false);
  const notificationsEnabled = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      notificationsEnabled.current = await initializeAdvisoryNotifications();
      const advisories = await fetchActiveAdvisories();
      if (!isMounted) {
        return;
      }
      knownAdvisoryIds.current = new Set(advisories.map((item) => item.id));
      isBootstrapped.current = true;
    };

    bootstrap();

    const unsubscribe = subscribeToActiveAdvisories(async (advisories) => {
      if (!isMounted || !isBootstrapped.current) {
        return;
      }
      const currentIds = new Set(advisories.map((item) => item.id));
      if (!notificationsEnabled.current) {
        knownAdvisoryIds.current = currentIds;
        return;
      }
      for (const advisory of advisories) {
        if (!knownAdvisoryIds.current.has(advisory.id)) {
          await notifyNewAdvisory(advisory);
        }
      }
      knownAdvisoryIds.current = currentIds;
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return null;
}

function OfflineQueueSyncBridge() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void processIncidentReportQueue();
      }
    });
    void processIncidentReportQueue();
    return () => sub.remove();
  }, []);
  return null;
}

const tabIconName = (name: keyof MainTabParamList) => {
  switch (name) {
    case 'Weather':
      return 'cloud-outline' as const;
    case 'Guides':
      return 'book-outline' as const;
    case 'Emergency':
      return 'warning-outline' as const;
    case 'Profile':
    default:
      return 'person-outline' as const;
  }
};

function SessionGateScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'SessionGate'>) {
  const { isLoaded, profileRecordId, mustChangePassword, mustCompleteProfile } = useAppData();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    let cancelled = false;

    const route = async () => {
      const session = await getAuthSession();
      if (cancelled) {
        return;
      }
      if (session) {
        if (profileRecordId && mustChangePassword) {
          navigation.replace('ChangePassword');
        } else if (profileRecordId && mustCompleteProfile) {
          navigation.replace('PersonalInformation');
        } else if (profileRecordId) {
          navigation.replace('MainTabs');
        } else {
          navigation.replace('PersonalInformation');
        }
        return;
      }
      navigation.replace('Start');
    };

    void route();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, profileRecordId, mustChangePassword, mustCompleteProfile, navigation]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

function MainTabs() {
  const { staffMemberId, staffOpenAssignmentCount } = useAppData();
  const profileTabBadge =
    staffMemberId && staffOpenAssignmentCount > 0
      ? Math.min(staffOpenAssignmentCount, 99)
      : undefined;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: apple.tabInactive,
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '500',
          letterSpacing: 0.1,
        },
        tabBarStyle: {
          ...styles.tabBar,
          height: Platform.OS === 'ios' ? 88 : 72,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          backgroundColor: apple.tabBarBg,
          borderTopWidth: 0.5,
          borderTopColor: apple.tabBarBorder,
          elevation: 0,
        },
        tabBarIcon: ({ color }) => (
          <Ionicons
            name={tabIconName(route.name as keyof MainTabParamList)}
            size={18}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Weather" component={WeatherScreen} options={{ title: 'Weather' }} />
      <Tab.Screen name="Guides" component={InfographicScreen} options={{ title: 'Guides' }} />
      <Tab.Screen name="Emergency" component={EmergencyScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarBadge: profileTabBadge,
          tabBarBadgeStyle: profileTabBadge
            ? { backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: 10 }
            : undefined,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [startupReady, setStartupReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStartupReady(true), STARTUP_LOADER_MS);
    return () => clearTimeout(t);
  }, []);

  if (!startupReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <CdrrmoStartupLoader />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AppDataProvider>
          <AdvisoryNotificationBridge />
          <OfflineQueueSyncBridge />
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName="SessionGate"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="SessionGate" component={SessionGateScreen} />
            <Stack.Screen name="Start" component={StartScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen
              name="PersonalInformation"
              component={PersonalInformationScreen}
            />
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="IncidentReport" component={IncidentReportScreen} />
            <Stack.Screen name="MyReports" component={MyReportsScreen} />
            <Stack.Screen name="StaffAssignments" component={StaffAssignmentsScreen} />
            <Stack.Screen
              name="EvacuationCenters"
              component={EvacuationCentersScreen}
            />
            <Stack.Screen
              name="ReadinessChecklist"
              component={ReadinessChecklistScreen}
            />
          </Stack.Navigator>
        </AppDataProvider>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
