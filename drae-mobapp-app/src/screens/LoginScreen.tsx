import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../App';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={require('../../assets/cdr-logo.png')} style={styles.logo} />
        <Text style={styles.header}>CITY DISASTER RISK REDUCTION</Text>
        <Text style={styles.subHeader}>AND MANAGEMENT OFFICE</Text>

        <Text style={styles.label}>User Name</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          placeholder=""
          style={styles.input}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder=""
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('PersonalInformation')}
        >
          <Text style={styles.buttonText}>LOG IN</Text>
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
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 1,
  },
});
