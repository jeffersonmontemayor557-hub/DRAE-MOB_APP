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
import { isSupabaseConfigured, supabaseConfigError } from '../lib/supabase';
import {
  formatSignInErrorMessage,
  signInWithEmailPassword,
  signOutAuth,
  tryLinkAuthUserToUnlinkedProfileByEmail,
} from '../services/supabaseService';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { refreshFromRemote } = useAppData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const onLogin = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('Configuration', supabaseConfigError);
      return;
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      Alert.alert('Sign in', 'Enter your email and password.');
      return;
    }

    setBusy(true);
    try {
      await signInWithEmailPassword(trimmed, password);
      const link = await tryLinkAuthUserToUnlinkedProfileByEmail();
      if (link === 'ambiguous') {
        await signOutAuth();
        Alert.alert(
          'Sign in',
          'Multiple resident records use this email. Contact CDRRMO so they can fix the records.',
        );
        return;
      }
      if (link === 'no_match') {
        await signOutAuth();
        Alert.alert(
          'Sign in',
          'No resident profile matched this account yet. Use the same email as your CDRRMO household record, or ask staff to link your login.',
        );
        return;
      }
      const { hasProfile, mustChangePassword: needNewPassword, mustCompleteProfile } =
        await refreshFromRemote();
      if (needNewPassword) {
        navigation.replace('ChangePassword');
      } else if (hasProfile && mustCompleteProfile) {
        navigation.replace('PersonalInformation');
      } else if (hasProfile) {
        navigation.replace('MainTabs');
      } else {
        navigation.replace('PersonalInformation');
      }
    } catch (err) {
      Alert.alert('Sign in failed', formatSignInErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={require('../../assets/cdr-logo.png')} style={styles.logo} />
        <Text style={styles.header}>CITY DISASTER RISK REDUCTION</Text>
        <Text style={styles.subHeader}>AND MANAGEMENT OFFICE</Text>

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

        <TouchableOpacity
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={onLogin}
          disabled={busy}
        >
          <Text style={styles.buttonText}>{busy ? 'SIGNING IN…' : 'LOG IN'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => navigation.navigate('SignUp')}
          disabled={busy}
        >
          <Text style={styles.linkText}>New resident? Create an account</Text>
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
    letterSpacing: 1.8,
  },
  subHeader: {
    color: colors.primaryDark,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 1.8,
  },
  logo: {
    width: 126,
    height: 126,
    resizeMode: 'contain',
    marginBottom: 8,
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
    marginTop: 16,
    padding: 8,
  },
  linkText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '600',
  },
});
