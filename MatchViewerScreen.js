import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
          <ActivityIndicator color="#00FF87" />
          <Text style={styles.centerText}>Finding session {sessionCode}</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.scoreCard}>
            <Text style={styles.sessionCode}>Code: {matchData?.meta?.sessionCode || sessionCode}</Text>
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
    backgroundColor: '#0D0D0D',
    padding: 12,
    paddingTop: 18,
  },
  topBar: {
    color: '#666',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  backText: {
    color: '#00FF87',
    fontSize: 13,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  scoreCard: {
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#131313',
  },
  sessionCode: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  matchTitle: {
    color: '#AAA',
    fontSize: 14,
    marginBottom: 5,
  },
  teamLine: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 5,
  },
  bigScore: {
    color: '#00FF87',
    fontSize: 34,
    fontWeight: 'bold',
    marginTop: 3,
  },
  metaText: {
    color: '#DDD',
    fontSize: 12,
    marginTop: 3,
  },
  targetText: {
    color: '#FFD700',
    fontSize: 12,
    marginTop: 6,
    fontWeight: 'bold',
  },
  winnerText: {
    color: '#00FF87',
    marginTop: 6,
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  infoBlock: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#111',
  },
  infoLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 5,
  },
  infoValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 3,
  },
  infoSubValue: {
    color: '#AAA',
    fontSize: 11,
    marginTop: 3,
  },
  panel: {
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#111',
    marginBottom: 8,
  },
  panelTitle: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#202020',
    paddingVertical: 7,
  },
  statName: {
    flex: 1.4,
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statValue: {
    flex: 1,
    color: '#CCC',
    fontSize: 11,
    textAlign: 'right',
  },
  timelineBall: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  wicketBall: {
    borderColor: '#e94560',
    backgroundColor: '#35151b',
  },
  timelineBallText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centerText: {
    color: '#AAA',
    marginTop: 12,
  },
  errorText: {
    color: '#ff7b8d',
    textAlign: 'center',
    fontSize: 15,
  },
});
