import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';
import { allowSelfSignup } from '../config/allowSelfSignup';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Start'>;

export default function StartScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/cdr-logo.png')} style={styles.cdrLogo} />
          <Image source={require('../../assets/city-logo.png')} style={styles.cityLogo} />
        </View>

        <Text style={styles.title}>
          City Disaster Risk Reduction and Management Office of City of Dasmarinas
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.buttonText}>LOG IN</Text>
        </TouchableOpacity>

        {allowSelfSignup ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('SignUp')}
          >
            <Text style={styles.secondaryButtonText}>CREATE ACCOUNT</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.selfSignupOffText}>
            New accounts are issued when you are registered with CDRRMO. Use Log in if you already
            have credentials.
          </Text>
        )}
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
  },
  logoRow: {
    flexDirection: 'row',
    gap: 18,
    marginBottom: 28,
  },
  cdrLogo: {
    width: 94,
    height: 94,
    resizeMode: 'contain',
  },
  cityLogo: {
    width: 86,
    height: 86,
    resizeMode: 'contain',
  },
  title: {
    textAlign: 'center',
    color: colors.primaryDark,
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 40,
    lineHeight: 42,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: 40,
    paddingVertical: 13,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#0D2A18',
    elevation: 1,
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  secondaryButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  selfSignupOffText: {
    marginTop: 8,
    textAlign: 'center',
    color: colors.primaryDark,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
    opacity: 0.9,
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
