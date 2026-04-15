import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  formatPhilippineMobileNationalSpacing,
  normalizePhilippineMobileTyping,
} from '../utils/phoneFormat';
import { colors } from '../theme/colors';

type Props = {
  label: string;
  /** National 10 digits (9XXXXXXXXX), may be partial while typing. */
  valueNationalTen: string;
  onChangeNationalTen: (nationalTen: string) => void;
  required?: boolean;
  helperText?: string;
  placeholder?: string;
};

export function PhilippineMobileField({
  label,
  valueNationalTen,
  onChangeNationalTen,
  required = false,
  helperText = 'Enter your 10-digit number starting with 9',
  placeholder = '9XX XXX XXXX',
}: Props) {
  const display = formatPhilippineMobileNationalSpacing(valueNationalTen);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.star}> *</Text> : null}
      </Text>
      <View style={styles.combined}>
        <View style={styles.prefixBlock}>
          <Text style={styles.prefixText}>
            <Text style={styles.ph}>PH</Text>
            <Text style={styles.ph}> </Text>
            <Text style={styles.plus63}>+63</Text>
          </Text>
        </View>
        <View style={styles.divider} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedHint}
          keyboardType="phone-pad"
          value={display}
          onChangeText={(text) => {
            onChangeNationalTen(normalizePhilippineMobileTyping(text));
          }}
          maxLength={14}
        />
      </View>
      <Text style={styles.helper}>{helperText}</Text>
    </View>
  );
}

const INPUT_V_PAD = 12;
const INPUT_H_PAD = 14;

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
  },
  label: {
    color: '#1F1F1F',
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 4,
  },
  star: {
    color: '#C62828',
  },
  combined: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
    overflow: 'hidden',
  },
  prefixBlock: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    minWidth: 86,
    backgroundColor: '#E8F4EC',
  },
  prefixText: {
    textAlign: 'center',
  },
  ph: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: '600',
  },
  plus63: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: INPUT_H_PAD,
    paddingVertical: INPUT_V_PAD,
    fontSize: 16,
    color: '#000000',
    letterSpacing: 0.6,
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'android' ? { textAlignVertical: 'center' } : {}),
  },
  helper: {
    marginTop: 5,
    marginLeft: 4,
    fontSize: 11,
    color: colors.muted,
    lineHeight: 15,
  },
});
