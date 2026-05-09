import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
} from 'react-native';
import { onValue, ref, set } from 'firebase/database';
import { database } from './firebaseConfig';
import { computeInningsState, createDeliveryEvent } from './cricketScoring';

const scoringButtons = [
  { label: '0', type: 'run', value: 0 },
  { label: '1', type: 'run', value: 1 },
  { label: '2', type: 'run', value: 2 },
  { label: '3', type: 'run', value: 3 },
  { label: '4', type: 'run', value: 4 },
  { label: '6', type: 'run', value: 6 },
  { label: 'Wide', type: 'wide' },
  { label: 'No Ball', type: 'noBall' },
  { label: 'Bye', type: 'bye' },
  { label: 'Leg Bye', type: 'legBye' },
  { label: 'Wicket', type: 'wicket' },
];

const defaultTeam = (name) => ({
  name,
  players: ['Player 1', 'Player 2'],
});

export default function LiveScoreboardScreen({ matchSession, onBack }) {
  const [matchData, setMatchData] = useState(null);
  const [firstInningsDeliveries, setFirstInningsDeliveries] = useState([]);
  const [secondInningsDeliveries, setSecondInningsDeliveries] = useState([]);
  const [activeInnings, setActiveInnings] = useState(1);
  const [editingDeliveryId, setEditingDeliveryId] = useState(null);
  const [showCustomScoreModal, setShowCustomScoreModal] = useState(false);
  const [customScoreValue, setCustomScoreValue] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  const matchId = matchSession?.id;

  useEffect(() => {
    if (!matchId) return;
    const matchRef = ref(database, `matches/${matchId}`);
    const unsubscribe = onValue(matchRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setIsHydrated(true);
        return;
      }

      const hydratedTeams = {
        team1: data?.teams?.team1 || matchSession?.battingTeam || defaultTeam('Team 1'),
        team2: data?.teams?.team2 || matchSession?.bowlingTeam || defaultTeam('Team 2'),
      };
      const first = data?.innings?.first || {};
      const second = data?.innings?.second || {};

      setMatchData({
        ...data,
        teams: hydratedTeams,
      });
      setFirstInningsDeliveries(
        Array.isArray(first.deliveries)
          ? first.deliveries
          : Array.isArray(data.deliveries)
          ? data.deliveries
          : []
      );
      setSecondInningsDeliveries(Array.isArray(second.deliveries) ? second.deliveries : []);
      setActiveInnings(data?.innings?.currentInnings === 2 ? 2 : 1);
      setIsHydrated(true);
    });
    return () => unsubscribe();
  }, [matchId, matchSession?.battingTeam, matchSession?.bowlingTeam]);

  const config = useMemo(
    () => matchData?.config || matchSession?.config || { overs: 20, players: 11 },
    [matchData?.config, matchSession?.config]
  );
  const maxBalls = (config?.overs || 20) * 6;
  const teams = useMemo(
    () => ({
      team1: matchData?.teams?.team1 || matchSession?.battingTeam || defaultTeam('Team 1'),
      team2: matchData?.teams?.team2 || matchSession?.bowlingTeam || defaultTeam('Team 2'),
    }),
    [matchData?.teams?.team1, matchData?.teams?.team2, matchSession?.battingTeam, matchSession?.bowlingTeam]
  );

  const firstInningsBattingKey = matchData?.innings?.first?.battingTeamKey || 'team1';
  const firstInningsBowlingKey = firstInningsBattingKey === 'team1' ? 'team2' : 'team1';
  const secondInningsBattingKey = firstInningsBowlingKey;
  const secondInningsBowlingKey = firstInningsBattingKey;

  const firstInningsSession = useMemo(
    () => ({
      battingTeam: teams[firstInningsBattingKey] || defaultTeam('Team 1'),
      bowlingTeam: teams[firstInningsBowlingKey] || defaultTeam('Team 2'),
    }),
    [teams, firstInningsBattingKey, firstInningsBowlingKey]
  );

  const secondInningsSession = useMemo(
    () => ({
      battingTeam: teams[secondInningsBattingKey] || defaultTeam('Team 2'),
      bowlingTeam: teams[secondInningsBowlingKey] || defaultTeam('Team 1'),
    }),
    [teams, secondInningsBattingKey, secondInningsBowlingKey]
  );

  const firstInnings = useMemo(
    () => computeInningsState(firstInningsSession, firstInningsDeliveries),
    [firstInningsSession, firstInningsDeliveries]
  );
  const secondInnings = useMemo(
    () => computeInningsState(secondInningsSession, secondInningsDeliveries),
    [secondInningsSession, secondInningsDeliveries]
  );
  const innings = activeInnings === 1 ? firstInnings : secondInnings;

  const currentSession = activeInnings === 1 ? firstInningsSession : secondInningsSession;
  const currentDeliveries = activeInnings === 1 ? firstInningsDeliveries : secondInningsDeliveries;
  const setCurrentDeliveries =
    activeInnings === 1 ? setFirstInningsDeliveries : setSecondInningsDeliveries;
  const inningsClosedByBalls = innings.score.legalBalls >= maxBalls;
  const targetRuns = firstInnings.score.runs + 1;
  const secondInningsWon = activeInnings === 2 && secondInnings.score.runs >= targetRuns;
  const inningsClosed = inningsClosedByBalls || secondInningsWon;
  const ballsRemaining = Math.max(maxBalls - innings.score.legalBalls, 0);
  const runsRequired =
    activeInnings === 2 ? Math.max(targetRuns - secondInnings.score.runs, 0) : null;
  const isMatchCompleted = activeInnings === 2 && (secondInningsWon || inningsClosedByBalls);
  const winnerName = isMatchCompleted
    ? secondInnings.score.runs >= targetRuns
      ? secondInningsSession.battingTeam.name
      : firstInningsSession.battingTeam.name
    : null;
  const createdBy = matchData?.meta?.createdBy || matchSession?.createdBy || null;
  const createdAt = matchData?.meta?.createdAt || matchSession?.createdAt || Date.now();

  useEffect(() => {
    if (!matchId || !isHydrated) return;

    const payload = {
      meta: {
        matchId,
        sport: 'Cricket',
        createdBy,
        createdAt,
        updatedAt: Date.now(),
      },
      config,
      teams: {
        team1: teams.team1,
        team2: teams.team2,
        batting: currentSession.battingTeam,
        bowling: currentSession.bowlingTeam,
      },
      deliveries: currentDeliveries,
      innings: {
        currentInnings: activeInnings,
        target: activeInnings === 2 ? targetRuns : null,
        first: {
          battingTeamKey: firstInningsBattingKey,
          bowlingTeamKey: firstInningsBowlingKey,
          deliveries: firstInningsDeliveries,
          score: firstInnings.score,
          extras: firstInnings.extras,
          partnership: firstInnings.partnership,
          currentBatsmen: firstInnings.currentBatsmen,
          currentBowler: firstInnings.currentBowler,
          timeline: firstInnings.timeline,
          stats: {
            batting: firstInnings.battingStats,
            bowling: firstInnings.bowlingStats,
          },
        },
        second: {
          battingTeamKey: secondInningsBattingKey,
          bowlingTeamKey: secondInningsBowlingKey,
          deliveries: secondInningsDeliveries,
          score: secondInnings.score,
          extras: secondInnings.extras,
          partnership: secondInnings.partnership,
          currentBatsmen: secondInnings.currentBatsmen,
          currentBowler: secondInnings.currentBowler,
          timeline: secondInnings.timeline,
          stats: {
            batting: secondInnings.battingStats,
            bowling: secondInnings.bowlingStats,
          },
        },
      },
      timeline: innings.timeline,
      stats: {
        batting: innings.battingStats,
        bowling: innings.bowlingStats,
      },
      matchState: {
        status: isMatchCompleted
          ? 'completed'
          : activeInnings === 1 && inningsClosed
          ? 'inningsBreak'
          : 'live',
        winner: winnerName,
        ballsRemaining: activeInnings === 2 ? ballsRemaining : null,
        runsRequired: activeInnings === 2 ? runsRequired : null,
      },
    };

    set(ref(database, `matches/${matchId}`), payload);
  }, [
    matchId,
    isHydrated,
    createdBy,
    createdAt,
    config,
    teams,
    currentSession,
    currentDeliveries,
    activeInnings,
    targetRuns,
    firstInningsBattingKey,
    firstInningsBowlingKey,
    secondInningsBattingKey,
    secondInningsBowlingKey,
    firstInningsDeliveries,
    secondInningsDeliveries,
    firstInnings,
    secondInnings,
    innings,
    isMatchCompleted,
    winnerName,
    ballsRemaining,
    runsRequired,
    inningsClosed,
  ]);

  const currentStriker = innings.currentBatsmen[0];
  const currentNonStriker = innings.currentBatsmen[1];
  const currentBowler = innings.currentBowler;

  const recordDelivery = (type, value = 0) => {
    if (inningsClosed) return;
    const delivery = createDeliveryEvent(
      type,
      value,
      currentStriker?.name || null,
      currentBowler?.name || null
    );
    setCurrentDeliveries((prev) => [...prev, delivery]);
  };

  const undoLastBall = () => {
    setCurrentDeliveries((prev) => prev.slice(0, -1));
  };

  const applyEditToDelivery = (type, value = 0) => {
    if (!editingDeliveryId) return;
    setCurrentDeliveries((prev) =>
      prev.map((delivery) =>
        delivery.id === editingDeliveryId
          ? {
              ...createDeliveryEvent(
                type,
                value,
                delivery.strikerName || currentStriker?.name || null,
                delivery.bowlerName || currentBowler?.name || null
              ),
              id: delivery.id,
              createdAt: delivery.createdAt,
            }
          : delivery
      )
    );
    setEditingDeliveryId(null);
  };

  const deleteDelivery = () => {
    if (!editingDeliveryId) return;
    setCurrentDeliveries((prev) => prev.filter((d) => d.id !== editingDeliveryId));
    setEditingDeliveryId(null);
  };

  const addCustomRuns = () => {
    const parsed = Number(customScoreValue);
    if (!Number.isInteger(parsed) || parsed < 0) return;
    recordDelivery('run', parsed);
    setCustomScoreValue('');
    setShowCustomScoreModal(false);
  };

  const startSecondInnings = () => {
    if (activeInnings !== 1 || !inningsClosed) return;
    setActiveInnings(2);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.topBar}>CRICKET · LIVE SCORING</Text>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.scoreCard}>
          <Text style={styles.matchTitle}>
            {currentSession.battingTeam.name} vs {currentSession.bowlingTeam.name}
          </Text>
          <Text style={styles.metaText}>Innings {activeInnings}</Text>
          <Text style={styles.scoreText}>
            {innings.score.runs}/{innings.score.wickets}
          </Text>
          <Text style={styles.metaText}>Overs: {innings.score.overs} / {config?.overs || 20}</Text>
          <Text style={styles.metaText}>Run Rate: {innings.score.runRate}</Text>
          {activeInnings === 2 ? (
            <>
              <Text style={styles.targetText}>🎯 Target: {targetRuns}</Text>
              <Text style={styles.metaText}>Runs Required: {runsRequired}</Text>
              <Text style={styles.metaText}>Balls Remaining: {ballsRemaining}</Text>
            </>
          ) : null}
          {inningsClosed ? (
            <Text style={styles.closedText}>
              {activeInnings === 1 ? '✓ 1st innings complete' : '✓ 2nd innings complete'}
            </Text>
          ) : null}
          {winnerName ? <Text style={styles.winnerText}>🏆 Winner: {winnerName}</Text> : null}
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Batsmen</Text>
            <Text style={styles.playerChipText}>{currentStriker?.name || '—'} *</Text>
            <Text style={styles.playerChipText}>{currentNonStriker?.name || '—'}</Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Bowler</Text>
            <Text style={styles.infoValue}>{currentBowler?.name || '—'}</Text>
            <Text style={styles.infoSubValue}>
              {currentBowler?.overs || '0.0'} · {currentBowler?.runs || 0}/{currentBowler?.wickets || 0}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Extras</Text>
            <Text style={styles.infoValue}>{innings.extras.total}</Text>
            <Text style={styles.infoSubValue}>
              Wd {innings.extras.wide} · Nb {innings.extras.noBall} · B {innings.extras.bye} · Lb{' '}
              {innings.extras.legBye}
            </Text>
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Partnership</Text>
            <Text style={styles.infoValue}>
              {innings.partnership.runs} ({innings.partnership.balls})
            </Text>
          </View>
        </View>

        <View style={styles.buttonGrid}>
          {scoringButtons.map((button) => (
            <TouchableOpacity
              key={button.label}
              style={[styles.scoreButton, inningsClosed && styles.disabledButton]}
              onPress={() => recordDelivery(button.type, button.value || 0)}
              disabled={inningsClosed}
            >
              <Text style={styles.scoreButtonText}>{button.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.scoreButton, styles.customButton, inningsClosed && styles.disabledButton]}
            onPress={() => setShowCustomScoreModal(true)}
            disabled={inningsClosed}
          >
            <Text style={styles.scoreButtonText}>Custom</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, currentDeliveries.length === 0 && styles.disabledButton]}
            onPress={undoLastBall}
            disabled={currentDeliveries.length === 0}
          >
            <Text style={styles.secondaryButtonText}>← Undo</Text>
          </TouchableOpacity>
          {activeInnings === 1 && inningsClosed ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={startSecondInnings}>
              <Text style={styles.secondaryButtonText}>→ 2nd Innings</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
              <Text style={styles.secondaryButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Ball Timeline (tap to edit)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineRow}>
          {innings.timeline.map((ball) => (
            <TouchableOpacity
              key={ball.id}
              style={[styles.timelineBall, ball.isWicket && styles.wicketBall]}
              onPress={() => setEditingDeliveryId(ball.id)}
            >
              <Text style={styles.timelineBallText}>{ball.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      <Modal transparent visible={!!editingDeliveryId} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Delivery</Text>
            <ScrollView style={styles.modalList}>
              {scoringButtons.map((button) => (
                <TouchableOpacity
                  key={`edit-${button.label}`}
                  style={styles.modalOption}
                  onPress={() => applyEditToDelivery(button.type, button.value || 0)}
                >
                  <Text style={styles.modalOptionText}>{button.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalDelete} onPress={deleteDelivery}>
                <Text style={styles.modalDeleteText}>Delete Delivery</Text>
              </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setEditingDeliveryId(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showCustomScoreModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Custom Runs</Text>
            <TextInput
              style={styles.customInput}
              placeholder="Enter runs (e.g. 5)"
              placeholderTextColor="#777"
              keyboardType="numeric"
              value={customScoreValue}
              onChangeText={setCustomScoreValue}
            />
            <TouchableOpacity style={styles.modalConfirm} onPress={addCustomRuns}>
              <Text style={styles.modalConfirmText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => {
                setShowCustomScoreModal(false);
                setCustomScoreValue('');
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    flex: 1,
  },
  topBar: {
    color: '#666',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  scoreCard: {
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#131313',
  },
  matchTitle: {
    color: '#AAA',
    fontSize: 13,
    marginBottom: 6,
  },
  scoreText: {
    color: '#00FF87',
    fontSize: 34,
    fontWeight: 'bold',
  },
  metaText: {
    color: '#DDD',
    fontSize: 13,
    marginTop: 2,
  },
  targetText: {
    color: '#FFD700',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  closedText: {
    color: '#ff9d00',
    marginTop: 6,
    fontWeight: 'bold',
    fontSize: 13,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSubValue: {
    color: '#AAA',
    fontSize: 11,
    marginTop: 3,
  },
  playerChipText: {
    color: '#EEE',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  scoreButton: {
    width: '17.5%',
    minWidth: 56,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  scoreButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  customButton: {
    borderColor: '#00FF87',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },
  sectionTitle: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  timelineRow: {
    marginBottom: 6,
    maxHeight: 38,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#121212',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    maxHeight: '75%',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalList: {
    maxHeight: 300,
  },
  modalOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#232323',
  },
  modalOptionText: {
    color: '#FFF',
    fontSize: 14,
  },
  modalDelete: {
    marginTop: 8,
    backgroundColor: '#3A1518',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalDeleteText: {
    color: '#ff7b8d',
    fontWeight: 'bold',
  },
  modalCancel: {
    marginTop: 10,
    backgroundColor: '#222',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#2c2c2c',
    borderRadius: 8,
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginVertical: 10,
  },
  modalConfirm: {
    backgroundColor: '#00FF87',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#000',
    fontWeight: 'bold',
  },
});