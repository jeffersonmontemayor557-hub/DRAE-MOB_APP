import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';
import { useAppData } from '../context/AppDataContext';
import { getAuthUserEmail, saveProfileRemote } from '../services/supabaseService';
import { alertPermissionBlocked, confirmPermissionStep } from '../utils/permissionDialogs';
import { colors } from '../theme/colors';
import { emptyPersonalInfo, PersonalInfo } from '../types/profile';

type Props = NativeStackScreenProps<RootStackParamList, 'PersonalInformation'>;

export default function PersonalInformationScreen({ navigation }: Props) {
  const { profile, setProfile, profileRecordId, setProfileRecordId, isLoaded } =
    useAppData();
  const [form, setForm] = useState<PersonalInfo>(emptyPersonalInfo);
  const [isSaving, setIsSaving] = useState(false);

  const updateForm = (key: keyof PersonalInfo, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void (async () => {
      const authEmail = (await getAuthUserEmail()) ?? '';
      const next: PersonalInfo = {
        ...emptyPersonalInfo,
        ...profile,
        avatarUrl: profile.avatarUrl ?? '',
        email: profile.email || authEmail,
      };
      setForm(next);
    })();
  }, [isLoaded, profile]);

  const handlePickAvatar = async () => {
    const ok = await confirmPermissionStep(
      'Photo library',
      'DRAE needs access to your photos so you can choose a profile picture. You can change photo access anytime in Settings.',
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
      updateForm('avatarUrl', result.assets[0].uri);
    }
  };

  if (!isLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loaderText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/cdr-logo.png')} style={styles.cdrLogo} />
          <Image source={require('../../assets/city-logo.png')} style={styles.cityLogo} />
        </View>

        <View style={styles.avatarSection}>
          <Text style={styles.avatarLabel}>Profile Picture / Larawan</Text>
          <TouchableOpacity style={styles.avatarButton} onPress={handlePickAvatar}>
            {form.avatarUrl ? (
              <Image source={{ uri: form.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarPlaceholder}>Add Photo</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap the circle to choose or change photo.</Text>
          <View style={styles.avatarActionRow}>
            <TouchableOpacity style={styles.avatarActionButton} onPress={handlePickAvatar}>
              <Text style={styles.avatarActionText}>
                {form.avatarUrl ? 'Change Picture' : 'Choose Picture'}
              </Text>
            </TouchableOpacity>
            {form.avatarUrl ? (
              <TouchableOpacity
                style={[styles.avatarActionButton, styles.avatarRemoveButton]}
                onPress={() => updateForm('avatarUrl', '')}
              >
                <Text style={[styles.avatarActionText, styles.avatarRemoveText]}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <Text style={styles.title}>Personal Information</Text>

        <Text style={styles.fieldLabel}>Full name / Buong Pangalan</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          value={form.fullName}
          onChangeText={(text) => updateForm('fullName', text)}
        />
        <Text style={styles.fieldLabel}>Address / Tirahan</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          value={form.address}
          onChangeText={(text) => updateForm('address', text)}
        />
        <Text style={styles.fieldLabel}>Contact Number / Numero ng Telepono</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. +639171234567 or 09171234567"
          keyboardType="phone-pad"
          value={form.contactNumber}
          onChangeText={(text) => updateForm('contactNumber', text)}
        />

        <View style={styles.row}>
          <View style={styles.halfWrap}>
            <Text style={styles.fieldLabel}>Gender / Kasarian</Text>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder=""
              value={form.gender}
              onChangeText={(text) => updateForm('gender', text)}
            />
          </View>
          <View style={styles.halfWrap}>
            <Text style={styles.fieldLabel}>Age / Edad</Text>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder=""
              keyboardType="number-pad"
              value={form.age}
              onChangeText={(text) => updateForm('age', text)}
            />
          </View>
        </View>

        <Text style={styles.fieldLabel}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          keyboardType="email-address"
          value={form.email}
          onChangeText={(text) => updateForm('email', text)}
        />
        <Text style={styles.fieldLabel}>Contact Person / Taong Maaaring Kontakin</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          value={form.contactPerson}
          onChangeText={(text) => updateForm('contactPerson', text)}
        />
        <Text style={styles.fieldLabel}>
          Number of Contact Person / Numero ng Maaaring Kontakin
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. +639171234567 or 09171234567"
          keyboardType="phone-pad"
          value={form.contactPersonNumber}
          onChangeText={(text) => updateForm('contactPersonNumber', text)}
        />

        <TouchableOpacity
          style={[styles.button, isSaving && styles.buttonDisabled]}
          disabled={isSaving}
          onPress={async () => {
            setIsSaving(true);
            await setProfile(form);
            navigation.replace('MainTabs');
            setIsSaving(false);

            // Do cloud sync in background so UI does not get stuck on slow internet.
            try {
              const remoteProfile = await saveProfileRemote(form, profileRecordId);
              await setProfileRecordId(remoteProfile.id);
              if (remoteProfile.avatarUrl !== form.avatarUrl) {
                await setProfile({ ...form, avatarUrl: remoteProfile.avatarUrl });
              }
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Unknown sync error';
              Alert.alert(
                'Saved Locally',
                `Profile was saved on this device, but cloud sync failed.\n\n${message}`,
              );
            }
          }}
        >
          <Text style={styles.buttonText}>{isSaving ? 'SAVING...' : 'SAVE'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 22,
    gap: 8,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loaderText: {
    color: colors.muted,
  },
  logoRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  cdrLogo: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
  },
  cityLogo: {
    width: 66,
    height: 66,
    resizeMode: 'contain',
  },
  title: {
    color: colors.primaryDark,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginVertical: 8,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 4,
  },
  avatarLabel: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  avatarButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: '#F4FAF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  avatarHint: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 12,
  },
  avatarActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  avatarActionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F0F7F3',
    borderWidth: 1,
    borderColor: '#B9D2C2',
  },
  avatarActionText: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  avatarRemoveButton: {
    backgroundColor: '#FFF5F5',
    borderColor: '#F4B7B7',
  },
  avatarRemoveText: {
    color: '#B42318',
  },
  fieldLabel: {
    color: '#1F1F1F',
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfWrap: {
    flex: 1,
  },
  half: {
    flex: 1,
  },
  button: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 20,
    paddingHorizontal: 34,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#0D2A18',
    elevation: 1,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1,
  },
});
