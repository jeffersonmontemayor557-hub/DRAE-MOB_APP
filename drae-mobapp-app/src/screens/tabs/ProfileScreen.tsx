import * as ImagePicker from 'expo-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../../App';
import { AppleRefreshControl } from '../../components/AppleRefreshControl';
import { useAppData } from '../../context/AppDataContext';
import { saveProfileRemote } from '../../services/supabaseService';
import { alertPermissionBlocked, confirmPermissionStep } from '../../utils/permissionDialogs';
import { apple } from '../../theme/apple';
import { colors } from '../../theme/colors';

const font = { fontFamily: apple.fontFamily };

export default function ProfileScreen() {
  const {
    profile,
    readiness,
    setProfile,
    profileRecordId,
    setProfileRecordId,
    refreshFromRemote,
  } = useAppData();
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const safe = (value: string) => value || '—';
  const initials =
    profile.fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'DR';

  const syncAvatar = async (avatarUrl: string) => {
    const nextProfile = { ...profile, avatarUrl };
    await setProfile(nextProfile);
    try {
      const remoteProfile = await saveProfileRemote(nextProfile, profileRecordId);
      await setProfileRecordId(remoteProfile.id);
      if (remoteProfile.avatarUrl !== avatarUrl) {
        await setProfile({ ...nextProfile, avatarUrl: remoteProfile.avatarUrl });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      Alert.alert(
        'Saved Locally',
        `Profile picture was updated on this device, but cloud sync failed.\n\n${message}`,
      );
    }
  };

  const pickAvatar = async () => {
    const ok = await confirmPermissionStep(
      'Photo library',
      'DRAE needs access to your photos so you can choose a profile picture. The image is saved when you sync your profile. You can change photo access anytime in Settings.',
    );
    if (!ok) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alertPermissionBlocked(
        'Photo access denied',
        'Allow Photos for DRAE in Settings to set your profile picture.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      await syncAvatar(result.assets[0].uri);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshFromRemote();
    } finally {
      setRefreshing(false);
    }
  }, [refreshFromRemote]);

  const emergencyLine = `${safe(profile.contactPerson)} · ${safe(profile.contactPersonNumber)}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <AppleRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.hero}>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={pickAvatar}
            accessibilityLabel="Profile photo"
            accessibilityHint="Opens your photo library to choose a picture"
          >
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.heroName}>{safe(profile.fullName)}</Text>
          <Text style={styles.heroLocation}>{safe(profile.address)}</Text>
          <TouchableOpacity
            style={styles.scorePill}
            onPress={() => navigation.navigate('ReadinessChecklist')}
            activeOpacity={0.85}
          >
            <Text style={styles.scorePillText}>{readiness.score}% Household Ready</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Contact number</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {safe(profile.contactNumber)}
            </Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Emergency Contact</Text>
            <Text style={styles.infoValue} numberOfLines={3}>
              {emergencyLine}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => navigation.navigate('PersonalInformation')}
          activeOpacity={0.9}
        >
          <Text style={styles.btnPrimaryText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnOutlineGreen}
          onPress={() => navigation.navigate('ReadinessChecklist')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnOutlineGreenText}>Readiness Checklist</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnOutlineGray}
          onPress={() => navigation.navigate('MyReports')}
          activeOpacity={0.85}
        >
          <Text style={styles.btnOutlineGrayText}>My Reports</Text>
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
    paddingHorizontal: apple.insetGroupedMargin,
    paddingTop: 8,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: colors.card,
    marginHorizontal: -apple.insetGroupedMargin,
    paddingHorizontal: apple.insetGroupedMargin,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: apple.cardRadius,
    borderBottomRightRadius: apple.cardRadius,
    alignItems: 'center',
    marginBottom: 16,
    ...apple.cardShadow,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: apple.tertiaryFill,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    ...font,
    color: colors.secondaryText,
    fontSize: 22,
    fontWeight: '700',
  },
  heroName: {
    ...font,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  heroLocation: {
    ...font,
    color: colors.secondaryText,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
  scorePill: {
    backgroundColor: '#d1f0e3',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  scorePillText: {
    ...font,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: apple.cardRadius,
    overflow: 'hidden',
    marginBottom: 20,
    ...apple.cardShadow,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  infoDivider: {
    height: 0.5,
    backgroundColor: apple.divider,
    marginLeft: 16,
  },
  infoLabel: {
    ...font,
    flexShrink: 0,
    width: '42%',
    color: colors.secondaryText,
    fontSize: 15,
    fontWeight: '400',
  },
  infoValue: {
    ...font,
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'right',
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    borderRadius: apple.cardRadius,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimaryText: {
    ...font,
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  btnOutlineGreen: {
    backgroundColor: colors.card,
    borderRadius: apple.cardRadius,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    ...apple.cardShadow,
  },
  btnOutlineGreenText: {
    ...font,
    color: colors.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  btnOutlineGray: {
    backgroundColor: colors.card,
    borderRadius: apple.cardRadius,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c7c7cc',
    ...apple.cardShadow,
  },
  btnOutlineGrayText: {
    ...font,
    color: '#3a3a3c',
    fontSize: 17,
    fontWeight: '600',
  },
});
