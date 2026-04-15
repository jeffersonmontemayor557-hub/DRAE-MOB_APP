import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { DASMARINAS_BARANGAYS } from '../constants/dasmarinasBarangays';
import { colors } from '../theme/colors';

const SHEET_HEIGHT = Math.min(520, Math.round(Dimensions.get('window').height * 0.7));

type Props = {
  value: string;
  onChange: (name: string) => void;
  style?: StyleProp<ViewStyle>;
  placeholder?: string;
};

export function DasmarinasBarangayPickerField({
  value,
  onChange,
  style,
  placeholder = '— Select barangay —',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return DASMARINAS_BARANGAYS;
    }
    return DASMARINAS_BARANGAYS.filter((name) => name.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, style]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        accessibilityLabel="Select barangay"
      >
        <Text style={value ? styles.triggerText : styles.triggerPlaceholder} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.primaryDark} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Barangay — Dasmariñas City</Text>
            <TextInput
              style={styles.search}
              placeholder="Search barangay…"
              placeholderTextColor={colors.mutedHint}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            <FlatList
              style={{ maxHeight: SHEET_HEIGHT - 130 }}
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.empty}>
                  No barangay matches &quot;{query.trim()}&quot;.
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.row, item === value && styles.rowSelected]}
                  onPress={() => {
                    onChange(item);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.rowText, item === value && styles.rowTextSelected]}>
                    {item}
                  </Text>
                  {item === value ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              )}
            />
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
    gap: 8,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  triggerPlaceholder: {
    flex: 1,
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
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    maxHeight: SHEET_HEIGHT + 80,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 10,
  },
  search: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  rowSelected: {
    backgroundColor: '#E8F4EC',
  },
  rowText: {
    flex: 1,
    fontSize: 16,
    color: '#1F1F1F',
  },
  rowTextSelected: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  empty: {
    paddingVertical: 20,
    textAlign: 'center',
    color: colors.muted,
  },
  cancelBtn: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: colors.muted,
    fontWeight: '600',
  },
});
