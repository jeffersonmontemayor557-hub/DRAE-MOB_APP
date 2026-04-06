import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  fetchLatestProfile,
  fetchLatestReadiness,
  saveReadinessRemote,
} from '../services/supabaseService';
import { emptyPersonalInfo, PersonalInfo } from '../types/profile';
import { emptyReadinessState, ReadinessState } from '../types/readiness';

const PROFILE_KEY = 'drae_profile_v1';
const PROFILE_RECORD_ID_KEY = 'drae_profile_record_id_v1';
const READINESS_KEY = 'drae_readiness_v1';
const READINESS_RECORD_ID_KEY = 'drae_readiness_record_id_v1';

function normalizeProfile(profile: PersonalInfo): PersonalInfo {
  return {
    ...emptyPersonalInfo,
    ...profile,
    avatarUrl: profile.avatarUrl ?? '',
  };
}

type AppDataContextValue = {
  profile: PersonalInfo;
  setProfile: (profile: PersonalInfo) => Promise<void>;
  profileRecordId: string | null;
  setProfileRecordId: (id: string | null) => Promise<void>;
  readiness: ReadinessState;
  setReadiness: (readiness: ReadinessState) => Promise<void>;
  readinessRecordId: string | null;
  /** Re-fetch profile + readiness from Supabase and merge into local state. */
  refreshFromRemote: () => Promise<void>;
  isLoaded: boolean;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export function AppDataProvider({ children }: PropsWithChildren) {
  const [profile, setProfileState] = useState<PersonalInfo>(emptyPersonalInfo);
  const [profileRecordId, setProfileRecordIdState] = useState<string | null>(null);
  const [readiness, setReadinessState] = useState<ReadinessState>(emptyReadinessState);
  const [readinessRecordId, setReadinessRecordIdState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILE_KEY);
        const storedProfileId = await AsyncStorage.getItem(PROFILE_RECORD_ID_KEY);
        const readinessRaw = await AsyncStorage.getItem(READINESS_KEY);
        const storedReadinessId = await AsyncStorage.getItem(READINESS_RECORD_ID_KEY);

        let effectiveProfileId: string | null = storedProfileId;

        if (raw) {
          setProfileState(normalizeProfile(JSON.parse(raw) as PersonalInfo));
        } else {
          const remote = await fetchLatestProfile();
          if (remote) {
            const normalizedProfile = normalizeProfile(remote.profile);
            setProfileState(normalizedProfile);
            await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(normalizedProfile));
            await AsyncStorage.setItem(PROFILE_RECORD_ID_KEY, remote.id);
            setProfileRecordIdState(remote.id);
            effectiveProfileId = remote.id;
          }
        }

        if (readinessRaw) {
          setReadinessState(JSON.parse(readinessRaw) as ReadinessState);
        } else {
          const remoteReadiness = await fetchLatestReadiness(effectiveProfileId);
          if (remoteReadiness) {
            setReadinessState(remoteReadiness.readiness);
            await AsyncStorage.setItem(
              READINESS_KEY,
              JSON.stringify(remoteReadiness.readiness),
            );
            await AsyncStorage.setItem(READINESS_RECORD_ID_KEY, remoteReadiness.id);
            setReadinessRecordIdState(remoteReadiness.id);
          }
        }
        if (storedProfileId) {
          setProfileRecordIdState(storedProfileId);
        }
        if (storedReadinessId) {
          setReadinessRecordIdState(storedReadinessId);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  const setProfile = async (nextProfile: PersonalInfo) => {
    const normalizedProfile = normalizeProfile(nextProfile);
    setProfileState(normalizedProfile);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(normalizedProfile));
  };

  const setProfileRecordId = async (id: string | null) => {
    setProfileRecordIdState(id);
    if (id) {
      await AsyncStorage.setItem(PROFILE_RECORD_ID_KEY, id);
      return;
    }
    await AsyncStorage.removeItem(PROFILE_RECORD_ID_KEY);
  };

  const setReadiness = async (nextReadiness: ReadinessState) => {
    setReadinessState(nextReadiness);
    await AsyncStorage.setItem(READINESS_KEY, JSON.stringify(nextReadiness));
    try {
      const remoteId = await saveReadinessRemote(
        nextReadiness,
        readinessRecordId,
        profileRecordId,
      );
      setReadinessRecordIdState(remoteId);
      await AsyncStorage.setItem(READINESS_RECORD_ID_KEY, remoteId);
    } catch {
      // Keep local save even if remote sync fails.
    }
  };

  const refreshFromRemote = useCallback(async () => {
    try {
      const remoteProfile = await fetchLatestProfile();
      if (remoteProfile) {
        const normalized = normalizeProfile(remoteProfile.profile);
        setProfileState(normalized);
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
        await AsyncStorage.setItem(PROFILE_RECORD_ID_KEY, remoteProfile.id);
        setProfileRecordIdState(remoteProfile.id);

        const remoteReadiness = await fetchLatestReadiness(remoteProfile.id);
        if (remoteReadiness) {
          setReadinessState(remoteReadiness.readiness);
          await AsyncStorage.setItem(
            READINESS_KEY,
            JSON.stringify(remoteReadiness.readiness),
          );
          await AsyncStorage.setItem(READINESS_RECORD_ID_KEY, remoteReadiness.id);
          setReadinessRecordIdState(remoteReadiness.id);
        }
        return;
      }

      const storedId = await AsyncStorage.getItem(PROFILE_RECORD_ID_KEY);
      if (storedId) {
        const remoteReadiness = await fetchLatestReadiness(storedId);
        if (remoteReadiness) {
          setReadinessState(remoteReadiness.readiness);
          await AsyncStorage.setItem(
            READINESS_KEY,
            JSON.stringify(remoteReadiness.readiness),
          );
          await AsyncStorage.setItem(READINESS_RECORD_ID_KEY, remoteReadiness.id);
          setReadinessRecordIdState(remoteReadiness.id);
        }
      }
    } catch {
      // Offline or misconfiguration: keep cached data.
    }
  }, []);

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      profileRecordId,
      setProfileRecordId,
      readiness,
      setReadiness,
      readinessRecordId,
      refreshFromRemote,
      isLoaded,
    }),
    [
      profile,
      profileRecordId,
      readiness,
      readinessRecordId,
      refreshFromRemote,
      isLoaded,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }

  return context;
}
