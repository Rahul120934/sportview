import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Clipboard } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { firestoreDb } from './firebaseConfig';
import { Activity, Share2, RotateCcw, Trophy } from 'lucide-react-native';

const VIEWER_BASE = 'https://gp-hackathon-4d77f.web.app';

export default function GenericPointScoreboardScreen({ matchSession, onBack }) {
  const matchId = matchSession?.id;
  const sessionCode = matchSession?.sessionCode;
  const sport = matchSession?.sport || 'Sport';
  const sportId = matchSession?.sportId;
  const team1Name = matchSession?.team1 || 'Player 1';
  const team2Name = matchSession?.team2 || 'Player 2';
  const pointsToWin = matchSession?.pointsToWin || 21;
  const bestOf = matchSession?.bestOf || 3;

  const [points, setPoints] = useState({ team1: 0, team2: 0 });
  const [sets, setSets] = useState({ team1: 0, team2: 0 });
  const [history, setHistory] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [winner, setWinner] = useState(null);

  // Tennis specific state
  const tennisPoints = ['0', '15', '30', '40', 'Ad'];
  const [tennisIdx, setTennisIdx] = useState({ team1: 0, team2: 0 });

  useEffect(() => {
    if (!matchId) return;
    const unsub = onSnapshot(doc(firestoreDb, 'matches', matchId), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.generic) {
        setPoints(d.generic.points || { team1: 0, team2: 0 });
        setSets(d.generic.sets || { team1: 0, team2: 0 });
        setIsCompleted(d.matchState?.status === 'completed');
        setWinner(d.generic.winner);
        if (sportId === 'tennis' && d.generic.tennisIdx) {
          setTennisIdx(d.generic.tennisIdx);
        }
      }
    });
    return unsub;
  }, [matchId]);

  const syncToFirestore = (p, s, w, tIdx) => {
    if (!matchId) return;
    const data = {
      generic: {
        points: p || points,
        sets: s || sets,
        winner: w || winner,
        sport,
        sportId,
        updatedAt: Date.now(),
      },
    };
    if (sportId === 'tennis') data.generic.tennisIdx = tIdx || tennisIdx;
    setDoc(doc(firestoreDb, 'matches', matchId), data, { merge: true });
  };

  const addPoint = (team) => {
    if (isCompleted) return;
    
    if (sportId === 'tennis') {
      handleTennisPoint(team);
      return;
    }

    const nextPoints = { ...points, [team]: points[team] + 1 };
    setPoints(nextPoints);
    
    // Check for set win
    if (nextPoints[team] >= pointsToWin) {
      const otherTeam = team === 'team1' ? 'team2' : 'team1';
      if (nextPoints[team] - nextPoints[otherTeam] >= 2 || nextPoints[team] === 30) {
        handleSetWin(team, nextPoints);
        return;
      }
    }
    syncToFirestore(nextPoints);
  };

  const handleTennisPoint = (team) => {
    const otherTeam = team === 'team1' ? 'team2' : 'team1';
    let nextIdx = { ...tennisIdx };
    
    if (tennisIdx[team] === 3) { // At 40
      if (tennisIdx[otherTeam] < 3) {
        handleTennisGameWin(team);
        return;
      } else if (tennisIdx[otherTeam] === 3) {
        nextIdx[team] = 4; // Advantage
      } else if (tennisIdx[otherTeam] === 4) {
        nextIdx[otherTeam] = 3; // Back to Deuce
      }
    } else if (tennisIdx[team] === 4) { // At Advantage
      handleTennisGameWin(team);
      return;
    } else {
      nextIdx[team] = tennisIdx[team] + 1;
    }
    setTennisIdx(nextIdx);
    syncToFirestore(null, null, null, nextIdx);
  };

  const handleTennisGameWin = (team) => {
    const nextPoints = { ...points, [team]: points[team] + 1 };
    setPoints(nextPoints);
    const zeroIdx = { team1: 0, team2: 0 };
    setTennisIdx(zeroIdx);
    
    if (nextPoints[team] >= pointsToWin) {
      const otherTeam = team === 'team1' ? 'team2' : 'team1';
      if (nextPoints[team] - nextPoints[otherTeam] >= 2 || nextPoints[team] === 7) {
        handleSetWin(team, nextPoints);
        return;
      }
    }
    syncToFirestore(nextPoints, null, null, zeroIdx);
  };

  const handleSetWin = (team, p) => {
    const nextSets = { ...sets, [team]: sets[team] + 1 };
    setSets(nextSets);
    const zeroPoints = { team1: 0, team2: 0 };
    setPoints(zeroPoints);
    
    // Check for match win
    const winThreshold = Math.ceil(bestOf / 2);
    if (nextSets[team] >= winThreshold) {
      const wName = team === 'team1' ? team1Name : team2Name;
      setWinner(wName);
      setIsCompleted(true);
      syncToFirestore(zeroPoints, nextSets, wName);
      updateDoc(doc(firestoreDb, 'matches', matchId), { 'matchState.status': 'completed' });
      Alert.alert('Match Completed', `${wName} wins!`);
    } else {
      syncToFirestore(zeroPoints, nextSets);
    }
  };

  const undo = () => {
    // Basic undo implementation could go here
    Alert.alert('Undo', 'Feature coming soon!');
  };

  const viewerUrl = `${VIEWER_BASE}/match/${sessionCode}`;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}><Text style={s.backText}>← Exit</Text></TouchableOpacity>
        <Text style={s.sportTitle}>{sport.toUpperCase()}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.mainCard}>
          <Text style={s.setsTitle}>SETS: {sets.team1} — {sets.team2}</Text>
          <View style={s.scoreRow}>
            <View style={s.teamBlock}>
              <Text style={s.teamName}>{team1Name}</Text>
              <Text style={s.scoreText}>
                {sportId === 'tennis' ? tennisPoints[tennisIdx.team1] : points.team1}
              </Text>
              {sportId === 'tennis' && <Text style={s.gamesSub}>Games: {points.team1}</Text>}
              <TouchableOpacity style={s.pointBtn} onPress={() => addPoint('team1')}>
                <Text style={s.pointBtnText}>+ POINT</Text>
              </TouchableOpacity>
            </View>
            <View style={s.vsBox}><Text style={s.vsText}>VS</Text></View>
            <View style={s.teamBlock}>
              <Text style={s.teamName}>{team2Name}</Text>
              <Text style={s.scoreText}>
                {sportId === 'tennis' ? tennisPoints[tennisIdx.team2] : points.team2}
              </Text>
              {sportId === 'tennis' && <Text style={s.gamesSub}>Games: {points.team2}</Text>}
              <TouchableOpacity style={[s.pointBtn, { backgroundColor: '#10B981' }]} onPress={() => addPoint('team2')}>
                <Text style={s.pointBtnText}>+ POINT</Text>
              </TouchableOpacity>
            </View>
          </View>
          {winner && (
            <View style={s.winnerBox}>
              <Trophy color="#F59E0B" size={24} />
              <Text style={s.winnerText}>{winner} WINS!</Text>
            </View>
          )}
        </View>

        <View style={s.shareCard}>
          <QRCode value={viewerUrl} size={60} />
          <View style={s.shareInfo}>
            <Text style={s.shareTitle}>Spectator Link</Text>
            <Text style={s.shareCode}>{sessionCode}</Text>
            <TouchableOpacity style={s.shareBtn} onPress={() => {
              Clipboard.setString(viewerUrl);
              Alert.alert('Copied!', 'Link copied to clipboard');
            }}>
              <Share2 color="#0047FF" size={14} />
              <Text style={s.shareBtnText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { width: 60 },
  backText: { color: '#0047FF', fontWeight: '700' },
  sportTitle: { fontSize: 16, fontWeight: '900', color: '#111827', letterSpacing: 2 },
  mainCard: { backgroundColor: '#0047FF', margin: 16, borderRadius: 24, padding: 24, alignItems: 'center' },
  setsTitle: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginBottom: 20 },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  teamBlock: { flex: 1, alignItems: 'center' },
  teamName: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  scoreText: { fontSize: 64, fontWeight: '900', color: '#FFF' },
  gamesSub: { fontSize: 12, color: '#A3E635', fontWeight: '700', marginTop: -8, marginBottom: 12 },
  vsBox: { paddingHorizontal: 10 },
  vsText: { fontSize: 16, color: 'rgba(255,255,255,0.3)', fontWeight: '900' },
  pointBtn: { backgroundColor: '#FFFFFF22', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginTop: 20, width: '100%', alignItems: 'center' },
  pointBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14 },
  winnerBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, backgroundColor: '#FFFFFF22', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30 },
  winnerText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  shareCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', marginHorizontal: 16, borderRadius: 14, padding: 12, marginBottom: 16 },
  shareInfo: { flex: 1, marginLeft: 16 },
  shareTitle: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  shareCode: { fontSize: 18, fontWeight: '900', color: '#111827', letterSpacing: 2 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  shareBtnText: { color: '#0047FF', fontSize: 12, fontWeight: '700' }
});
