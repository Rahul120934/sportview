import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { Activity, Minus, Plus, ChevronRight } from 'lucide-react-native';

export default function FootballSetupScreen({ onBack, onStartMatch }) {
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [halfDuration, setHalfDuration] = useState(45);

  const launch = () => {
    const t1 = team1.trim() || 'Team A';
    const t2 = team2.trim() || 'Team B';
    if (t1 === t2) { Alert.alert('Error', 'Team names must be different.'); return; }
    onStartMatch({ sport: 'Football', team1: t1, team2: t2, halfDuration });
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
          <Text style={s.emoji}>⚽</Text>
          <Text style={s.heroTitle}>Football Setup</Text>
          <Text style={s.heroSub}>Configure your match and start scoring</Text>
        </View>

        {/* Teams */}
        <View style={s.card}>
          <Text style={s.cardTitle}>TEAM NAMES</Text>
          <Text style={s.fieldLabel}>HOME TEAM</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="e.g. Mumbai FC"
              placeholderTextColor="#9CA3AF"
              value={team1}
              onChangeText={setTeam1}
            />
          </View>
          <Text style={[s.fieldLabel, { marginTop: 16 }]}>AWAY TEAM</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="e.g. Delhi United"
              placeholderTextColor="#9CA3AF"
              value={team2}
              onChangeText={setTeam2}
            />
          </View>
        </View>

        {/* Half Duration */}
        <View style={s.card}>
          <Text style={s.cardTitle}>HALF DURATION</Text>
          <Text style={s.fieldSub}>Minutes per half</Text>
          <View style={s.stepper}>
            <TouchableOpacity
              style={s.stepBtn}
              onPress={() => setHalfDuration(d => Math.max(5, d - 5))}
            >
              <Minus color="#4B5563" size={22} />
            </TouchableOpacity>
            <View style={s.stepValue}>
              <Text style={s.stepNum}>{halfDuration}</Text>
              <Text style={s.stepLabel}>MINS</Text>
            </View>
            <TouchableOpacity
              style={s.stepBtn}
              onPress={() => setHalfDuration(d => Math.min(90, d + 5))}
            >
              <Plus color="#4B5563" size={22} />
            </TouchableOpacity>
          </View>
          <Text style={s.stepHint}>Total match time: {halfDuration * 2} minutes</Text>
        </View>

        <TouchableOpacity style={s.launchBtn} onPress={launch}>
          <Text style={s.launchText}>⚽  KICK OFF</Text>
          <ChevronRight color="#FFF" size={20} />
        </TouchableOpacity>
        <Text style={s.launchNote}>A live QR code will be generated after kick‑off for fans to follow the score.</Text>
        <View style={{ height: 60 }} />
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
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 6 },
  heroSub: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 8 },
  fieldSub: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12 },
  input: { flex: 1, fontSize: 16, color: '#111827', fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  stepBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  stepValue: { alignItems: 'center', minWidth: 80 },
  stepNum: { fontSize: 48, fontWeight: '900', color: '#0047FF' },
  stepLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1 },
  stepHint: { textAlign: 'center', fontSize: 12, color: '#6B7280', marginTop: 12 },
  launchBtn: { backgroundColor: '#0047FF', borderRadius: 14, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
  launchText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  launchNote: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 12 },
});
