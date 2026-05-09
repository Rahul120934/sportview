import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';

export default function TeamPlayerSetupScreen({ config, onBack, onComplete }) {
  const [activeTeam, setActiveTeam] = useState('team1');
  const [team1Name, setTeam1Name] = useState(config.team1 || 'Team 1');
  const [team2Name, setTeam2Name] = useState(config.team2 || 'Team 2');
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);
  const [newPlayerName, setNewPlayerName] = useState('');

  const maxPlayers = config.players || 11;
  const isNamesMode = config.playerIdentity === 'names';

  useEffect(() => {
    if (!isNamesMode) {
      const generate = (prefix) =>
        Array.from({ length: maxPlayers }, (_, i) => ({
          id: `${prefix}-${i + 1}`,
          name: `Player ${i + 1}`,
        }));
      setTeam1Players(generate('t1'));
      setTeam2Players(generate('t2'));
    }
  }, [isNamesMode, maxPlayers]);

  const activePlayers = activeTeam === 'team1' ? team1Players : team2Players;
  const setActivePlayers =
    activeTeam === 'team1' ? setTeam1Players : setTeam2Players;

  const handleAddPlayer = () => {
    const trimmed = newPlayerName.trim();
    if (!trimmed) return;
    if (activePlayers.length >= maxPlayers) {
      Alert.alert('Limit Reached', `You can only add up to ${maxPlayers} players.`);
      return;
    }
    setActivePlayers((prev) => [
      ...prev,
      { id: `${activeTeam}-${Date.now()}`, name: trimmed },
    ]);
    setNewPlayerName('');
  };

  const handleRemovePlayer = (id) => {
    setActivePlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleConfirm = () => {
    if (isNamesMode) {
      if (team1Players.length < maxPlayers || team2Players.length < maxPlayers) {
        Alert.alert(
          'Incomplete Teams',
          `Both teams must have ${maxPlayers} players each.`
        );
        return;
      }
    }
    onComplete({
      team1Name,
      team2Name,
      team1Players: team1Players.map((p) => p.name),
      team2Players: team2Players.map((p) => p.name),
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.topBar}>CRICKET · SQUAD SETUP</Text>

      {/* Team Name Inputs */}
      <View style={styles.field}>
        <Text style={styles.label}>TEAM 1 NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter team name"
          placeholderTextColor="#444"
          value={team1Name}
          onChangeText={setTeam1Name}
        />
        <View style={styles.inputUnderline} />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>TEAM 2 NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter team name"
          placeholderTextColor="#444"
          value={team2Name}
          onChangeText={setTeam2Name}
        />
        <View style={styles.inputUnderline} />
      </View>

      {/* Team Toggle */}
      <View style={styles.field}>
        <Text style={styles.label}>SELECT TEAM</Text>
        <View style={styles.pillToggle}>
          <TouchableOpacity
            style={[styles.pillOption, activeTeam === 'team1' && styles.pillActive]}
            onPress={() => setActiveTeam('team1')}
          >
            <Text style={[styles.pillText, activeTeam === 'team1' && styles.pillTextActive]}>
              TEAM 1
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pillOption, activeTeam === 'team2' && styles.pillActive]}
            onPress={() => setActiveTeam('team2')}
          >
            <Text style={[styles.pillText, activeTeam === 'team2' && styles.pillTextActive]}>
              TEAM 2
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Player Count */}
      <Text style={styles.countText}>
        {activeTeam === 'team1' ? team1Name : team2Name} · {activePlayers.length} / {maxPlayers}
      </Text>

      {/* Names Mode: Add Input */}
      {isNamesMode && (
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Player name"
            placeholderTextColor="#444"
            value={newPlayerName}
            onChangeText={setNewPlayerName}
            onSubmitEditing={handleAddPlayer}
          />
          <TouchableOpacity style={styles.addButton} onPress={handleAddPlayer}>
            <Text style={styles.addButtonText}>ADD</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Player List */}
      <ScrollView style={styles.playerList} showsVerticalScrollIndicator={false}>
        {activePlayers.map((player, index) => (
          <View key={player.id} style={styles.playerRow}>
            <View style={styles.playerNumberBadge}>
              <Text style={styles.playerNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.playerName}>{player.name}</Text>
            {isNamesMode && (
              <TouchableOpacity onPress={() => handleRemovePlayer(player.id)}>
                <Text style={styles.removeText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {activePlayers.length === 0 && isNamesMode && (
          <Text style={styles.emptyText}>No players added yet</Text>
        )}
      </ScrollView>

      {/* Actions */}
      <TouchableOpacity style={styles.startButton} onPress={handleConfirm}>
        <Text style={styles.startButtonText}>CONFIRM & START MATCH →</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>← Back to Match Setup</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  topBar: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
  },
  field: {
    marginBottom: 8,
  },
  label: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  input: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  inputUnderline: {
    height: 2,
    backgroundColor: '#00FF87',
    marginTop: 2,
  },
  pillToggle: {
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#444',
  },
  pillOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#00FF87',
  },
  pillText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pillTextActive: {
    color: '#000',
  },
  countText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#444',
    marginRight: 12,
  },
  addButton: {
    backgroundColor: '#00FF87',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  playerList: {
    height: '50%',
    marginBottom: 8,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#222',
  },
  playerNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00FF87',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playerNumberText: {
    color: '#000',
    fontSize: 11,
    fontWeight: 'bold',
  },
  playerName: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  removeText: {
    color: '#e94560',
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  emptyText: {
    color: '#444',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
  startButton: {
    backgroundColor: '#00FF87',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  startButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  backLink: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
});
