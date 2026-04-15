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
import { DasmarinasBarangayPickerField } from '../components/DasmarinasBarangayPickerField';
import { PhilippineMobileField } from '../components/PhilippineMobileField';
import { normalizeSexForForm, SexSelectField } from '../components/SexSelectField';
import {
  DASMA_APP_CITY,
  DASMA_APP_PROVINCE,
  DASMA_APP_REGION,
  DASMA_APP_ZIP,
} from '../constants/dasmarinasLocale';
import { useAppData } from '../context/AppDataContext';
import { getAuthUserEmail, saveProfileRemote } from '../services/supabaseService';
import { persistPickedMediaUri } from '../utils/persistMediaUri';
import { alertPermissionBlocked, confirmPermissionStep } from '../utils/permissionDialogs';
import { colors } from '../theme/colors';
import { emptyPersonalInfo, PersonalInfo } from '../types/profile';
import {
  composeDasmarinasProfileAddress,
  parseDasmarinasProfileAddress,
} from '../utils/profileDasmarinasAddress';
import {
  nationalTenToProfileContact,
  toPhilippineNationalTenDigits,
} from '../utils/phoneFormat';

type Props = NativeStackScreenProps<RootStackParamList, 'PersonalInformation'>;

export default function PersonalInformationScreen({ navigation }: Props) {
  const {
    profile,
    setProfile,
    profileRecordId,
    setProfileRecordId,
    isLoaded,
    refreshFromRemote,
    mustCompleteProfile,
  } = useAppData();
  const [form, setForm] = useState<PersonalInfo>(emptyPersonalInfo);
  const [isSaving, setIsSaving] = useState(false);
  const [addrBarangay, setAddrBarangay] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrLandmark, setAddrLandmark] = useState('');

  const updateForm = (key: keyof PersonalInfo, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void (async () => {
      const authEmail = (await getAuthUserEmail()) ?? '';
      const parsedAddr = parseDasmarinasProfileAddress(profile.address);
      const next: PersonalInfo = {
        ...emptyPersonalInfo,
        ...profile,
        avatarUrl: profile.avatarUrl ?? '',
        email: profile.email || authEmail,
        contactNumber: toPhilippineNationalTenDigits(profile.contactNumber) ?? '',
        contactPersonNumber:
          toPhilippineNationalTenDigits(profile.contactPersonNumber) ?? '',
        gender: normalizeSexForForm(profile.gender),
      };
      setForm(next);
      setAddrBarangay(parsedAddr.barangay);
      setAddrStreet(parsedAddr.street);
      setAddrLandmark(parsedAddr.landmark);
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
      try {
        const stableUri = await persistPickedMediaUri(result.assets[0].uri, 'avatar');
        updateForm('avatarUrl', stableUri);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not save the photo file.';
        Alert.alert('Photo Error', message);
      }
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

        <Text style={styles.title}>Information</Text>
        {mustCompleteProfile ? (
          <Text style={styles.completeProfileHint}>
            Please complete your profile to use the app. Fields below are required unless marked
            optional.
          </Text>
        ) : null}

        <Text style={styles.fieldLabel}>Full name / Buong Pangalan</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          value={form.fullName}
          onChangeText={(text) => updateForm('fullName', text)}
        />
        <Text style={styles.sectionLabel}>Address / Tirahan</Text>
        <Text style={styles.sectionHint}>
          This app is for residents of Dasmariñas City, Cavite. Region, province, city, and ZIP are
          set for you.
        </Text>

        <Text style={styles.fieldLabel}>
          Region <Text style={styles.requiredStar}>*</Text>
        </Text>
        <View style={[styles.input, styles.inputReadonly]}>
          <Text style={styles.readonlyText}>{DASMA_APP_REGION}</Text>
        </View>

        <Text style={styles.fieldLabel}>
          Province <Text style={styles.requiredStar}>*</Text>
        </Text>
        <View style={[styles.input, styles.inputReadonly]}>
          <Text style={styles.readonlyText}>{DASMA_APP_PROVINCE}</Text>
        </View>

        <Text style={styles.fieldLabel}>
          City / Municipality <Text style={styles.requiredStar}>*</Text>
        </Text>
        <View style={[styles.input, styles.inputReadonly]}>
          <Text style={styles.readonlyText}>{DASMA_APP_CITY}</Text>
        </View>

        <Text style={styles.fieldLabel}>
          Barangay <Text style={styles.requiredStar}>*</Text>
        </Text>
        <DasmarinasBarangayPickerField value={addrBarangay} onChange={setAddrBarangay} />

        <Text style={styles.fieldLabel}>
          Street / Building / House no. <Text style={styles.requiredStar}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 12 Rizal St., Brgy. Centro"
          placeholderTextColor={colors.mutedHint}
          value={addrStreet}
          onChangeText={setAddrStreet}
        />

        <View style={styles.row}>
          <View style={styles.halfWrap}>
            <Text style={styles.fieldLabel}>
              ZIP code <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View style={[styles.input, styles.half, styles.inputReadonly]}>
              <Text style={styles.readonlyText}>{DASMA_APP_ZIP}</Text>
            </View>
          </View>
          <View style={styles.halfWrap}>
            <Text style={styles.fieldLabel}>Landmark (optional)</Text>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Near / beside…"
              placeholderTextColor={colors.mutedHint}
              value={addrLandmark}
              onChangeText={setAddrLandmark}
            />
          </View>
        </View>
        <PhilippineMobileField
          label="Mobile number / Numero ng Telepono"
          required
          valueNationalTen={form.contactNumber}
          onChangeNationalTen={(v) => updateForm('contactNumber', v)}
        />

        <View style={styles.row}>
          <View style={styles.halfWrap}>
            <Text style={styles.fieldLabel}>Sex / Kasarian</Text>
            <SexSelectField
              value={form.gender}
              onChange={(v) => updateForm('gender', v)}
              style={styles.half}
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
        <PhilippineMobileField
          label="Emergency contact mobile / Numero ng Maaaring Kontakin"
          valueNationalTen={form.contactPersonNumber}
          onChangeNationalTen={(v) => updateForm('contactPersonNumber', v)}
          helperText="Optional. If provided: 10 digits starting with 9 (same format as above)."
        />

        <TouchableOpacity
          style={[styles.button, isSaving && styles.buttonDisabled]}
          disabled={isSaving}
          onPress={async () => {
            if (!form.fullName.trim()) {
              Alert.alert('Profile', 'Please enter your full name.');
              return;
            }
            if (!addrBarangay.trim()) {
              Alert.alert('Address', 'Please select your barangay.');
              return;
            }
            if (!addrStreet.trim()) {
              Alert.alert('Address', 'Please enter street, building, or house number.');
              return;
            }

            const composedAddress = composeDasmarinasProfileAddress({
              street: addrStreet,
              barangay: addrBarangay,
              landmark: addrLandmark,
            });

            const cTen = form.contactNumber.trim();
            if (cTen.length !== 10 || !cTen.startsWith('9')) {
              Alert.alert(
                'Mobile number',
                'Enter a valid 10-digit Philippine mobile number starting with 9.',
              );
              return;
            }
            const pTen = form.contactPersonNumber.trim();
            if (
              pTen.length > 0 &&
              (pTen.length !== 10 || !pTen.startsWith('9'))
            ) {
              Alert.alert(
                'Emergency contact number',
                'Use a valid 10-digit mobile starting with 9, or leave it blank.',
              );
              return;
            }

            const payload: PersonalInfo = {
              ...form,
              address: composedAddress,
              contactNumber: nationalTenToProfileContact(cTen),
              contactPersonNumber:
                pTen.length === 10 ? nationalTenToProfileContact(pTen) : '',
            };

            setIsSaving(true);
            await setProfile(payload);
            try {
              const remoteProfile = await saveProfileRemote(payload, profileRecordId);
              await setProfileRecordId(remoteProfile.id);
              if (remoteProfile.avatarUrl !== payload.avatarUrl) {
                await setProfile({ ...payload, avatarUrl: remoteProfile.avatarUrl });
              }
              await refreshFromRemote();
              navigation.replace('MainTabs');
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Unknown sync error';
              Alert.alert(
                'Could not save profile',
                `${message}\n\nYour answers are still on this screen — fix the issue (e.g. photo file or network) and tap Save again.`,
              );
            } finally {
              setIsSaving(false);
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
  completeProfileHint: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
    marginHorizontal: 8,
    lineHeight: 18,
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
  sectionLabel: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 2,
    marginLeft: 4,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
    lineHeight: 17,
  },
  fieldLabel: {
    color: '#1F1F1F',
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  requiredStar: {
    color: '#C62828',
    fontWeight: '700',
  },
  inputReadonly: {
    backgroundColor: '#EEF1F4',
    borderColor: colors.divider,
  },
  readonlyText: {
    fontSize: 16,
    color: colors.secondaryText,
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
