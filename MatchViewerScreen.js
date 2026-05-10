import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { firestoreDb } from './firebaseConfig';
import { computeInningsState } from './cricketScoring';

const defaultTeam = (name) => ({
  name,
  players: ['Player 1', 'Player 2'],
});

function StatRow({ left, middle, right }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statName}>{left}</Text>
      <Text style={styles.statValue}>{middle}</Text>
      <Text style={styles.statValue}>{right}</Text>
    </View>
  );
}

export default function MatchViewerScreen({ sessionCode, onBack }) {
  const [matchId, setMatchId] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const safeCode = sessionCode?.trim().toUpperCase();
    if (!safeCode) {
      setError('Enter a valid session code.');
      setLoading(false);
      return;
    }

    const matchesQuery = query(
      collection(firestoreDb, 'matches'),
      where('meta.sessionCode', '==', safeCode),
      limit(1)
    );

    const unsubscribe = onSnapshot(
      matchesQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setMatchId(null);
          setMatchData(null);
          setDeliveries([]);
          setError('No live session found for this code.');
          setLoading(false);
          return;
        }

        const matchDoc = snapshot.docs[0];
        setMatchId(matchDoc.id);
        setMatchData({ id: matchDoc.id, ...matchDoc.data() });
        setError('');
        setLoading(false);
      },
      (queryError) => {
        setError(queryError.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [sessionCode]);

  useEffect(() => {
    if (!matchId) return;

    const deliveriesQuery = query(
      collection(doc(firestoreDb, 'matches', matchId), 'deliveries'),
      orderBy('sequence', 'asc')
    );

    const unsubscribe = onSnapshot(
      deliveriesQuery,
      (snapshot) => {
        const nextDeliveries = snapshot.docs
          .map((deliveryDoc) => ({
            id: deliveryDoc.id,
            ...deliveryDoc.data(),
          }))
          .sort(
            (a, b) =>
              (a.innings || 1) - (b.innings || 1) ||
              (a.sequence || 0) - (b.sequence || 0) ||
              (a.createdAt || 0) - (b.createdAt || 0)
          );
        setDeliveries(nextDeliveries);
      },
      (deliveryError) => {
        setError(deliveryError.message);
      }
    );

    return unsubscribe;
  }, [matchId]);

  const teams = useMemo(
    () => ({
      team1: matchData?.teams?.team1 || defaultTeam('Team 1'),
      team2: matchData?.teams?.team2 || defaultTeam('Team 2'),
    }),
    [matchData?.teams?.team1, matchData?.teams?.team2]
  );

  const firstBattingKey = matchData?.innings?.first?.battingTeamKey || 'team1';
  const firstBowlingKey =
    matchData?.innings?.first?.bowlingTeamKey || (firstBattingKey === 'team1' ? 'team2' : 'team1');
  const secondBattingKey = firstBowlingKey;
  const secondBowlingKey = firstBattingKey;

  const firstSession = useMemo(
    () => ({
      battingTeam: teams[firstBattingKey] || defaultTeam('Team 1'),
      bowlingTeam: teams[firstBowlingKey] || defaultTeam('Team 2'),
    }),
    [teams, firstBattingKey, firstBowlingKey]
  );

  const secondSession = useMemo(
    () => ({
      battingTeam: teams[secondBattingKey] || defaultTeam('Team 2'),
      bowlingTeam: teams[secondBowlingKey] || defaultTeam('Team 1'),
    }),
    [teams, secondBattingKey, secondBowlingKey]
  );

  const firstInnings = useMemo(
    () => computeInningsState(firstSession, deliveries.filter((delivery) => !delivery.innings || delivery.innings === 1)),
    [firstSession, deliveries]
  );
  const secondInnings = useMemo(
    () => computeInningsState(secondSession, deliveries.filter((delivery) => delivery.innings === 2)),
    [secondSession, deliveries]
  );

  const activeInnings = matchData?.innings?.currentInnings === 2 ? 2 : 1;
  const liveInnings = activeInnings === 2 ? secondInnings : firstInnings;
  const liveSession = activeInnings === 2 ? secondSession : firstSession;
  const matchState = matchData?.matchState || {};

  const renderInningsSummary = (label, session, innings) => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{label}</Text>
      <Text style={styles.teamLine}>{session.battingTeam.name} batting</Text>
      <Text style={styles.bigScore}>{innings.score.runs}/{innings.score.wickets}</Text>
      <Text style={styles.metaText}>Overs {innings.score.overs} | Run rate {innings.score.runRate}</Text>
      <Text style={styles.metaText}>Extras {innings.extras.total} | Partnership {innings.partnership.runs} ({innings.partnership.balls})</Text>
    </View>
  );

  const renderBattingStats = (innings) => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Batting</Text>
      {innings.battingStats.map((player) => (
        <StatRow
          key={player.name}
          left={`${player.name}${player.status === 'out' ? '' : ' *'}`}
          middle={`${player.runs} (${player.balls})`}
          right={`SR ${player.strikeRate}`}
        />
      ))}
    </View>
  );

  const renderBowlingStats = (innings) => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Bowling</Text>
      {innings.bowlingStats.map((player) => (
        <StatRow
          key={player.name}
          left={player.name}
          middle={`${player.overs} ov`}
          right={`${player.runs}/${player.wickets}`}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.topBar}>SESSION VIEWER</Text>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Text style={styles.backText}>Back to Menu</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.centerText}>Finding session {sessionCode}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.scoreCard}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.sessionCode}>Code: {matchData?.meta?.sessionCode || sessionCode}</Text>
              <View style={{ marginTop: 4, padding: 8, backgroundColor: '#fff', borderRadius: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
                <QRCode
                  value={`https://sportviewviewer.web.app/match/${matchData?.meta?.sessionCode || sessionCode}`}
                  size={80}
                />
              </View>
            </View>
            <Text style={styles.matchTitle}>{teams.team1.name} vs {teams.team2.name}</Text>
            <Text style={styles.metaText}>Status: {(matchState.status || 'live').toUpperCase()}</Text>
            <Text style={styles.teamLine}>{liveSession.battingTeam.name} batting now</Text>
            <Text style={styles.bigScore}>{liveInnings.score.runs}/{liveInnings.score.wickets}</Text>
            <Text style={styles.metaText}>Overs {liveInnings.score.overs} / {matchData?.config?.overs || 20}</Text>
            {activeInnings === 2 ? (
              <Text style={styles.targetText}>
                Target {firstInnings.score.runs + 1} | Need {matchState.runsRequired ?? 0} from {matchState.ballsRemaining ?? 0}
              </Text>
            ) : null}
            {matchState.winner ? <Text style={styles.winnerText}>Winner: {matchState.winner}</Text> : null}
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Batsmen</Text>
              <Text style={styles.infoValue}>{liveInnings.currentBatsmen[0]?.name || '-'}</Text>
              <Text style={styles.infoValue}>{liveInnings.currentBatsmen[1]?.name || '-'}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Bowler</Text>
              <Text style={styles.infoValue}>{liveInnings.currentBowler?.name || '-'}</Text>
              <Text style={styles.infoSubValue}>
                {liveInnings.currentBowler?.overs || '0.0'} | {liveInnings.currentBowler?.runs || 0}/{liveInnings.currentBowler?.wickets || 0}
              </Text>
            </View>
          </View>

          {renderInningsSummary('First Innings', firstSession, firstInnings)}
          {activeInnings === 2 || secondInnings.score.legalBalls > 0
            ? renderInningsSummary('Second Innings', secondSession, secondInnings)
            : null}
          {renderBattingStats(liveInnings)}
          {renderBowlingStats(liveInnings)}

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Ball Timeline</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {liveInnings.timeline.length === 0 ? (
                <Text style={styles.metaText}>No balls yet</Text>
              ) : (
                liveInnings.timeline.map((ball) => (
                  <View key={ball.id} style={[styles.timelineBall, ball.isWicket && styles.wicketBall]}>
                    <Text style={styles.timelineBallText}>{ball.label}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    paddingTop: 18,
  },
  topBar: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginTop: 12,
  },
  backText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    flex: 1,
  },
  scoreCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  sessionCode: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  matchTitle: {
    color: '#4B5563',
    fontSize: 15,
    marginBottom: 6,
    fontWeight: '600',
  },
  teamLine: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  bigScore: {
    color: '#1D4ED8',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 4,
  },
  metaText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  targetText: {
    color: '#D97706',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '700',
  },
  winnerText: {
    color: '#2563EB',
    marginTop: 8,
    fontWeight: '800',
    fontSize: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  infoBlock: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  infoLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  infoSubValue: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  panel: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  panelTitle: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingVertical: 10,
  },
  statName: {
    flex: 1.4,
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  statValue: {
    flex: 1,
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'right',
    fontWeight: '600',
  },
  timelineBall: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 18,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  wicketBall: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  timelineBallText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 14,
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  centerText: {
    color: '#6B7280',
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
});
