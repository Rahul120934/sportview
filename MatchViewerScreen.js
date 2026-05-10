import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';
import { collection, doc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { firestoreDb } from './firebaseConfig';
import { computeInningsState } from './cricketScoring';
import { Activity, Target, History as HistoryIcon, ScanLine, ArrowLeftRight } from 'lucide-react-native';

const defaultTeam = (name) => ({ name, players: ['Player 1', 'Player 2'] });

// Mock Wagon Wheel Data
const WAGON_WHEEL_LINES = [
  { x2: 20, y2: 60, type: '1s' },
  { x2: 180, y2: 20, type: '1s' },
  { x2: 200, y2: 120, type: '1s' },
  { x2: 230, y2: 220, type: '4s' },
  { x2: 140, y2: 250, type: '6s' },
  { x2: 80, y2: 280, type: '6s' },
  { x2: 10, y2: 150, type: '4s' },
];

export default function MatchViewerScreen({ sessionCode, onBack }) {
  const [matchId, setMatchId] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Custom View State
  const [activeTab, setActiveTab] = useState('scorecard'); // 'scorecard' | 'analytics'
  const [wagonViewAs, setWagonViewAs] = useState('batter');

  useEffect(() => {
    const safeCode = sessionCode?.trim().toUpperCase();
    if (!safeCode) {
      setError('Enter a valid session code.');
      setLoading(false);
      return;
    }
    const matchesQuery = query(collection(firestoreDb, 'matches'), where('meta.sessionCode', '==', safeCode), limit(1));
    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      if (snapshot.empty) {
        setError('No live session found for this code.');
        setLoading(false);
        return;
      }
      const matchDoc = snapshot.docs[0];
      setMatchId(matchDoc.id);
      setMatchData({ id: matchDoc.id, ...matchDoc.data() });
      setError('');
      setLoading(false);
    }, (err) => { setError(err.message); setLoading(false); });
    return unsubscribe;
  }, [sessionCode]);

  useEffect(() => {
    if (!matchId) return;
    const deliveriesQuery = query(collection(doc(firestoreDb, 'matches', matchId), 'deliveries'), orderBy('sequence', 'asc'));
    const unsubscribe = onSnapshot(deliveriesQuery, (snapshot) => {
      setDeliveries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.innings || 1) - (b.innings || 1) || (a.sequence || 0) - (b.sequence || 0) || (a.createdAt || 0) - (b.createdAt || 0)));
    });
    return unsubscribe;
  }, [matchId]);

  const teams = useMemo(() => ({ team1: matchData?.teams?.team1 || defaultTeam('Team 1'), team2: matchData?.teams?.team2 || defaultTeam('Team 2') }), [matchData]);
  const firstBattingKey = matchData?.innings?.first?.battingTeamKey || 'team1';
  const firstBowlingKey = matchData?.innings?.first?.bowlingTeamKey || (firstBattingKey === 'team1' ? 'team2' : 'team1');
  const firstSession = useMemo(() => ({ battingTeam: teams[firstBattingKey] || defaultTeam('Team 1'), bowlingTeam: teams[firstBowlingKey] || defaultTeam('Team 2') }), [teams, firstBattingKey, firstBowlingKey]);
  const secondSession = useMemo(() => ({ battingTeam: teams[firstBowlingKey] || defaultTeam('Team 2'), bowlingTeam: teams[firstBattingKey] || defaultTeam('Team 1') }), [teams, firstBattingKey, firstBowlingKey]);

  const firstInnings = useMemo(() => computeInningsState(firstSession, deliveries.filter((d) => !d.innings || d.innings === 1)), [firstSession, deliveries]);
  const secondInnings = useMemo(() => computeInningsState(secondSession, deliveries.filter((d) => d.innings === 2)), [secondSession, deliveries]);

  const activeInnings = matchData?.innings?.currentInnings === 2 ? 2 : 1;
  const liveInnings = activeInnings === 2 ? secondInnings : firstInnings;
  const liveSession = activeInnings === 2 ? secondSession : firstSession;
  const matchState = matchData?.matchState || {};
  const isCompleted = matchState.status === 'completed';

  const renderTopBar = () => (
    <View style={styles.topBarContainer}>
      <View style={styles.logoRow}>
        <Activity color="#0047FF" size={24} />
        <Text style={styles.logoText}>STADIUM LIVE</Text>
      </View>
      <View style={styles.avatar}><Text style={styles.avatarText}>R</Text></View>
    </View>
  );

  const renderScorecard = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Banner Card */}
      <View style={styles.bannerCard}>
        <View style={styles.badgeWrap}>
          <Text style={isCompleted ? styles.badgeCompleted : styles.badgeLive}>{isCompleted ? 'MATCH COMPLETED' : 'LIVE MATCH'}</Text>
        </View>
        <View style={styles.scoreRow}>
          <View style={styles.teamScoreCol}>
             <Text style={styles.teamCode}>{firstBattingKey === 'team1' ? 'IND' : 'AUS'}</Text>
             <Text style={styles.teamBigScore}>{firstInnings.score.runs}/{firstInnings.score.wickets}</Text>
             <Text style={styles.teamOvers}>{firstInnings.score.overs} OV</Text>
          </View>
          <View style={styles.vsBox}><Text style={styles.vsText}>VS</Text></View>
          <View style={styles.teamScoreCol}>
             <Text style={styles.teamCode}>{firstBattingKey === 'team1' ? 'AUS' : 'IND'}</Text>
             <Text style={styles.teamBigScore}>{secondInnings.score.runs}/{secondInnings.score.wickets}</Text>
             <Text style={styles.teamOvers}>{secondInnings.score.overs} OV</Text>
          </View>
        </View>
        <Text style={styles.resultText}>{matchState.winner ? `${matchState.winner} won` : 'Match in progress'}</Text>
      </View>

      {/* Batting Table */}
      <Text style={styles.tableTitle}>Batting - {firstBattingKey === 'team1' ? 'IND' : 'AUS'}</Text>
      <View style={styles.tableCard}>
        <View style={styles.tableHeaderRow}>
           <Text style={[styles.thText, { flex: 3 }]}>Batter</Text>
           <Text style={styles.thText}>R</Text>
           <Text style={styles.thText}>B</Text>
        </View>
        {firstInnings.battingStats.map((b, i) => (
          <View key={i} style={styles.tableDataRow}>
             <View style={{ flex: 3 }}>
                <Text style={styles.tdName}>{b.name} {b.status === 'notOut' ? '*' : ''}</Text>
                {b.status === 'out' && <Text style={styles.tdSub}>c Smith b Starc</Text>}
                {b.status === 'notOut' && <Text style={styles.tdSub}>not out</Text>}
             </View>
             <Text style={styles.tdBold}>{b.runs}</Text>
             <Text style={styles.tdText}>{b.balls}</Text>
          </View>
        ))}
        <View style={styles.extrasRow}>
           <Text style={styles.extrasText}>Extras <Text style={{color: '#4B5563', fontWeight: 'normal'}}>21 (b 2, lb 4, w 14, nb 1)</Text></Text>
           <View style={{alignItems: 'flex-end'}}>
             <Text style={styles.totalText}>Total <Text style={{color: '#111827', fontWeight: '900'}}>{firstInnings.score.runs}/{firstInnings.score.wickets}</Text></Text>
             <Text style={styles.totalOvers}>({firstInnings.score.overs} Ov)</Text>
           </View>
        </View>
      </View>

      {/* Bowling Table */}
      <Text style={styles.tableTitle}>Bowling - {firstBowlingKey === 'team2' ? 'AUS' : 'IND'}</Text>
      <View style={styles.tableCard}>
        <View style={styles.tableHeaderRow}>
           <Text style={[styles.thText, { flex: 3 }]}>Bowler</Text>
           <Text style={styles.thText}>O</Text>
           <Text style={styles.thText}>M</Text>
        </View>
        {firstInnings.bowlingStats.map((b, i) => (
          <View key={i} style={styles.tableDataRow}>
             <Text style={[styles.tdName, { flex: 3 }]}>{b.name}</Text>
             <Text style={styles.tdText}>{b.overs}</Text>
             <Text style={styles.tdText}>0</Text>
          </View>
        ))}
      </View>
      <View style={{height: 100}} />
    </ScrollView>
  );

  const renderWagonWheel = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.wagonTitle}>Wagon Wheel</Text>
      <Text style={styles.wagonSub}>IND vs AUS - 2nd T20I</Text>
      
      <View style={styles.wagonToggleCard}>
         <Text style={styles.wagonToggleLabel}>VIEW AS</Text>
         <View style={styles.wagonToggleWrap}>
            <TouchableOpacity style={[styles.wagonToggleBtn, wagonViewAs === 'batter' && styles.wagonToggleActive]} onPress={() => setWagonViewAs('batter')}>
              <Text style={[styles.wagonToggleText, wagonViewAs === 'batter' && styles.wagonToggleTextActive]}>Batter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.wagonToggleBtn, wagonViewAs === 'bowler' && styles.wagonToggleActive]} onPress={() => setWagonViewAs('bowler')}>
              <Text style={[styles.wagonToggleText, wagonViewAs === 'bowler' && styles.wagonToggleTextActive]}>Bowler</Text>
            </TouchableOpacity>
         </View>
      </View>

      <View style={styles.wagonPlayerCard}>
         <View style={styles.wagonAvatar}><Text style={styles.wagonAvatarText}>V</Text></View>
         <View style={{flex: 1, marginLeft: 12}}>
            <Text style={styles.wagonPlayerName}>V. Kohli</Text>
            <Text style={styles.wagonPlayerRole}>Right-Hand Bat</Text>
         </View>
         <TouchableOpacity style={styles.wagonSwitchBtn}>
            <ArrowLeftRight color="#0047FF" size={16} />
         </TouchableOpacity>
      </View>

      <View style={styles.wagonVizCard}>
         <View style={styles.wagonLegendBox}>
            <View style={styles.legendRow}><View style={[styles.legendDot, {backgroundColor: '#374151'}]}/><Text style={styles.legendText}>1s & 2s</Text></View>
            <View style={styles.legendRow}><View style={[styles.legendDot, {backgroundColor: '#0047FF'}]}/><Text style={styles.legendText}>4s</Text></View>
            <View style={styles.legendRow}><View style={[styles.legendDot, {backgroundColor: '#059669'}]}/><Text style={styles.legendText}>6s</Text></View>
         </View>
         
         <View style={styles.svgContainer}>
           <Svg height="260" width="260" viewBox="0 0 260 260">
             <Circle cx="130" cy="130" r="120" stroke="#D1D5DB" strokeWidth="2" fill="none" />
             <Rect x="120" y="100" width="20" height="60" fill="#E5E7EB" stroke="#D1D5DB" strokeWidth="1" />
             
             {WAGON_WHEEL_LINES.map((line, idx) => {
               const color = line.type === '1s' ? '#374151' : line.type === '4s' ? '#0047FF' : '#059669';
               const strokeW = line.type === '1s' ? 1.5 : 3;
               return <Line key={idx} x1="130" y1="130" x2={line.x2} y2={line.y2} stroke={color} strokeWidth={strokeW} />
             })}
           </Svg>
         </View>
      </View>

      <View style={styles.statsPanel}>
        <Text style={styles.statsPanelTitle}>RUN DISTRIBUTION</Text>
        <View style={styles.barRow}>
           <Text style={styles.barLabel}>Off Side</Text>
           <Text style={styles.barValue}>42</Text>
        </View>
        <View style={styles.barBg}><View style={[styles.barFill, {width: '60%', backgroundColor: '#0047FF'}]} /></View>
        
        <View style={styles.barRow}>
           <Text style={styles.barLabel}>Leg Side</Text>
           <Text style={styles.barValue}>34</Text>
        </View>
        <View style={styles.barBg}><View style={[styles.barFill, {width: '45%', backgroundColor: '#059669'}]} /></View>
      </View>

      <View style={styles.statsPanel}>
         <Text style={styles.statsPanelTitle}>BOUNDARY BREAKDOWN</Text>
         <View style={styles.boundaryGrid}>
            <View style={styles.boundaryCard}>
               <Text style={styles.boundaryLabel}>Fours (4s)</Text>
               <Text style={styles.boundaryValue}>6</Text>
               <Text style={styles.boundarySub}>24 Runs</Text>
            </View>
            <View style={styles.boundaryCard}>
               <Text style={styles.boundaryLabel}>Sixes (6s)</Text>
               <Text style={[styles.boundaryValue, {color: '#059669'}]}>3</Text>
               <Text style={styles.boundarySub}>18 Runs</Text>
            </View>
         </View>
         <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Runs</Text>
            <Text style={styles.totalValBig}>76</Text>
         </View>
      </View>

      <View style={{height: 100}} />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {renderTopBar()}
      
      <View style={styles.tabHeaderRow}>
        <TouchableOpacity style={[styles.tabHeaderBtn, activeTab === 'scorecard' && styles.tabHeaderActive]} onPress={() => setActiveTab('scorecard')}>
          <Text style={[styles.tabHeaderText, activeTab === 'scorecard' && styles.tabHeaderTextActive]}>Scorecard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabHeaderBtn, activeTab === 'analytics' && styles.tabHeaderActive]} onPress={() => setActiveTab('analytics')}>
          <Text style={[styles.tabHeaderText, activeTab === 'analytics' && styles.tabHeaderTextActive]}>Analytics</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerState}><ActivityIndicator color="#0047FF" /></View>
      ) : error ? (
        <View style={styles.centerState}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        activeTab === 'scorecard' ? renderScorecard() : renderWagonWheel()
      )}

      {/* Fake Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <View style={styles.tabItem}>
          <Target color="#0047FF" size={20} />
          <Text style={styles.tabTextActive}>Scoring</Text>
        </View>
        <TouchableOpacity onPress={onBack} style={styles.tabItem}>
          <HistoryIcon color="#6B7280" size={20} />
          <Text style={styles.tabText}>History</Text>
        </TouchableOpacity>
        <View style={styles.tabItem}>
          <ScanLine color="#6B7280" size={20} />
          <Text style={styles.tabText}>Viewer</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  topBarContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingTop: 20 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 18, fontWeight: '900', color: '#0047FF', letterSpacing: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: 'bold' },
  tabHeaderRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tabHeaderBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabHeaderActive: { borderBottomColor: '#0047FF' },
  tabHeaderText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabHeaderTextActive: { color: '#0047FF', fontWeight: '800' },
  scrollContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  bannerCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  badgeWrap: { marginBottom: 16 },
  badgeCompleted: { backgroundColor: '#059669', color: '#FFF', fontSize: 10, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, letterSpacing: 0.5 },
  badgeLive: { backgroundColor: '#DC2626', color: '#FFF', fontSize: 10, fontWeight: '800', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, letterSpacing: 0.5 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', marginBottom: 16 },
  teamScoreCol: { alignItems: 'center', flex: 1 },
  teamCode: { fontSize: 24, fontWeight: '900', color: '#0047FF' },
  teamBigScore: { fontSize: 40, fontWeight: '900', color: '#111827', letterSpacing: -1 },
  teamOvers: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  vsBox: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginHorizontal: 16 },
  vsText: { fontSize: 12, fontWeight: '800', color: '#9CA3AF' },
  resultText: { fontSize: 16, color: '#0047FF', fontWeight: '600' },
  tableTitle: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 12 },
  tableCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 24, overflow: 'hidden' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F9FAFB', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  thText: { flex: 1, fontSize: 13, fontWeight: '800', color: '#4B5563', textAlign: 'right' },
  tableDataRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
  tdName: { fontSize: 15, fontWeight: '600', color: '#0047FF' },
  tdSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  tdBold: { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827', textAlign: 'right' },
  tdText: { flex: 1, fontSize: 15, color: '#4B5563', textAlign: 'right' },
  extrasRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#F9FAFB' },
  extrasText: { fontSize: 13, fontWeight: '700', color: '#111827' },
  totalText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  totalOvers: { fontSize: 12, fontWeight: '800', color: '#111827' },
  wagonTitle: { fontSize: 32, fontWeight: '900', color: '#111827', textAlign: 'center', marginBottom: 4 },
  wagonSub: { fontSize: 14, color: '#4B5563', textAlign: 'center', marginBottom: 24 },
  wagonToggleCard: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, marginBottom: 16 },
  wagonToggleLabel: { fontSize: 12, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 8, letterSpacing: 0.5 },
  wagonToggleWrap: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 20, padding: 4 },
  wagonToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 16 },
  wagonToggleActive: { backgroundColor: '#0047FF' },
  wagonToggleText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  wagonToggleTextActive: { color: '#FFF' },
  wagonPlayerCard: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  wagonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#0047FF', alignItems: 'center', justifyContent: 'center' },
  wagonAvatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  wagonPlayerName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  wagonPlayerRole: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  wagonSwitchBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0047FF', alignItems: 'center', justifyContent: 'center' },
  wagonVizCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 24, alignItems: 'center' },
  wagonLegendBox: { position: 'absolute', top: 16, left: 16, backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8, zIndex: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 10, fontWeight: '700', color: '#111827' },
  svgContainer: { marginTop: 20 },
  statsPanel: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, marginBottom: 16 },
  statsPanelTitle: { fontSize: 12, fontWeight: '800', color: '#111827', marginBottom: 16, letterSpacing: 0.5 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { fontSize: 14, color: '#4B5563' },
  barValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
  barBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 16 },
  barFill: { height: '100%', borderRadius: 4 },
  boundaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  boundaryCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 8, padding: 12, alignItems: 'center' },
  boundaryLabel: { fontSize: 11, fontWeight: '700', color: '#111827', marginBottom: 4 },
  boundaryValue: { fontSize: 24, fontWeight: '900', color: '#0047FF' },
  boundarySub: { fontSize: 10, color: '#4B5563' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16 },
  totalLabel: { fontSize: 14, color: '#4B5563' },
  totalValBig: { fontSize: 48, fontWeight: '900', color: '#111827', letterSpacing: -2 },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 20 },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabText: { fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  tabTextActive: { fontSize: 12, color: '#0047FF', marginTop: 4, fontWeight: '600' },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#DC2626', fontWeight: 'bold' }
});
