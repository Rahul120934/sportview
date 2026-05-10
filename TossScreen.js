import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function TossScreen({ teams, onBack, onSelectBattingTeam }) {
  return (
    <View style={styles.container}>
      <Text style={styles.topBar}>CRICKET · TOSS</Text>
      <View style={styles.card}>
        <Text style={styles.title}>Who Will Bat First?</Text>
        <Text style={styles.subtitle}>Select the batting side to start innings one</Text>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => onSelectBattingTeam('team1')}
        >
          <Text style={styles.optionText}>{teams?.team1Name || 'Team 1'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => onSelectBattingTeam('team2')}
        >
          <Text style={styles.optionText}>{teams?.team2Name || 'Team 2'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onBack} style={styles.linkButton}>
          <Text style={styles.link}>← Back to Team Setup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  topBar: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    fontSize: 15,
    fontWeight: '500',
  },
  optionButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  optionText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 12,
  },
  link: {
    color: '#2563EB',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
});
