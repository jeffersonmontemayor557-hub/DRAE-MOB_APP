import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
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
import { isSupabaseConfigured, supabaseConfigError } from '../lib/supabase';
import {
  formatSignUpErrorMessage,
  signOutAuth,
  signUpWithEmailPassword,
  tryLinkAuthUserToUnlinkedProfileByEmail,
} from '../services/supabaseService';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const MIN_PASSWORD = 6;

export default function SignUpScreen({ navigation }: Props) {
  const { refreshFromRemote } = useAppData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSignUp = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('Configuration', supabaseConfigError);
      return;
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      Alert.alert('Sign up', 'Enter your email and password.');
      return;
    }
    if (password.length < MIN_PASSWORD) {
      Alert.alert('Sign up', `Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirm) {
      Alert.alert('Sign up', 'Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const { needsEmailConfirmation } = await signUpWithEmailPassword(trimmed, password);

      if (needsEmailConfirmation) {
        Alert.alert(
          'Confirm your email',
          'Open the confirmation link we sent, then use Log in. Your account will connect to the resident profile that uses this same email.',
          [{ text: 'OK', onPress: () => navigation.replace('Login') }],
        );
        return;
      }

      const link = await tryLinkAuthUserToUnlinkedProfileByEmail();
      if (link === 'ambiguous') {
        await signOutAuth();
        Alert.alert(
          'Sign up',
          'Multiple resident records use this email. Contact CDRRMO so they can fix the records.',
        );
        return;
      }
      if (link === 'no_match') {
        await signOutAuth();
        Alert.alert(
          'No matching profile',
          'There is no resident profile with this email that is ready to link, or it already has an account. Use the exact email on file with CDRRMO, or ask staff for help.',
        );
        return;
      }

      const { hasProfile, mustChangePassword: needNewPassword } = await refreshFromRemote();
      if (needNewPassword) {
        navigation.replace('ChangePassword');
      } else if (hasProfile) {
        navigation.replace('MainTabs');
      } else {
        navigation.replace('PersonalInformation');
      }
    } catch (err) {
      Alert.alert('Sign up failed', formatSignUpErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.container}>
          <Image source={require('../../assets/cdr-logo.png')} style={styles.logo} />
          <Text style={styles.header}>CREATE ACCOUNT</Text>
          <Text style={styles.subHeader}>
            Use the same email as your household record in CDRRMO (see your profile in our office data).
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder=""
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            style={styles.input}
          />

          <Text style={styles.label}>Password</Text>
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
            onPress={() => void onSignUp()}
            disabled={busy}
          >
            <Text style={styles.buttonText}>{busy ? 'CREATING ACCOUNT…' : 'SIGN UP'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('Login')}
            disabled={busy}
          >
            <Text style={styles.linkText}>Already have an account? Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  container: {
    backgroundColor: colors.background,
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  header: {
    color: colors.primaryDark,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1.8,
  },
  subHeader: {
    color: '#424242',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    paddingHorizontal: 12,
    maxWidth: 360,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 4,
  },
  label: {
    width: '100%',
    maxWidth: 360,
    textAlign: 'center',
    color: '#212121',
    fontSize: 15,
    marginBottom: 2,
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  linkRow: {
    marginTop: 8,
    padding: 8,
  },
  linkText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '600',
  },
});
