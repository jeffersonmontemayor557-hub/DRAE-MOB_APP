import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';
import { useAppData } from '../context/AppDataContext';
import { formatSignInErrorMessage } from '../services/supabaseService';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

export default function ChangePasswordScreen({ navigation }: Props) {
  const { completePasswordChange, refreshFromRemote } = useAppData();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    const p = password.trim();
    const c = confirm.trim();
    if (p.length < 6) {
      Alert.alert('New password', 'Use at least 6 characters.');
      return;
    }
    if (p !== c) {
      Alert.alert('New password', 'Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await completePasswordChange(p);
      const { mustCompleteProfile } = await refreshFromRemote();
      navigation.replace(mustCompleteProfile ? 'PersonalInformation' : 'MainTabs');
    } catch (err) {
      Alert.alert('Could not update password', formatSignInErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={require('../../assets/cdr-logo.png')} style={styles.logo} />
        <Text style={styles.header}>SET A NEW PASSWORD</Text>
        <Text style={styles.subHeader}>
          Your account was created with a temporary password. Choose a new one to continue.
        </Text>

        <Text style={styles.label}>New password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder=""
            secureTextEntry={!passwordVisible}
            editable={!busy}
            style={styles.passwordInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.passwordReveal}
            onPress={() => setPasswordVisible((v) => !v)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.primaryDark}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder=""
            secureTextEntry={!confirmVisible}
            editable={!busy}
            style={styles.passwordInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.passwordReveal}
            onPress={() => setConfirmVisible((v) => !v)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={confirmVisible ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={confirmVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.primaryDark}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={() => void onSubmit()}
          disabled={busy}
        >
          <Text style={styles.buttonText}>{busy ? 'SAVING…' : 'CONTINUE'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  header: {
    color: colors.primaryDark,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1.4,
  },
  subHeader: {
    color: '#424242',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
    paddingHorizontal: 8,
    maxWidth: 360,
  },
  logo: {
    width: 96,
    height: 96,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  label: {
    width: '100%',
    maxWidth: 360,
    textAlign: 'center',
    color: '#212121',
    fontSize: 15,
    marginBottom: 4,
    letterSpacing: 1,
  },
  passwordRow: {
    width: '100%',
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingLeft: 14,
    paddingRight: 4,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
    fontSize: 16,
    color: '#212121',
  },
  passwordReveal: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    marginTop: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 34,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#0D2A18',
    elevation: 1,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1,
  },
});
