import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { notifyNewStaffAssignment } from '../services/advisoryNotifications';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  countStaffOpenAssignments,
  fetchLatestProfile,
  fetchLatestReadiness,
  fetchProfileByAuthUserId,
  fetchStaffAssignments,
  fetchStaffMemberIdByProfileId,
  fetchStaffOpenAssignmentIds,
  finalizePasswordChange,
  getAuthSession,
  saveReadinessRemote,
  signOutAuth,
  subscribeToStaffAssignments,
  tryLinkAuthUserToUnlinkedProfileByEmail,
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
  refreshFromRemote: () => Promise<{
    hasProfile: boolean;
    mustChangePassword: boolean;
    mustCompleteProfile: boolean;
  }>;
  /** True when admin created the login and the user must set a new password before using the app. */
  mustChangePassword: boolean;
  /** True until the user saves Personal Information (admin stub profile). */
  mustCompleteProfile: boolean;
  /** After successful password update + server flag clear. */
  completePasswordChange: (newPassword: string) => Promise<void>;
  /** Clear local caches and sign out of Supabase Auth. */
  signOut: () => Promise<void>;
  isLoaded: boolean;
  /** When this profile is linked to staff_members.profile_id, the staff row id. */
  staffMemberId: string | null;
  /** Open (submitted / in progress) reports assigned to this staff member. */
  staffOpenAssignmentCount: number;
  /** Re-count assignments (e.g. after pull-to-refresh); does not fire notifications. */
  refreshStaffAssignmentStats: () => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function isOpenAssignmentStatus(status: string) {
  const s = status.toLowerCase();
  return s === 'submitted' || s === 'in_progress';
}

export function AppDataProvider({ children }: PropsWithChildren) {
  const [profile, setProfileState] = useState<PersonalInfo>(emptyPersonalInfo);
  const [profileRecordId, setProfileRecordIdState] = useState<string | null>(null);
  const [readiness, setReadinessState] = useState<ReadinessState>(emptyReadinessState);
  const [readinessRecordId, setReadinessRecordIdState] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [staffMemberId, setStaffMemberId] = useState<string | null>(null);
  const [staffOpenAssignmentCount, setStaffOpenAssignmentCount] = useState(0);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [mustCompleteProfile, setMustCompleteProfile] = useState(false);
  const staffAssignmentBootstrapDone = useRef(false);
  const knownStaffOpenIdsRef = useRef<Set<string>>(new Set());

  const clearLocalUserData = useCallback(async () => {
    await AsyncStorage.multiRemove([
      PROFILE_KEY,
      PROFILE_RECORD_ID_KEY,
      READINESS_KEY,
      READINESS_RECORD_ID_KEY,
    ]);
    setProfileState(emptyPersonalInfo);
    setProfileRecordIdState(null);
    setReadinessState(emptyReadinessState);
    setReadinessRecordIdState(null);
    setStaffMemberId(null);
    setStaffOpenAssignmentCount(0);
    setMustChangePassword(false);
    setMustCompleteProfile(false);
    knownStaffOpenIdsRef.current = new Set();
    staffAssignmentBootstrapDone.current = false;
  }, []);

  const signOut = useCallback(async () => {
    await clearLocalUserData();
    await signOutAuth();
  }, [clearLocalUserData]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        void clearLocalUserData();
      }
    });
    return () => subscription.unsubscribe();
  }, [clearLocalUserData]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const readinessRaw = await AsyncStorage.getItem(READINESS_KEY);
        const storedReadinessId = await AsyncStorage.getItem(READINESS_RECORD_ID_KEY);
        const storedProfileId = await AsyncStorage.getItem(PROFILE_RECORD_ID_KEY);
        const raw = await AsyncStorage.getItem(PROFILE_KEY);

        const session = isSupabaseConfigured ? await getAuthSession() : null;
        let effectiveProfileId: string | null = null;

        if (session?.user?.id) {
          let remote = await fetchProfileByAuthUserId(session.user.id);
          if (!remote) {
            await tryLinkAuthUserToUnlinkedProfileByEmail();
            remote = await fetchProfileByAuthUserId(session.user.id);
          }
          if (remote) {
            const normalizedProfile = normalizeProfile(remote.profile);
            setProfileState(normalizedProfile);
            await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(normalizedProfile));
            await AsyncStorage.setItem(PROFILE_RECORD_ID_KEY, remote.id);
            setProfileRecordIdState(remote.id);
            setMustChangePassword(remote.mustChangePassword);
            setMustCompleteProfile(remote.mustCompleteProfile);
            effectiveProfileId = remote.id;
          } else {
            await AsyncStorage.removeItem(PROFILE_RECORD_ID_KEY);
            setProfileRecordIdState(null);
            setMustChangePassword(false);
            setMustCompleteProfile(false);
            if (raw) {
              setProfileState(normalizeProfile(JSON.parse(raw) as PersonalInfo));
            } else {
              setProfileState(emptyPersonalInfo);
            }
          }
        } else {
          setMustChangePassword(false);
          setMustCompleteProfile(false);
          if (raw) {
            setProfileState(normalizeProfile(JSON.parse(raw) as PersonalInfo));
          }
          if (storedProfileId) {
            setProfileRecordIdState(storedProfileId);
            effectiveProfileId = storedProfileId;
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
        if (storedReadinessId) {
          setReadinessRecordIdState(storedReadinessId);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadStaff = async () => {
      if (!profileRecordId) {
        setStaffMemberId(null);
        setStaffOpenAssignmentCount(0);
        knownStaffOpenIdsRef.current = new Set();
        staffAssignmentBootstrapDone.current = false;
        return;
      }
      const id = await fetchStaffMemberIdByProfileId(profileRecordId);
      if (!cancelled) {
        setStaffMemberId(id);
        if (!id) {
          setStaffOpenAssignmentCount(0);
          knownStaffOpenIdsRef.current = new Set();
          staffAssignmentBootstrapDone.current = false;
        }
      }
    };
    loadStaff();
    return () => {
      cancelled = true;
    };
  }, [profileRecordId]);

  const syncStaffAssignments = useCallback(
    async (fromRealtime: boolean) => {
      if (!staffMemberId) {
        setStaffOpenAssignmentCount(0);
        knownStaffOpenIdsRef.current = new Set();
        return;
      }

      const [openIds, count, rows] = await Promise.all([
        fetchStaffOpenAssignmentIds(staffMemberId),
        countStaffOpenAssignments(staffMemberId),
        fromRealtime ? fetchStaffAssignments(staffMemberId) : Promise.resolve([]),
      ]);

      const next = new Set(openIds);
      setStaffOpenAssignmentCount(count);

      if (fromRealtime && staffAssignmentBootstrapDone.current) {
        for (const id of next) {
          if (!knownStaffOpenIdsRef.current.has(id)) {
            const row = rows.find((r) => r.id === id);
            if (row && isOpenAssignmentStatus(row.status)) {
              await notifyNewStaffAssignment({
                hazardType: row.hazardType,
                locationText: row.locationText,
                reporterName: row.reporterName || undefined,
              });
            }
          }
        }
      }

      knownStaffOpenIdsRef.current = next;
    },
    [staffMemberId],
  );

  useEffect(() => {
    if (!staffMemberId) {
      staffAssignmentBootstrapDone.current = false;
      knownStaffOpenIdsRef.current = new Set();
      setStaffOpenAssignmentCount(0);
      return;
    }

    staffAssignmentBootstrapDone.current = false;
    let cancelled = false;

    const bootstrap = async () => {
      knownStaffOpenIdsRef.current = new Set();
      await syncStaffAssignments(false);
      if (!cancelled) {
        staffAssignmentBootstrapDone.current = true;
      }
    };

    void bootstrap();

    const unsubscribe = subscribeToStaffAssignments(staffMemberId, () => {
      void syncStaffAssignments(true);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [staffMemberId, syncStaffAssignments]);

  const refreshStaffAssignmentStats = useCallback(async () => {
    if (!staffMemberId) {
      setStaffOpenAssignmentCount(0);
      return;
    }
    const count = await countStaffOpenAssignments(staffMemberId);
    const openIds = await fetchStaffOpenAssignmentIds(staffMemberId);
    setStaffOpenAssignmentCount(count);
    knownStaffOpenIdsRef.current = new Set(openIds);
  }, [staffMemberId]);

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
      let remoteProfile = await fetchLatestProfile();
      if (!remoteProfile) {
        await tryLinkAuthUserToUnlinkedProfileByEmail();
        remoteProfile = await fetchLatestProfile();
      }
      if (remoteProfile) {
        const normalized = normalizeProfile(remoteProfile.profile);
        setProfileState(normalized);
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
        await AsyncStorage.setItem(PROFILE_RECORD_ID_KEY, remoteProfile.id);
        setProfileRecordIdState(remoteProfile.id);
        setMustChangePassword(remoteProfile.mustChangePassword);
        setMustCompleteProfile(remoteProfile.mustCompleteProfile);

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

        const sid = await fetchStaffMemberIdByProfileId(remoteProfile.id);
        setStaffMemberId(sid);
        if (sid) {
          const n = await countStaffOpenAssignments(sid);
          const oids = await fetchStaffOpenAssignmentIds(sid);
          setStaffOpenAssignmentCount(n);
          knownStaffOpenIdsRef.current = new Set(oids);
        } else {
          setStaffOpenAssignmentCount(0);
          knownStaffOpenIdsRef.current = new Set();
        }
        return {
          hasProfile: true,
          mustChangePassword: remoteProfile.mustChangePassword,
          mustCompleteProfile: remoteProfile.mustCompleteProfile,
        };
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

        const sid = await fetchStaffMemberIdByProfileId(storedId);
        setStaffMemberId(sid);
        if (sid) {
          const n = await countStaffOpenAssignments(sid);
          const oids = await fetchStaffOpenAssignmentIds(sid);
          setStaffOpenAssignmentCount(n);
          knownStaffOpenIdsRef.current = new Set(oids);
        }
      }
      return { hasProfile: false, mustChangePassword: false, mustCompleteProfile: false };
    } catch {
      // Offline or misconfiguration: keep cached data.
      return { hasProfile: false, mustChangePassword: false, mustCompleteProfile: false };
    }
  }, []);

  const completePasswordChange = useCallback(
    async (newPassword: string) => {
      const id = profileRecordId;
      if (!id) {
        throw new Error('No profile loaded.');
      }
      await finalizePasswordChange(id, newPassword);
      setMustChangePassword(false);
    },
    [profileRecordId],
  );

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
      mustChangePassword,
      mustCompleteProfile,
      completePasswordChange,
      signOut,
      isLoaded,
      staffMemberId,
      staffOpenAssignmentCount,
      refreshStaffAssignmentStats,
    }),
    [
      profile,
      profileRecordId,
      readiness,
      readinessRecordId,
      refreshFromRemote,
      mustChangePassword,
      mustCompleteProfile,
      completePasswordChange,
      signOut,
      isLoaded,
      staffMemberId,
      staffOpenAssignmentCount,
      refreshStaffAssignmentStats,
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
