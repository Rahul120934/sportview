import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Clipboard,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { firestoreDb } from './firebaseConfig';
import { Activity, Share2, Play, Pause, RotateCcw } from 'lucide-react-native';

const VIEWER_BASE = 'https://gp-hackathon-4d77f.web.app';

export default function FootballScoreboardScreen({ matchSession, onBack }) {
  const matchId = matchSession?.id;
  const sessionCode = matchSession?.sessionCode;
  const team1Name = matchSession?.team1 || 'Team A';
  const team2Name = matchSession?.team2 || 'Team B';
  const halfDuration = matchSession?.halfDuration || 45; // minutes

  const [score, setScore] = useState({ team1: 0, team2: 0 });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [half, setHalf] = useState(1); // 1 = first half, 2 = second half
  const [status, setStatus] = useState('live'); // 'live' | 'halftime' | 'fulltime'
  const intervalRef = useRef(null);
  const lastSyncRef = useRef(0);

  // Sync from Firestore on load
  useEffect(() => {
    if (!matchId) return;
    const unsub = onSnapshot(doc(firestoreDb, 'matches', matchId), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.football) {
        setScore(d.football.score || { team1: 0, team2: 0 });
        setElapsedSeconds(d.football.elapsedSeconds || 0);
        setHalf(d.football.half || 1);
        setStatus(d.football.status || 'live');
        // Don't sync running state — let scorer control it locally
      }
    });
    return unsub;
  }, [matchId]);

  // Timer tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(s => {
          const next = s + 1;
          // Sync to firebase every 10 seconds
          if (next - lastSyncRef.current >= 10) {
            lastSyncRef.current = next;
            syncToFirestore(undefined, next);
          }
          return next;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const syncToFirestore = (overrideScore, overrideElapsed) => {
    if (!matchId) return;
    setDoc(doc(firestoreDb, 'matches', matchId), {
      football: {
        score: overrideScore || score,
        elapsedSeconds: overrideElapsed !== undefined ? overrideElapsed : elapsedSeconds,
        half,
        status,
        halfDuration,
        updatedAt: Date.now(),
      },
    }, { merge: true }).catch(e => console.warn('Sync error', e));
  };

  const addGoal = (team) => {
    const next = { ...score, [team]: (score[team] || 0) + 1 };
    setScore(next);
    syncToFirestore(next, undefined);
  };

  const removeGoal = (team) => {
    const next = { ...score, [team]: Math.max(0, (score[team] || 0) - 1) };
    setScore(next);
    syncToFirestore(next, undefined);
  };

  const toggleTimer = () => setRunning(r => !r);

  const startSecondHalf = () => {
    setHalf(2);
    setElapsedSeconds(0);
    setStatus('live');
    setRunning(false);
    syncToFirestore(undefined, 0);
  };

  const endMatch = () => {
    Alert.alert('End Match', 'Are you sure you want to end the match?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Match', style: 'destructive', onPress: () => {
          setRunning(false);
          setStatus('fulltime');
          syncToFirestore(undefined, undefined);
          updateDoc(doc(firestoreDb, 'matches', matchId), { 'matchState.status': 'completed' });
        },
      },
    ]);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const periodLabel = status === 'fulltime'
    ? 'FULL TIME'
    : half === 1
      ? '1ST HALF'
      : '2ND HALF';

  const isHalfOver = elapsedSeconds >= halfDuration * 60;
  const viewerUrl = `${VIEWER_BASE}/match/${sessionCode}`;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.logoRow}>
          <Activity color="#0047FF" size={20} />
          <Text style={s.logoText}>STADIUM LIVE</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Score Hero */}
        <View style={s.heroCard}>
          <View style={s.periodBadge}>
            <View style={[s.liveDot, { backgroundColor: status === 'fulltime' ? '#10B981' : running ? '#DC2626' : '#F59E0B' }]} />
            <Text style={[s.periodText, { color: status === 'fulltime' ? '#10B981' : running ? '#DC2626' : '#F59E0B' }]}>
              {periodLabel}
            </Text>
          </View>

          {/* Timer */}
          <Text style={s.timer}>{formatTime(elapsedSeconds)}</Text>

          {/* Timer controls */}
          {status !== 'fulltime' && (
            <View style={s.timerControls}>
              <TouchableOpacity style={[s.timerBtn, running && s.timerBtnActive]} onPress={toggleTimer}>
                {running
                  ? <Pause color="#FFF" size={20} />
                  : <Play color="#FFF" size={20} />}
                <Text style={s.timerBtnText}>{running ? 'Pause' : 'Start'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Scoreline */}
          <View style={s.scoreRow}>
            <View style={s.teamBlock}>
              <Text style={s.teamName}>{team1Name}</Text>
              <Text style={s.teamScore}>{score.team1 || 0}</Text>
            </View>
            <View style={s.dash}><Text style={s.dashText}>—</Text></View>
            <View style={s.teamBlock}>
              <Text style={s.teamName}>{team2Name}</Text>
              <Text style={s.teamScore}>{score.team2 || 0}</Text>
            </View>
          </View>
        </View>

        {/* Goal Buttons */}
        <Text style={s.sectionHeader}>RECORD GOAL</Text>
        <View style={s.goalRow}>
          {/* Team 1 */}
          <View style={s.goalCard}>
            <Text style={s.goalTeam}>{team1Name}</Text>
            <TouchableOpacity style={s.goalBtn} onPress={() => addGoal('team1')}>
              <Text style={s.goalBtnText}>⚽ +GOAL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.undoBtn} onPress={() => removeGoal('team1')}>
              <RotateCcw color="#6B7280" size={14} />
              <Text style={s.undoBtnText}>Undo</Text>
            </TouchableOpacity>
          </View>
          {/* Team 2 */}
          <View style={s.goalCard}>
            <Text style={s.goalTeam}>{team2Name}</Text>
            <TouchableOpacity style={[s.goalBtn, { backgroundColor: '#DC2626' }]} onPress={() => addGoal('team2')}>
              <Text style={s.goalBtnText}>⚽ +GOAL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.undoBtn} onPress={() => removeGoal('team2')}>
              <RotateCcw color="#6B7280" size={14} />
              <Text style={s.undoBtnText}>Undo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Half / Match controls */}
        <Text style={s.sectionHeader}>MATCH CONTROLS</Text>
        <View style={s.ctrlRow}>
          {half === 1 && (
            <TouchableOpacity style={s.ctrlBtn} onPress={startSecondHalf}>
              <Text style={s.ctrlBtnText}>🏁  Start 2nd Half</Text>
            </TouchableOpacity>
          )}
          {status !== 'fulltime' && (
            <TouchableOpacity style={[s.ctrlBtn, { backgroundColor: '#FEF2F2', borderColor: '#DC2626' }]} onPress={endMatch}>
              <Text style={[s.ctrlBtnText, { color: '#DC2626' }]}>🏆  End Match</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Spectator QR */}
        <Text style={s.sectionHeader}>SPECTATOR LINK</Text>
        <View style={s.shareCard}>
          <View style={s.qrBox}>
            {sessionCode ? <QRCode value={viewerUrl} size={60} /> : null}
          </View>
          <View style={s.shareInfo}>
            <Text style={s.shareTitle}>Live Session Code</Text>
            <Text style={s.shareCode}>{sessionCode || '...'}</Text>
            <TouchableOpacity style={s.shareBtn} onPress={() => {
              if (typeof Clipboard !== 'undefined') Clipboard.setString(viewerUrl);
              Alert.alert('Link Copied!', `Share this link:\n${viewerUrl}`);
            }}>
              <Share2 color="#0047FF" size={14} />
              <Text style={s.shareBtnText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>
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

  heroCard: { backgroundColor: '#0047FF', margin: 16, borderRadius: 24, padding: 24, alignItems: 'center' },
  periodBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  periodText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  timer: { fontSize: 72, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2, marginBottom: 8 },
  timerControls: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  timerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  timerBtnActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  timerBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  teamBlock: { flex: 1, alignItems: 'center' },
  teamName: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '700', marginBottom: 4 },
  teamScore: { fontSize: 64, fontWeight: '900', color: '#FFFFFF' },
  dash: { paddingHorizontal: 12 },
  dashText: { fontSize: 40, color: 'rgba(255,255,255,0.4)', fontWeight: '200' },

  sectionHeader: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 10, marginHorizontal: 16 },
  goalRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 24 },
  goalCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  goalTeam: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 12 },
  goalBtn: { backgroundColor: '#0047FF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, width: '100%', alignItems: 'center', marginBottom: 10 },
  goalBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  undoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  undoBtnText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },

  ctrlRow: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 24 },
  ctrlBtn: { flex: 1, backgroundColor: '#F0F9FF', borderWidth: 1, borderColor: '#0047FF', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  ctrlBtnText: { fontWeight: '800', fontSize: 14, color: '#0047FF' },

  shareCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 14, padding: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  qrBox: { padding: 4, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  shareInfo: { flex: 1, marginLeft: 16 },
  shareTitle: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  shareCode: { fontSize: 18, fontWeight: '900', color: '#111827', letterSpacing: 2, marginBottom: 8 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start', gap: 6 },
  shareBtnText: { color: '#0047FF', fontSize: 12, fontWeight: '700' },
});
