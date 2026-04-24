import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

function buildDays(count = 7): { label: string; date: string }[] {
  const days: { label: string; date: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    let label: string;
    if (i === 0) label = 'Today';
    else if (i === 1) label = 'Yesterday';
    else {
      label = d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
    }
    days.push({ label, date: iso });
  }
  return days;
}

interface Props {
  visible: boolean;
  selected: string; // YYYY-MM-DD
  onSelect: (date: string) => void;
  onClose: () => void;
}

export function DatePickerSheet({ visible, selected, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const days = buildDays(7);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={s.handle} />
        <Text style={s.title}>Log date</Text>
        {days.map(({ label, date }) => {
          const active = date === selected;
          return (
            <TouchableOpacity
              key={date}
              style={[s.row, active && s.rowActive]}
              onPress={() => { onSelect(date); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[s.rowLabel, active && s.rowLabelActive]}>{label}</Text>
              <Text style={s.rowDate}>{date}</Text>
              {active && <Text style={s.check}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: Colors.surfaceStrong,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 4,
  },
  handle: {
    alignSelf: 'center',
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
  },
  rowActive: { backgroundColor: Colors.primary + '18' },
  rowLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: Colors.text },
  rowLabelActive: { fontWeight: '700', color: Colors.primary },
  rowDate: { fontSize: 12, color: Colors.textMuted },
  check: { fontSize: 15, color: Colors.primary, fontWeight: '700' },
});
