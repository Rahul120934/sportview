import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from 'firebase/firestore';
import { firestoreDb, auth } from './firebaseConfig';
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
  { label: 'Wicket', type: 'wicket-prompt' },
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
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [customScoreValue, setCustomScoreValue] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [deliveriesHydrated, setDeliveriesHydrated] = useState(false);
  const summaryWriteKeyRef = useRef(null);

  const matchId = matchSession?.id;

  useEffect(() => {
    if (!matchId) return;
    summaryWriteKeyRef.current = null;
    setIsHydrated(false);
    const matchRef = doc(firestoreDb, 'matches', matchId);
    const unsubscribe = onSnapshot(
      matchRef,
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : null;
        if (!data) {
          setIsHydrated(true);
          return;
        }

        const hydratedTeams = {
          team1:
            data?.teams?.team1 ||
            matchSession?.teams?.team1 ||
            (matchSession?.battingTeamKey === 'team1'
              ? matchSession?.battingTeam
              : matchSession?.bowlingTeamKey === 'team1'
              ? matchSession?.bowlingTeam
              : null) ||
            defaultTeam('Team 1'),
          team2:
            data?.teams?.team2 ||
            matchSession?.teams?.team2 ||
            (matchSession?.battingTeamKey === 'team2'
              ? matchSession?.battingTeam
              : matchSession?.bowlingTeamKey === 'team2'
              ? matchSession?.bowlingTeam
              : null) ||
            defaultTeam('Team 2'),
        };

        setMatchData({
          ...data,
          teams: hydratedTeams,
        });
        setActiveInnings(data?.innings?.currentInnings === 2 ? 2 : 1);
        setIsHydrated(true);
      },
      (error) => {
        console.warn('Match listener failed', error);
        setIsHydrated(true);
      }
    );
    return () => unsubscribe();
  }, [
    matchId,
    matchSession?.battingTeam,
    matchSession?.battingTeamKey,
    matchSession?.bowlingTeam,
    matchSession?.bowlingTeamKey,
    matchSession?.teams,
  ]);

  useEffect(() => {
    if (!matchId) return;
    setDeliveriesHydrated(false);
    const deliveriesRef = collection(firestoreDb, 'matches', matchId, 'deliveries');
    const deliveriesQuery = query(deliveriesRef, orderBy('sequence', 'asc'));
    const unsubscribe = onSnapshot(
      deliveriesQuery,
      (snapshot) => {
        const deliveries = snapshot.docs
          .map((deliveryDoc) => ({
            id: deliveryDoc.id,
            ...deliveryDoc.data(),
          }))
          .sort(
            (a, b) =>
              (a.sequence || 0) - (b.sequence || 0) ||
              (a.createdAt || 0) - (b.createdAt || 0)
          );

        setFirstInningsDeliveries(
          deliveries.filter((delivery) => !delivery.innings || delivery.innings === 1)
        );
        setSecondInningsDeliveries(deliveries.filter((delivery) => delivery.innings === 2));
        setDeliveriesHydrated(true);
      },
      (error) => {
        console.warn('Delivery listener failed', error);
        setDeliveriesHydrated(true);
      }
    );
    return () => unsubscribe();
  }, [matchId]);

  const config = useMemo(
    () => matchData?.config || matchSession?.config || { overs: 20, players: 11 },
    [matchData?.config, matchSession?.config]
  );
  const maxBalls = (config?.overs || 20) * 6;
  const teams = useMemo(
    () => ({
      team1: matchData?.teams?.team1 || matchSession?.teams?.team1 || defaultTeam('Team 1'),
      team2: matchData?.teams?.team2 || matchSession?.teams?.team2 || defaultTeam('Team 2'),
    }),
    [matchData?.teams?.team1, matchData?.teams?.team2, matchSession?.teams?.team1, matchSession?.teams?.team2]
  );

  const firstInningsBattingKey =
    matchData?.innings?.first?.battingTeamKey || matchSession?.battingTeamKey || 'team1';
  const firstInningsBowlingKey =
    matchData?.innings?.first?.bowlingTeamKey ||
    matchSession?.bowlingTeamKey ||
    (firstInningsBattingKey === 'team1' ? 'team2' : 'team1');
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
  const maxWickets = (currentSession?.battingTeam?.players || []).length > 0
    ? (currentSession.battingTeam.players.length - 1)
    : 10;
  
  const inningsClosedByBalls = innings.score.legalBalls >= maxBalls;
  const inningsClosedByWickets = innings.score.wickets >= maxWickets;
  
  const targetRuns = firstInnings.score.runs + 1;
  const secondInningsWon = activeInnings === 2 && secondInnings.score.runs >= targetRuns;
  const inningsClosed = inningsClosedByBalls || inningsClosedByWickets || secondInningsWon;
  const ballsRemaining = Math.max(maxBalls - innings.score.legalBalls, 0);
  const runsRequired =
    activeInnings === 2 ? Math.max(targetRuns - secondInnings.score.runs, 0) : null;
  const isMatchCompleted = activeInnings === 2 && (secondInningsWon || inningsClosedByBalls || inningsClosedByWickets);
  const winnerName = isMatchCompleted
    ? secondInnings.score.runs >= targetRuns
      ? secondInningsSession.battingTeam.name
      : firstInningsSession.battingTeam.name
    : null;
  const createdBy = matchData?.meta?.createdBy || matchSession?.createdBy || null;
  const createdAt = matchData?.meta?.createdAt || matchSession?.createdAt || Date.now();
  const sessionCode = matchData?.meta?.sessionCode || matchSession?.sessionCode || matchData?.sessionCode || null;

  useEffect(() => {
    if (!matchId || !isHydrated || !deliveriesHydrated) return;

    const payload = {
      meta: {
        matchId,
        sport: 'Cricket',
        sessionCode,
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
      innings: {
        currentInnings: activeInnings,
        target: activeInnings === 2 ? targetRuns : null,
        first: {
          battingTeamKey: firstInningsBattingKey,
          bowlingTeamKey: firstInningsBowlingKey,
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
      sessionCode,
    };

    const summaryKey = JSON.stringify({
      config,
      teams: payload.teams,
      innings: payload.innings,
      timeline: payload.timeline,
      stats: payload.stats,
      matchState: payload.matchState,
    });

    if (summaryWriteKeyRef.current === summaryKey) return;
    summaryWriteKeyRef.current = summaryKey;

    setDoc(doc(firestoreDb, 'matches', matchId), payload, { merge: true }).catch((error) => {
      summaryWriteKeyRef.current = null;
      console.warn('Match summary write failed', error);
    });
  }, [
    matchId,
    isHydrated,
    deliveriesHydrated,
    sessionCode,
    createdBy,
    createdAt,
    config,
    teams,
    currentSession,
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
    const currentUid = auth?.currentUser?.uid || null;
    const ownerUid = matchData?.meta?.createdBy || matchSession?.createdBy || null;
    if (!currentUid) {
      Alert.alert('Not signed in', 'You must be signed in to record deliveries.');
      return;
    }
    if (ownerUid && currentUid !== ownerUid) {
      Alert.alert('Unauthorized', 'Only the match creator can record deliveries.');
      return;
    }
    
    if (type === 'wicket-prompt') {
      setShowWicketModal(true);
      return;
    }

    const delivery = createDeliveryEvent(
      type,
      typeof value === 'number' ? value : 0,
      currentStriker?.name || null,
      currentBowler?.name || null
    );
    
    // Add wicket type if passed in value (for custom wicket types)
    if (type === 'wicket' && typeof value === 'string') {
      delivery.wicketType = value;
      delivery.label = `W-${value.substring(0,2)}`;
    }

    const deliveryWithMeta = {
      ...delivery,
      innings: activeInnings,
      sequence: currentDeliveries.length + 1,
      scorerId: currentUid || createdBy,
      updatedAt: Date.now(),
    };
    setDoc(
      doc(firestoreDb, 'matches', matchId, 'deliveries', delivery.id),
      deliveryWithMeta
    ).catch((error) => {
      console.warn('Delivery write failed', error);
    });
  };

  const undoLastBall = () => {
    const lastDelivery = currentDeliveries[currentDeliveries.length - 1];
    if (!lastDelivery) return;
    const currentUid = auth?.currentUser?.uid || null;
    const ownerUid = matchData?.meta?.createdBy || matchSession?.createdBy || null;
    if (!currentUid || (ownerUid && currentUid !== ownerUid)) {
      Alert.alert('Unauthorized', 'Only the match creator can undo deliveries.');
      return;
    }
    deleteDoc(doc(firestoreDb, 'matches', matchId, 'deliveries', lastDelivery.id)).catch(
      (error) => {
        console.warn('Undo delivery failed', error);
      }
    );
  };

  const applyEditToDelivery = (type, value = 0) => {
    if (!editingDeliveryId) return;
    const existingDelivery = currentDeliveries.find((delivery) => delivery.id === editingDeliveryId);
    if (!existingDelivery) return;
    const currentUid = auth?.currentUser?.uid || null;
    const ownerUid = matchData?.meta?.createdBy || matchSession?.createdBy || null;
    if (!currentUid || (ownerUid && currentUid !== ownerUid)) {
      Alert.alert('Unauthorized', 'Only the match creator can edit deliveries.');
      return;
    }
    const editedDelivery = {
      ...createDeliveryEvent(
        type,
        value,
        existingDelivery.strikerName || currentStriker?.name || null,
        existingDelivery.bowlerName || currentBowler?.name || null
      ),
      id: existingDelivery.id,
      innings: existingDelivery.innings || activeInnings,
      sequence: existingDelivery.sequence || currentDeliveries.length,
      scorerId: existingDelivery.scorerId || currentUid || createdBy,
      createdAt: existingDelivery.createdAt,
      updatedAt: Date.now(),
    };
    setDoc(
      doc(firestoreDb, 'matches', matchId, 'deliveries', existingDelivery.id),
      editedDelivery
    ).catch((error) => {
      console.warn('Delivery edit failed', error);
    });
    setEditingDeliveryId(null);
  };

  const deleteDelivery = () => {
    if (!editingDeliveryId) return;
    const currentUid = auth?.currentUser?.uid || null;
    const ownerUid = matchData?.meta?.createdBy || matchSession?.createdBy || null;
    if (!currentUid || (ownerUid && currentUid !== ownerUid)) {
      Alert.alert('Unauthorized', 'Only the match creator can delete deliveries.');
      return;
    }
    deleteDoc(doc(firestoreDb, 'matches', matchId, 'deliveries', editingDeliveryId)).catch(
      (error) => {
        console.warn('Delivery delete failed', error);
      }
    );
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
          {sessionCode ? <Text style={styles.sessionCode}>Session Code: {sessionCode}</Text> : null}
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
              placeholderTextColor="#9CA3AF"
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

      <Modal transparent visible={showWicketModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Wicket Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 }}>
              {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket'].map((wType) => (
                <TouchableOpacity
                  key={wType}
                  style={[styles.scoreButton, { width: '48%', marginBottom: 10, paddingVertical: 12 }]}
                  onPress={() => {
                    recordDelivery('wicket', wType);
                    setShowWicketModal(false);
                  }}
                >
                  <Text style={styles.scoreButtonText}>{wType}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.modalCancel, { marginTop: 10 }]}
              onPress={() => setShowWicketModal(false)}
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
    backgroundColor: '#F9FAFB',
    padding: 12,
    paddingTop: 18,
  },
  scrollContent: {
    flex: 1,
  },
  topBar: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
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
  matchTitle: {
    color: '#4B5563',
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '600',
  },
  sessionCode: {
    color: '#D97706',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreText: {
    color: '#1D4ED8',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  metaText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  targetText: {
    color: '#D97706',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '700',
  },
  closedText: {
    color: '#10B981',
    marginTop: 8,
    fontWeight: 'bold',
    fontSize: 14,
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
    marginBottom: 10,
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
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  infoSubValue: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  playerChipText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  scoreButton: {
    width: '18%',
    minWidth: 58,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  scoreButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  customButton: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.4,
  },
  sectionTitle: {
    color: '#4B5563',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineRow: {
    marginBottom: 16,
    maxHeight: 44,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 340,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalDelete: {
    marginTop: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDeleteText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 15,
  },
  modalCancel: {
    marginTop: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 15,
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 16,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalConfirm: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
