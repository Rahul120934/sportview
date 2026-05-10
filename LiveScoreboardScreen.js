import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
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
import { Edit2 } from 'lucide-react-native';

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
  const [superOver1Deliveries, setSuperOver1Deliveries] = useState([]);
  const [superOver2Deliveries, setSuperOver2Deliveries] = useState([]);
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
        const ci = data?.innings?.currentInnings;
        setActiveInnings(ci && [1,2,3,4].includes(ci) ? ci : 1);
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

        setFirstInningsDeliveries(deliveries.filter((d) => !d.innings || d.innings === 1));
        setSecondInningsDeliveries(deliveries.filter((d) => d.innings === 2));
        setSuperOver1Deliveries(deliveries.filter((d) => d.innings === 3));
        setSuperOver2Deliveries(deliveries.filter((d) => d.innings === 4));
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
  // Super Over sessions: innings 3 = team1 bats first again, innings 4 = team2 bats
  const superOver1Session = useMemo(() => ({
    battingTeam: teams[firstInningsBattingKey] || defaultTeam('Team 1'),
    bowlingTeam: teams[firstInningsBowlingKey] || defaultTeam('Team 2'),
  }), [teams, firstInningsBattingKey, firstInningsBowlingKey]);
  const superOver2Session = useMemo(() => ({
    battingTeam: teams[firstInningsBowlingKey] || defaultTeam('Team 2'),
    bowlingTeam: teams[firstInningsBattingKey] || defaultTeam('Team 1'),
  }), [teams, firstInningsBattingKey, firstInningsBowlingKey]);

  const superOver1 = useMemo(() => computeInningsState(superOver1Session, superOver1Deliveries), [superOver1Session, superOver1Deliveries]);
  const superOver2 = useMemo(() => computeInningsState(superOver2Session, superOver2Deliveries), [superOver2Session, superOver2Deliveries]);

  const isSuperOver = activeInnings === 3 || activeInnings === 4;
  const SUPER_OVER_BALLS = 6; // 1 over

  const innings = activeInnings === 1 ? firstInnings
    : activeInnings === 2 ? secondInnings
    : activeInnings === 3 ? superOver1
    : superOver2;

  const currentSession = activeInnings === 1 ? firstInningsSession
    : activeInnings === 2 ? secondInningsSession
    : activeInnings === 3 ? superOver1Session
    : superOver2Session;

  const currentDeliveries = activeInnings === 1 ? firstInningsDeliveries
    : activeInnings === 2 ? secondInningsDeliveries
    : activeInnings === 3 ? superOver1Deliveries
    : superOver2Deliveries;

  const maxWickets = (currentSession?.battingTeam?.players || []).length > 0
    ? (currentSession.battingTeam.players.length - 1)
    : 10;

  // Normal innings limits
  const inningsClosedByBalls = isSuperOver
    ? innings.score.legalBalls >= SUPER_OVER_BALLS
    : innings.score.legalBalls >= maxBalls;
  const inningsClosedByWickets = innings.score.wickets >= maxWickets;

  const targetRuns = firstInnings.score.runs + 1;
  const secondInningsWon = activeInnings === 2 && secondInnings.score.runs >= targetRuns;
  const isTie = activeInnings === 2
    && (inningsClosedByBalls || inningsClosedByWickets)
    && secondInnings.score.runs === firstInnings.score.runs;

  // Super Over win condition
  const superOverTarget = superOver1.score.runs + 1;
  const superOver2Won = activeInnings === 4 && superOver2.score.runs >= superOverTarget;
  const superOverClosed = activeInnings === 4 && (superOver2Won || superOver2.score.legalBalls >= SUPER_OVER_BALLS || inningsClosedByWickets);

  const inningsClosed = inningsClosedByBalls || inningsClosedByWickets || secondInningsWon || superOver2Won;

  const ballsRemaining = isSuperOver
    ? Math.max(SUPER_OVER_BALLS - innings.score.legalBalls, 0)
    : Math.max(maxBalls - innings.score.legalBalls, 0);
  const runsRequired = activeInnings === 2
    ? Math.max(targetRuns - secondInnings.score.runs, 0)
    : activeInnings === 4
    ? Math.max(superOverTarget - superOver2.score.runs, 0)
    : null;

  const isMatchCompleted = (activeInnings === 2 && !isTie && (secondInningsWon || inningsClosedByBalls || inningsClosedByWickets))
    || superOverClosed;

  const winnerName = isMatchCompleted
    ? isSuperOver
      ? superOver2.score.runs >= superOverTarget
        ? superOver2Session.battingTeam.name
        : superOver1Session.battingTeam.name
      : secondInnings.score.runs >= targetRuns
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

    const driveKey = JSON.stringify({
      activeInnings,
      d1: firstInningsDeliveries.map((d) => `${d.id}-${d.updatedAt}`),
      d2: secondInningsDeliveries.map((d) => `${d.id}-${d.updatedAt}`),
      config,
      teams: {
        t1Name: teams.team1.name,
        t1P: teams.team1.players,
        t2Name: teams.team2.name,
        t2P: teams.team2.players,
      },
    });

    if (summaryWriteKeyRef.current === driveKey) return;
    summaryWriteKeyRef.current = driveKey;

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
      delivery.label = 'W';
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

  const startSuperOver = () => {
    if (!isTie) return;
    setActiveInnings(3);
  };

  const startSuperOver2 = () => {
    if (activeInnings !== 3 || !inningsClosed) return;
    setActiveInnings(4);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Score Header */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeaderRow}>
            <View style={styles.liveBadgeRow}>
              <View style={[styles.liveDot, isSuperOver && { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.liveMatchText, isSuperOver && { color: '#F59E0B' }]}>
                {isSuperOver ? '⚡ SUPER OVER' : isMatchCompleted ? 'MATCH COMPLETED' : 'LIVE MATCH'}
              </Text>
            </View>
            <Text style={styles.inningsText}>
              {isSuperOver ? `SO Innings ${activeInnings - 2}` : `Innings ${activeInnings}`}
            </Text>
          </View>
          <Text style={styles.teamsTitle}>{currentSession.battingTeam.name.toUpperCase()} VS {currentSession.bowlingTeam.name.toUpperCase()}</Text>
          <View style={styles.mainScoreRow}>
            <Text style={styles.mainScoreText}>{innings.score.runs}/{innings.score.wickets}</Text>
            <Text style={styles.mainOversText}>({innings.score.overs})</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.crrLabel}>CRR <Text style={styles.crrValue}>{innings.score.runRate}</Text></Text>
            {!isSuperOver && <Text style={styles.projScoreText}>Proj. <Text style={styles.projScoreValue}>{Math.round((innings.score.runRate || 0) * (config?.overs || 20))}</Text></Text>}
          </View>
          {(activeInnings === 2 || activeInnings === 4) && runsRequired !== null && (
            <Text style={styles.crrLabel}>
              Target <Text style={styles.crrValue}>{activeInnings === 4 ? superOverTarget : targetRuns}</Text>  |  Need {runsRequired} in {ballsRemaining} ball{ballsRemaining !== 1 ? 's' : ''}
            </Text>
          )}
          {isTie && activeInnings === 2 && (
            <View style={styles.tieBanner}>
              <Text style={styles.tieBannerText}>🏏 MATCH TIED — Super Over Required!</Text>
            </View>
          )}
          {isMatchCompleted && winnerName && (
            <View style={[styles.tieBanner, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.tieBannerText, { color: '#065F46' }]}>🏆 {winnerName} wins{isSuperOver ? ' the Super Over!' : '!'}</Text>
            </View>
          )}
        </View>

        {/* Current Players */}
        <Text style={styles.sectionHeader}>CURRENT BATTER</Text>
        <View style={styles.playerCard}>
          <Text style={styles.playerName}>{currentStriker?.name || '—'}*</Text>
          <Text style={styles.playerScore}>{currentStriker?.runs || 0} <Text style={styles.playerBalls}>({currentStriker?.balls || 0})</Text></Text>
        </View>
        <Text style={styles.sectionHeader}>CURRENT BOWLER</Text>
        <View style={styles.playerCard}>
          <Text style={styles.playerName}>{currentBowler?.name || '—'}</Text>
          <Text style={styles.bowlerScore}>{currentBowler?.wickets || 0}/{currentBowler?.runs || 0} <Text style={styles.playerBalls}>({currentBowler?.overs || '0.0'})</Text></Text>
        </View>

        {/* Record Action */}
        <Text style={styles.sectionHeader}>RECORD ACTION</Text>
        <View style={styles.buttonGrid}>
          {scoringButtons.map((button) => {
            let btnStyle = styles.btnGray;
            let textStyle = styles.btnTextDark;
            if (button.label === '4' || button.label === '6') {
              btnStyle = styles.btnBlue;
              textStyle = styles.btnTextLight;
            } else if (button.label === 'W') {
              btnStyle = styles.btnRed;
              textStyle = styles.btnTextLight;
            } else if (button.label === 'WIDE' || button.label === 'NO BALL') {
              btnStyle = styles.btnLightBlue;
              textStyle = styles.btnTextDarkSmall;
            }

            return (
              <TouchableOpacity
                key={button.label}
                style={[styles.scoreButton, btnStyle, inningsClosed && { opacity: 0.5 }]}
                onPress={() => recordDelivery(button.type, button.value || 0)}
                disabled={inningsClosed}
              >
                <Text style={textStyle}>{button.label === 'NO BALL' ? 'NO\nBALL' : button.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.secondaryButton, currentDeliveries.length === 0 && { opacity: 0.5 }]} onPress={undoLastBall} disabled={currentDeliveries.length === 0}>
            <Text style={styles.secondaryButtonText}>Undo Last</Text>
          </TouchableOpacity>
          {activeInnings === 1 && inningsClosed ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={startSecondInnings}>
              <Text style={styles.secondaryButtonText}>Start 2nd Innings</Text>
            </TouchableOpacity>
          ) : isTie && activeInnings === 2 ? (
            <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B' }]} onPress={startSuperOver}>
              <Text style={[styles.secondaryButtonText, { color: '#92400E' }]}>⚡ Start Super Over</Text>
            </TouchableOpacity>
          ) : activeInnings === 3 && inningsClosed ? (
            <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B' }]} onPress={startSuperOver2}>
              <Text style={[styles.secondaryButtonText, { color: '#92400E' }]}>⚡ SO: {superOver2Session.battingTeam.name} bats</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.secondaryButton} onPress={onBack}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.timelineHeaderRow}>
          <Text style={styles.sectionHeader}>BALL-BY-BALL TIMELINE</Text>
          <TouchableOpacity style={styles.modifyLink} onPress={() => {}}>
            <Edit2 color="#0047FF" size={12} />
            <Text style={styles.modifyText}>Modify Current Over</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineRow}>
          {innings.timeline.slice(-6).map((ball) => {
            const isFourOrSix = ball.runs === 4 || ball.runs === 6;
            return (
              <TouchableOpacity key={ball.id} style={styles.timelineItem} onPress={() => setEditingDeliveryId(ball.id)}>
                <Text style={styles.timelineItemOver}>{ball.over}</Text>
                <View style={[styles.timelineBall, ball.isWicket && styles.wicketBall, isFourOrSix && styles.boundaryBall]}>
                  <Text style={styles.timelineBallText}>{ball.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Partnership */}
        <Text style={styles.sectionHeader}>PARTNERSHIP</Text>
        <View style={styles.partnershipCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>BATTER</Text>
            <Text style={styles.tableHeaderText}>RUNS</Text>
            <Text style={styles.tableHeaderText}>BALLS</Text>
            <Text style={styles.tableHeaderText}>4S</Text>
            <Text style={styles.tableHeaderText}>6S</Text>
          </View>
          {innings.currentBatsmen.map((batsman, idx) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={[styles.tableCellText, { flex: 2, fontWeight: '700', color: '#111827' }]}>{batsman?.name}{idx === 0 ? '*' : ''}</Text>
              <Text style={styles.tableCellText}>{batsman?.runs || 0}</Text>
              <Text style={styles.tableCellText}>{batsman?.balls || 0}</Text>
              <Text style={styles.tableCellText}>{batsman?.fours || 0}</Text>
              <Text style={styles.tableCellText}>{batsman?.sixes || 0}</Text>
            </View>
          ))}
        </View>
        
        <View style={{height: 40}} />
      </ScrollView>

      {/* Modals... */}
      <Modal transparent visible={!!editingDeliveryId} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Delivery</Text>
            <ScrollView style={styles.modalList}>
              {scoringButtons.map((button) => (
                <TouchableOpacity key={`edit-${button.label}`} style={styles.modalOption} onPress={() => applyEditToDelivery(button.type, button.value || 0)}>
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
            <TextInput style={styles.customInput} placeholder="Enter runs (e.g. 5)" placeholderTextColor="#9CA3AF" keyboardType="numeric" value={customScoreValue} onChangeText={setCustomScoreValue} />
            <TouchableOpacity style={styles.modalConfirm} onPress={addCustomRuns}><Text style={styles.modalConfirmText}>Add</Text></TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowCustomScoreModal(false); setCustomScoreValue(''); }}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={showWicketModal} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Wicket Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 }}>
              {['Bowled', 'Caught', 'LBW', 'Run Out', 'Stumped', 'Hit Wicket'].map((wType) => (
                <TouchableOpacity key={wType} style={[styles.scoreButton, styles.btnGray, { width: '48%', marginBottom: 10, paddingVertical: 12 }]} onPress={() => { recordDelivery('wicket', wType); setShowWicketModal(false); }}>
                  <Text style={styles.btnTextDark}>{wType}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowWicketModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9', padding: 16, paddingTop: 20 },
  scrollContent: { flex: 1 },
  scoreCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  scoreHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  liveBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626' },
  liveMatchText: { fontSize: 11, fontWeight: '800', color: '#DC2626', letterSpacing: 0.5 },
  inningsText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
  teamsTitle: { fontSize: 12, fontWeight: '800', color: '#111827', marginBottom: 4 },
  mainScoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 12 },
  mainScoreText: { fontSize: 48, fontWeight: '900', color: '#0047FF', letterSpacing: -1 },
  mainOversText: { fontSize: 20, fontWeight: '800', color: '#4B5563' },
  statsRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16 },
  crrLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  crrValue: { color: '#10B981', fontWeight: '800', fontSize: 16 },
  projScoreText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  projScoreValue: { color: '#111827', fontWeight: '800', fontSize: 16 },
  sectionHeader: { fontSize: 12, fontWeight: '800', color: '#4B5563', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },
  playerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  playerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  playerScore: { fontSize: 18, fontWeight: '900', color: '#0047FF' },
  bowlerScore: { fontSize: 18, fontWeight: '900', color: '#10B981' },
  playerBalls: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  scoreButton: { width: '30%', height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnGray: { backgroundColor: '#E5E7EB' },
  btnBlue: { backgroundColor: '#0047FF' },
  btnRed: { backgroundColor: '#DC2626' },
  btnLightBlue: { backgroundColor: '#DBEAFE' },
  btnTextDark: { fontSize: 24, fontWeight: '900', color: '#111827' },
  btnTextLight: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
  btnTextDarkSmall: { fontSize: 14, fontWeight: '800', color: '#6B7280', textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  secondaryButton: { flex: 1, backgroundColor: '#E5E7EB', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  secondaryButtonText: { color: '#111827', fontSize: 14, fontWeight: '700' },
  timelineHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modifyLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modifyText: { fontSize: 11, fontWeight: '700', color: '#0047FF' },
  timelineRow: { marginBottom: 24 },
  timelineItem: { alignItems: 'center', marginRight: 12 },
  timelineItemOver: { fontSize: 10, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  timelineBall: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  wicketBall: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#DC2626' },
  boundaryBall: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#0047FF' },
  timelineBallText: { fontSize: 16, fontWeight: '900', color: '#111827' },
  partnershipCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24 },
  tableHeader: { flexDirection: 'row', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 8 },
  tableHeaderText: { flex: 1, fontSize: 10, fontWeight: '800', color: '#6B7280' },
  tableRow: { flexDirection: 'row', marginBottom: 8 },
  tableCellText: { flex: 1, fontSize: 14, color: '#4B5563', fontWeight: '500' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16 },
  modalList: { maxHeight: 300, marginBottom: 16 },
  modalOption: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOptionText: { fontSize: 16, color: '#111827', fontWeight: '600' },
  modalDelete: { paddingVertical: 16, marginTop: 8 },
  modalDeleteText: { fontSize: 16, color: '#DC2626', fontWeight: '700' },
  modalCancel: { paddingVertical: 16, alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12 },
  modalCancelText: { fontSize: 16, color: '#111827', fontWeight: '700' },
  customInput: { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 16, fontSize: 16, marginBottom: 16 },
  modalConfirm: { backgroundColor: '#0047FF', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  modalConfirmText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  tieBanner: { marginTop: 12, backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  tieBannerText: { fontSize: 14, fontWeight: '800', color: '#92400E', textAlign: 'center' },
});
