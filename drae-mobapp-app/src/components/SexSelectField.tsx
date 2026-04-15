import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';

export const SEX_OPTIONS = ['Male', 'Female'] as const;

/** Map stored profile text to canonical Male / Female for the picker. */
export function normalizeSexForForm(raw: string | null | undefined): string {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (v === 'male' || v === 'm') {
    return 'Male';
  }
  if (v === 'female' || v === 'f') {
    return 'Female';
  }
  const t = String(raw ?? '').trim();
  if (t === 'Male' || t === 'Female') {
    return t;
  }
  return '';
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
};

export function SexSelectField({ value, onChange, style }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, style]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={value ? styles.triggerText : styles.triggerPlaceholder}>
          {value || 'Select'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.primaryDark} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Sex</Text>
            {SEX_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.option, value === opt && styles.optionSelected]}
                onPress={() => {
                  onChange(opt);
                  setOpen(false);
                }}
              >
                <Text
                  style={[styles.optionText, value === opt && styles.optionTextSelected]}
                >
                  {opt}
                </Text>
                {value === opt ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    fontSize: 16,
    color: '#000000',
  },
  triggerPlaceholder: {
    fontSize: 16,
    color: colors.mutedHint,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  optionSelected: {
    backgroundColor: '#E8F4EC',
  },
  optionText: {
    fontSize: 17,
    color: '#1F1F1F',
  },
  optionTextSelected: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: colors.muted,
    fontWeight: '600',
  },
});
