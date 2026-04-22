import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{date}</Text>
      <Text style={styles.subtitle}>Daily totals + meal list go here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 8 },
});
