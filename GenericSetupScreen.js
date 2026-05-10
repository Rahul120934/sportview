import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Activity, Minus, Plus, ChevronRight } from 'lucide-react-native';

export default function GenericSetupScreen({ sport, onBack, onStartMatch }) {
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  
  // Default configs based on sport
  const configs = {
    badminton: { points: 21, sets: 3, label: 'Points per Game' },
    volleyball: { points: 25, sets: 5, label: 'Points per Set' },
    table_tennis: { points: 11, sets: 5, label: 'Points per Game' },
    tennis: { points: 6, sets: 3, label: 'Games per Set' },
  };

  const currentConfig = configs[sport] || { points: 21, sets: 3, label: 'Points' };
  const [pointsToWin, setPointsToWin] = useState(currentConfig.points);
  const [bestOf, setBestOf] = useState(currentConfig.sets);

  const launch = () => {
    const t1 = team1.trim() || 'Player 1';
    const t2 = team2.trim() || 'Player 2';
    if (t1 === t2) { Alert.alert('Error', 'Names must be different.'); return; }
    onStartMatch({ 
      sport: sport.charAt(0).toUpperCase() + sport.slice(1).replace('_', ' '), 
      team1: t1, 
      team2: t2, 
      pointsToWin, 
      bestOf,
      sportId: sport 
    });
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.logoRow}>
          <Activity color="#0047FF" size={22} />
          <Text style={s.logoText}>STADIUM LIVE</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.heroBox}>
          <Text style={s.emoji}>
            {sport === 'badminton' ? '🏸' : sport === 'volleyball' ? '🏐' : sport === 'table_tennis' ? '🏓' : '🎾'}
          </Text>
          <Text style={s.heroTitle}>{sport.replace('_', ' ').toUpperCase()} Setup</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>PARTICIPANTS</Text>
          <Text style={s.fieldLabel}>SIDE A / PLAYER 1</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Enter name"
              placeholderTextColor="#9CA3AF"
              value={team1}
              onChangeText={setTeam1}
            />
          </View>
          <Text style={[s.fieldLabel, { marginTop: 16 }]}>SIDE B / PLAYER 2</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="Enter name"
              placeholderTextColor="#9CA3AF"
              value={team2}
              onChangeText={setTeam2}
            />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>MATCH FORMAT</Text>
          <Text style={s.fieldSub}>{currentConfig.label}</Text>
          <View style={s.stepper}>
            <TouchableOpacity onPress={() => setPointsToWin(p => Math.max(1, p - 1))} style={s.stepBtn}>
              <Minus color="#4B5563" size={20} />
            </TouchableOpacity>
            <Text style={s.stepNum}>{pointsToWin}</Text>
            <TouchableOpacity onPress={() => setPointsToWin(p => p + 1)} style={s.stepBtn}>
              <Plus color="#4B5563" size={20} />
            </TouchableOpacity>
          </View>

          <Text style={[s.fieldSub, { marginTop: 24 }]}>Best of Sets/Games</Text>
          <View style={s.stepper}>
            <TouchableOpacity onPress={() => setBestOf(s => Math.max(1, s - 2))} style={s.stepBtn}>
              <Minus color="#4B5563" size={20} />
            </TouchableOpacity>
            <Text style={s.stepNum}>{bestOf}</Text>
            <TouchableOpacity onPress={() => setBestOf(s => s + 2)} style={s.stepBtn}>
              <Plus color="#4B5563" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={s.launchBtn} onPress={launch}>
          <Text style={s.launchText}>START MATCH</Text>
          <ChevronRight color="#FFF" size={20} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 60 },
  backText: { color: '#0047FF', fontWeight: '700', fontSize: 14 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 16, fontWeight: '900', color: '#0047FF', letterSpacing: 1 },
  scroll: { padding: 20 },
  heroBox: { alignItems: 'center', paddingVertical: 24 },
  emoji: { fontSize: 56, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#111827' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  fieldSub: { fontSize: 13, color: '#6B7280', marginBottom: 12, textAlign: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 32, fontWeight: '900', color: '#0047FF', minWidth: 60, textAlign: 'center' },
  launchBtn: { backgroundColor: '#0047FF', borderRadius: 14, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
  launchText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
});
