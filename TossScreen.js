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
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  topBar: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#252525',
    borderRadius: 12,
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#00FF87',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  optionText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 8,
  },
  link: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
});
