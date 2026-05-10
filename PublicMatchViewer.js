import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View, Linking } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { collection, doc, onSnapshot, orderBy, query, where, limit } from 'firebase/firestore';
import { firestoreDb } from './firebaseConfig';
import { computeInningsState } from './cricketScoring';
import { Activity, Download, RefreshCw, Wifi } from 'lucide-react-native';

const defaultTeam = (name) => ({ name, players: ['Player 1', 'Player 2'] });

export default function PublicMatchViewer({ sessionCode }) {
  const [matchId, setMatchId] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'batting' | 'bowling'

  useEffect(() => {
    let q;
    if (sessionCode) {
      const safeCode = sessionCode.trim().toUpperCase();
      q = query(collection(firestoreDb, 'matches'), where('meta.sessionCode', '==', safeCode), limit(1));
    } else {
      // If no session code, fetch the most recent active match
      q = query(collection(firestoreDb, 'matches'), orderBy('meta.updatedAt', 'desc'), limit(1));
    }

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) { 
        setError(sessionCode ? 'No match found for this code.' : 'No active matches right now.'); 
        setLoading(false); 
        return; 
      }
      const d = snap.docs[0];
      setMatchId(d.id);
      setMatchData({ id: d.id, ...d.data() });
      setLastUpdated(new Date());
      setError('');
      setLoading(false);
    }, (err) => { setError(err.message); setLoading(false); });
    return unsub;
  }, [sessionCode]);

  useEffect(() => {
    if (!matchId) return;
    const q = query(collection(doc(firestoreDb, 'matches', matchId), 'deliveries'), orderBy('sequence', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setDeliveries(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) =>
        (a.innings || 1) - (b.innings || 1) || (a.sequence || 0) - (b.sequence || 0) || (a.createdAt || 0) - (b.createdAt || 0)
      ));
      setLastUpdated(new Date());
    });
    return unsub;
  }, [matchId]);

  const teams = useMemo(() => ({
    team1: matchData?.teams?.team1 || defaultTeam('Team 1'),
    team2: matchData?.teams?.team2 || defaultTeam('Team 2'),
  }), [matchData]);

  const firstBattingKey = matchData?.innings?.first?.battingTeamKey || 'team1';
  const firstBowlingKey = matchData?.innings?.first?.bowlingTeamKey || (firstBattingKey === 'team1' ? 'team2' : 'team1');
  const firstSession = useMemo(() => ({
    battingTeam: teams[firstBattingKey] || defaultTeam('Team 1'),
    bowlingTeam: teams[firstBowlingKey] || defaultTeam('Team 2'),
  }), [teams, firstBattingKey, firstBowlingKey]);
  const secondSession = useMemo(() => ({
    battingTeam: teams[firstBowlingKey] || defaultTeam('Team 2'),
    bowlingTeam: teams[firstBattingKey] || defaultTeam('Team 1'),
  }), [teams, firstBattingKey, firstBowlingKey]);

  const firstInnings = useMemo(() => computeInningsState(firstSession, deliveries.filter(d => !d.innings || d.innings === 1)), [firstSession, deliveries]);
  const secondInnings = useMemo(() => computeInningsState(secondSession, deliveries.filter(d => d.innings === 2)), [secondSession, deliveries]);

  const activeInnings = matchData?.innings?.currentInnings === 2 ? 2 : 1;
  const liveInnings = activeInnings === 2 ? secondInnings : firstInnings;
  const liveSession = activeInnings === 2 ? secondSession : firstSession;
  const matchState = matchData?.matchState || {};
  const isCompleted = matchState.status === 'completed';

  if (loading) return (
    <View style={s.centerState}>
      <ActivityIndicator color="#0047FF" size="large" />
      <Text style={s.loadingText}>Finding match {sessionCode}...</Text>
    </View>
  );

  if (error) return (
    <View style={s.centerState}>
      <View style={s.errorBox}>
        <Wifi color="#DC2626" size={40} style={{ marginBottom: 16 }} />
        <Text style={s.errorTitle}>Match Not Found</Text>
        <Text style={s.errorText}>{error}</Text>
      </View>
      <View style={s.installBanner}>
        <Text style={s.installTitle}>🏏 Want to score your own matches?</Text>
        <Text style={s.installDesc}>Download Stadium Live and start scoring in seconds.</Text>
        <TouchableOpacity style={s.installBtn} onPress={() => Linking.openURL('https://expo.dev')}>
          <Download color="#FFF" size={16} />
          <Text style={s.installBtnText}>Get Stadium Live</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      {/* Top Bar */}
      <View style={s.topBar}>
        <View style={s.logoRow}>
          <Activity color="#0047FF" size={22} />
          <Text style={s.logoText}>STADIUM LIVE</Text>
        </View>
        <View style={s.liveRow}>
          {!isCompleted && <View style={s.liveDot} />}
          <Text style={[s.liveText, isCompleted && { color: '#10B981' }]}>{isCompleted ? 'FINAL' : 'LIVE'}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero Score Card */}
        <View style={s.heroCard}>
          {isCompleted && (
            <View style={s.completedBadge}><Text style={s.completedBadgeText}>MATCH COMPLETED</Text></View>
          )}
          <View style={s.teamsRow}>
            <View style={s.teamBlock}>
              <Text style={s.teamName}>{firstSession.battingTeam.name}</Text>
              <Text style={s.teamScore}>{firstInnings.score.runs}/{firstInnings.score.wickets}</Text>
              <Text style={s.teamOvers}>({firstInnings.score.overs} ov)</Text>
            </View>
            <View style={s.vsBox}><Text style={s.vsText}>VS</Text></View>
            <View style={s.teamBlock}>
              <Text style={s.teamName}>{firstSession.bowlingTeam.name}</Text>
              <Text style={s.teamScore}>{secondInnings.score.runs}/{secondInnings.score.wickets}</Text>
              <Text style={s.teamOvers}>({secondInnings.score.overs} ov)</Text>
            </View>
          </View>
          {matchState.winner ? (
            <Text style={s.resultText}>{matchState.winner} won</Text>
          ) : (
            <Text style={s.resultText}>
              {liveSession.battingTeam.name} batting · CRR {liveInnings.score.runRate}
            </Text>
          )}
          {lastUpdated && (
            <View style={s.updatedRow}>
              <RefreshCw color="#6B7280" size={10} />
              <Text style={s.updatedText}>Updated {lastUpdated.toLocaleTimeString()}</Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          {['live', 'batting', 'bowling'].map(tab => (
            <TouchableOpacity key={tab} style={[s.tab, activeTab === tab && s.tabActive]} onPress={() => setActiveTab(tab)}>
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'live' && (
          <View>
            {/* Current Batter */}
            <Text style={s.sectionHeader}>ON STRIKE</Text>
            <View style={s.playerCard}>
              <View style={s.playerAvatarBlue}><Text style={s.playerAvatarText}>{liveInnings.currentBatsmen[0]?.name?.[0] || '?'}</Text></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.playerCardName}>{liveInnings.currentBatsmen[0]?.name || '—'} *</Text>
                <Text style={s.playerCardRole}>Striker</Text>
              </View>
              <Text style={s.playerCardStat}>{liveInnings.currentBatsmen[0]?.runs || 0} <Text style={s.playerCardBalls}>({liveInnings.currentBatsmen[0]?.balls || 0})</Text></Text>
            </View>

            {/* Current Bowler */}
            <Text style={s.sectionHeader}>BOWLING</Text>
            <View style={s.playerCard}>
              <View style={s.playerAvatarGreen}><Text style={s.playerAvatarText}>{liveInnings.currentBowler?.name?.[0] || '?'}</Text></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.playerCardName}>{liveInnings.currentBowler?.name || '—'}</Text>
                <Text style={s.playerCardRole}>Bowler</Text>
              </View>
              <Text style={[s.playerCardStat, { color: '#10B981' }]}>{liveInnings.currentBowler?.wickets || 0}/{liveInnings.currentBowler?.runs || 0}</Text>
            </View>

            {/* This over */}
            <Text style={s.sectionHeader}>BALL-BY-BALL</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.timeline}>
              {liveInnings.timeline.slice(-12).map((ball) => (
                <View key={ball.id} style={[s.ball, ball.isWicket && s.ballWicket, (ball.runs === 4 || ball.runs === 6) && s.ballBoundary]}>
                  <Text style={[s.ballText, ball.isWicket && { color: '#DC2626' }, (ball.runs === 4 || ball.runs === 6) && { color: '#0047FF' }]}>{ball.label}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Extras */}
            <Text style={s.sectionHeader}>EXTRAS</Text>
            <View style={s.extrasCard}>
              <View style={s.extraItem}><Text style={s.extraLabel}>Wide</Text><Text style={s.extraValue}>{liveInnings.extras.wide}</Text></View>
              <View style={s.extraItem}><Text style={s.extraLabel}>No Ball</Text><Text style={s.extraValue}>{liveInnings.extras.noBall}</Text></View>
              <View style={s.extraItem}><Text style={s.extraLabel}>Bye</Text><Text style={s.extraValue}>{liveInnings.extras.bye}</Text></View>
              <View style={s.extraItem}><Text style={s.extraLabel}>Leg Bye</Text><Text style={s.extraValue}>{liveInnings.extras.legBye}</Text></View>
              <View style={[s.extraItem, { borderRightWidth: 0 }]}><Text style={[s.extraLabel, { color: '#0047FF', fontWeight: '800' }]}>Total</Text><Text style={[s.extraValue, { color: '#0047FF', fontWeight: '900' }]}>{liveInnings.extras.total}</Text></View>
            </View>
          </View>
        )}

        {activeTab === 'batting' && (
          <View>
            <Text style={s.sectionHeader}>BATTING - {liveSession.battingTeam.name.toUpperCase()}</Text>
            <View style={s.tableCard}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.th, { flex: 3 }]}>Batter</Text>
                <Text style={s.th}>R</Text>
                <Text style={s.th}>B</Text>
                <Text style={s.th}>4s</Text>
                <Text style={s.th}>6s</Text>
                <Text style={s.th}>SR</Text>
              </View>
              {liveInnings.battingStats.map((b, i) => (
                <View key={i} style={s.tableDataRow}>
                  <View style={{ flex: 3 }}>
                    <Text style={s.tdBlue}>{b.name}{b.status === 'notOut' ? ' *' : ''}</Text>
                    <Text style={s.tdSub}>{b.status === 'notOut' ? 'not out' : 'out'}</Text>
                  </View>
                  <Text style={s.tdBold}>{b.runs}</Text>
                  <Text style={s.td}>{b.balls}</Text>
                  <Text style={s.td}>{b.fours}</Text>
                  <Text style={s.td}>{b.sixes}</Text>
                  <Text style={s.td}>{b.strikeRate}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'bowling' && (
          <View>
            <Text style={s.sectionHeader}>BOWLING - {liveSession.bowlingTeam.name.toUpperCase()}</Text>
            <View style={s.tableCard}>
              <View style={s.tableHeaderRow}>
                <Text style={[s.th, { flex: 2 }]}>Bowler</Text>
                <Text style={s.th}>O</Text>
                <Text style={s.th}>R</Text>
                <Text style={s.th}>W</Text>
                <Text style={s.th}>Eco</Text>
              </View>
              {liveInnings.bowlingStats.map((b, i) => (
                <View key={i} style={s.tableDataRow}>
                  <Text style={[s.tdBlue, { flex: 2 }]}>{b.name}</Text>
                  <Text style={s.td}>{b.overs}</Text>
                  <Text style={s.td}>{b.runs}</Text>
                  <Text style={s.tdBold}>{b.wickets}</Text>
                  <Text style={s.td}>{b.economy}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* App Install CTA Banner */}
        <View style={s.installBanner}>
          <Text style={s.installTitle}>🏏 Want to score your own matches?</Text>
          <Text style={s.installDesc}>Download Stadium Live — the professional cricket scoring app. Free to use.</Text>
          <TouchableOpacity style={s.installBtn} onPress={() => Linking.openURL('https://expo.dev')}>
            <Download color="#FFF" size={16} />
            <Text style={s.installBtnText}>Get Stadium Live — It's Free</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 16, fontWeight: '900', color: '#0047FF', letterSpacing: 1 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
  liveText: { fontSize: 11, fontWeight: '800', color: '#DC2626', letterSpacing: 1 },
  scroll: { flex: 1 },
  heroCard: { backgroundColor: '#FFFFFF', margin: 16, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  completedBadge: { backgroundColor: '#D1FAE5', alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, marginBottom: 16 },
  completedBadgeText: { color: '#065F46', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  teamBlock: { flex: 1, alignItems: 'center' },
  teamName: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 4 },
  teamScore: { fontSize: 40, fontWeight: '900', color: '#0047FF', letterSpacing: -1 },
  teamOvers: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', marginTop: 2 },
  vsBox: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  vsText: { fontSize: 12, fontWeight: '800', color: '#9CA3AF' },
  resultText: { textAlign: 'center', fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 8 },
  updatedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  updatedText: { fontSize: 11, color: '#9CA3AF' },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#E5E7EB', borderRadius: 10, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#0047FF', fontWeight: '800' },
  sectionHeader: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1, marginBottom: 8, marginHorizontal: 16 },
  playerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
  playerAvatarBlue: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0047FF', alignItems: 'center', justifyContent: 'center' },
  playerAvatarGreen: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  playerAvatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  playerCardName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  playerCardRole: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  playerCardStat: { fontSize: 22, fontWeight: '900', color: '#0047FF' },
  playerCardBalls: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  timeline: { paddingHorizontal: 16, marginBottom: 16 },
  ball: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  ballWicket: { backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#DC2626' },
  ballBoundary: { backgroundColor: '#EEF2FF', borderWidth: 1.5, borderColor: '#0047FF' },
  ballText: { fontSize: 16, fontWeight: '900', color: '#111827' },
  extrasCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
  extraItem: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRightWidth: 1, borderRightColor: '#F3F4F6' },
  extraLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', marginBottom: 4 },
  extraValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  tableCard: { backgroundColor: '#FFFFFF', marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', marginBottom: 24 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 10 },
  th: { flex: 1, fontSize: 11, fontWeight: '800', color: '#9CA3AF', textAlign: 'right' },
  tableDataRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', alignItems: 'center' },
  tdBlue: { fontSize: 14, fontWeight: '600', color: '#0047FF' },
  tdSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  tdBold: { flex: 1, fontSize: 15, fontWeight: '900', color: '#111827', textAlign: 'right' },
  td: { flex: 1, fontSize: 13, color: '#4B5563', textAlign: 'right' },
  installBanner: { backgroundColor: '#0047FF', margin: 16, borderRadius: 20, padding: 24, alignItems: 'center' },
  installTitle: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  installDesc: { fontSize: 13, color: '#A5B4FC', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  installBtn: { backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 50, gap: 8 },
  installBtnText: { color: '#0047FF', fontWeight: '800', fontSize: 14 },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 24 },
  loadingText: { color: '#6B7280', marginTop: 16, fontSize: 16 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 24, alignItems: 'center', width: '100%' },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
});
