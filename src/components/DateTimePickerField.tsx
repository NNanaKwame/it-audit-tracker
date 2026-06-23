import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, Radius, Spacing } from '../constants/theme';

interface DateTimePickerFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  placeholder?: string;
  minimumDate?: Date;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * A modern, Material-style date/time picker field.
 * On Android, opens the native Material Date/Time picker dialogs sequentially
 * for 'datetime' mode (date dialog, then time dialog).
 * On iOS, opens a bottom sheet with the inline spinner/wheel picker.
 */
export function DateTimePickerField({
  label, value, onChange, mode = 'date', placeholder = 'Select date', minimumDate,
}: DateTimePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerStage, setPickerStage] = useState<'date' | 'time'>('date');
  const [iosTempDate, setIosTempDate] = useState<Date>(value ?? new Date());

  function openPicker() {
    setIosTempDate(value ?? new Date());
    setPickerStage('date');
    setShowPicker(true);
  }

  function handleAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    if (!selected) return;

    if (mode === 'datetime') {
      if (pickerStage === 'date') {
        // Keep the date, move to time picker next
        setIosTempDate(selected);
        setPickerStage('time');
        // Re-show for time on Android (sequential dialogs)
        setTimeout(() => setShowPicker(true), 50);
        setShowPicker(false);
        return;
      } else {
        // Combine previously picked date with new time
        const combined = new Date(iosTempDate);
        combined.setHours(selected.getHours(), selected.getMinutes());
        onChange(combined);
        setShowPicker(false);
        return;
      }
    }

    onChange(selected);
    setShowPicker(false);
  }

  function handleIosChange(event: DateTimePickerEvent, selected?: Date) {
    if (selected) setIosTempDate(selected);
  }

  function confirmIos() {
    onChange(iosTempDate);
    setShowPicker(false);
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={openPicker} activeOpacity={0.7}>
        <MaterialCommunityIcons
          name={mode === 'time' ? 'clock-outline' : 'calendar-outline'}
          size={18}
          color={Colors.blue}
        />
        <Text style={[styles.fieldText, !value && styles.placeholderText]}>
          {value
            ? mode === 'date'
              ? formatDate(value)
              : mode === 'time'
              ? formatTime(value)
              : `${formatDate(value)} · ${formatTime(value)}`
            : placeholder}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={Colors.textHint} />
      </TouchableOpacity>

      {/* Android: native dialogs rendered conditionally, no wrapper needed */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={iosTempDate}
          mode={mode === 'datetime' ? pickerStage : mode}
          is24Hour={false}
          onChange={handleAndroidChange}
          minimumDate={minimumDate}
        />
      )}

      {/* iOS: modal bottom sheet with inline spinner + confirm button */}
      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="slide">
          <View style={styles.iosOverlay}>
            <View style={styles.iosSheet}>
              <View style={styles.iosSheetHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.iosCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.iosSheetTitle}>{label}</Text>
                <TouchableOpacity onPress={confirmIos}>
                  <Text style={styles.iosConfirmText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={iosTempDate}
                mode={mode === 'datetime' ? 'datetime' : mode}
                display="spinner"
                onChange={handleIosChange}
                minimumDate={minimumDate}
                style={{ height: 200 }}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 6, fontWeight: '500' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bgPrimary,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  fieldText: { flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500' },
  placeholderText: { color: Colors.textHint, fontWeight: '400' },
  iosOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  iosSheet: {
    backgroundColor: Colors.bgPrimary,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: 24,
  },
  iosSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  iosSheetTitle: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  iosCancelText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  iosConfirmText: { fontSize: FontSize.sm, color: Colors.blue, fontWeight: '600' },
});