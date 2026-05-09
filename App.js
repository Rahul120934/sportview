import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { auth, firestoreDb } from './firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import TeamPlayerSetupScreen from './TeamPlayerSetupScreen';
import TossScreen from './TossScreen';
import LiveScoreboardScreen from './LiveScoreboardScreen';
import MatchViewerScreen from './MatchViewerScreen';

const SPORTS = [
  'Cricket',
  'Football',
  'Badminton',
  'Hockey',
  'Tennis',
  'Basketball',
  'Volleyball',
  'Table Tennis',
];

const fallbackTeam = (name) => ({
  name,
  players: ['Player 1', 'Player 2'],
});

function formatSessionTime(timestamp) {
  if (!timestamp) return 'Unknown time';
  return new Date(timestamp).toLocaleString();
}

function createSessionCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function SportSelectionScreen({ onBack, onSelectSport }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Select a Sport</Text>
      <Text style={styles.subtitle}>Pick a game to start scoring</Text>
      <ScrollView style={styles.sportList} showsVerticalScrollIndicator={false}>
        {SPORTS.map((sport) => (
          <TouchableOpacity
            key={sport}
            style={styles.sportButton}
            onPress={() => onSelectSport(sport)}
          >
            <Text style={styles.sportButtonText}>{sport}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.linkButton} onPress={onBack}>
        <Text style={styles.link}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

function CricketSetupScreen({ onBack, onStartMatch }) {
  const [team1, setTeam1] = useState('');
  const [team2, setTeam2] = useState('');
  const [overs, setOvers] = useState(20);
  const [players, setPlayers] = useState(11);
  const [playerIdentity, setPlayerIdentity] = useState('names');

  const incrementOvers = () => setOvers(o => o + 1);
  const decrementOvers = () => setOvers(o => Math.max(1, o - 1));
  const incrementPlayers = () => setPlayers(p => p + 1);
  const decrementPlayers = () => setPlayers(p => Math.max(1, p - 1));

  return (
    <View style={cricketStyles.container}>
      <Text style={cricketStyles.topBar}>CRICKET  ·  MATCH SETUP</Text>

      <View style={cricketStyles.field}>
        <Text style={cricketStyles.label}>TEAM 1</Text>
        <TextInput
          style={cricketStyles.input}
          placeholder="Enter team name"
          placeholderTextColor="#444"
          value={team1}
          onChangeText={setTeam1}
        />
        <View style={cricketStyles.inputUnderline} />
      </View>

      <View style={cricketStyles.field}>
        <Text style={cricketStyles.label}>TEAM 2</Text>
        <TextInput
          style={cricketStyles.input}
          placeholder="Enter team name"
          placeholderTextColor="#444"
          value={team2}
          onChangeText={setTeam2}
        />
        <View style={cricketStyles.inputUnderline} />
      </View>

      <View style={cricketStyles.field}>
        <Text style={cricketStyles.label}>OVERS</Text>
        <View style={cricketStyles.stepperRow}>
          <TouchableOpacity style={cricketStyles.stepperButton} onPress={decrementOvers}>
            <Text style={cricketStyles.stepperText}>−</Text>
          </TouchableOpacity>
          <Text style={cricketStyles.stepperValue}>{overs}</Text>
          <TouchableOpacity style={cricketStyles.stepperButton} onPress={incrementOvers}>
            <Text style={cricketStyles.stepperText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={cricketStyles.field}>
        <Text style={cricketStyles.label}>PLAYERS PER TEAM</Text>
        <View style={cricketStyles.stepperRow}>
          <TouchableOpacity style={cricketStyles.stepperButton} onPress={decrementPlayers}>
            <Text style={cricketStyles.stepperText}>−</Text>
          </TouchableOpacity>
          <Text style={cricketStyles.stepperValue}>{players}</Text>
          <TouchableOpacity style={cricketStyles.stepperButton} onPress={incrementPlayers}>
            <Text style={cricketStyles.stepperText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={cricketStyles.field}>
        <Text style={cricketStyles.label}>PLAYER IDENTITY</Text>
        <View style={cricketStyles.pillToggle}>
          <TouchableOpacity
            style={[cricketStyles.pillOption, playerIdentity === 'names' && cricketStyles.pillActive]}
            onPress={() => setPlayerIdentity('names')}
          >
            <Text style={[cricketStyles.pillText, playerIdentity === 'names' && cricketStyles.pillTextActive]}>
              ENTER NAMES
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[cricketStyles.pillOption, playerIdentity === 'numbers' && cricketStyles.pillActive]}
            onPress={() => setPlayerIdentity('numbers')}
          >
            <Text style={[cricketStyles.pillText, playerIdentity === 'numbers' && cricketStyles.pillTextActive]}>
              AUTO NUMBER
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={cricketStyles.startButton}
        onPress={() => onStartMatch({ team1, team2, overs, players, playerIdentity })}
      >
        <Text style={cricketStyles.startButtonText}>START MATCH →</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onBack}>
        <Text style={cricketStyles.backLink}>← Back to Sports</Text>
      </TouchableOpacity>
    </View>
  );
}

function HomeScreen({ user, onStartNew, onResumeSession, onViewSession }) {
  const [activeTab, setActiveTab] = useState('menu');
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState('');
  const [viewerCode, setViewerCode] = useState('');

  useEffect(() => {
    if (!user?.uid) return;

    const matchesQuery = query(
      collection(firestoreDb, 'matches'),
      where('meta.createdBy', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      matchesQuery,
      (snapshot) => {
        const nextSessions = snapshot.docs
          .map((sessionDoc) => ({
            id: sessionDoc.id,
            ...sessionDoc.data(),
          }))
          .sort((a, b) => (b?.meta?.createdAt || 0) - (a?.meta?.createdAt || 0));

        setSessions(nextSessions);
        setSessionsError('');
        setSessionsLoading(false);
      },
      (error) => {
        setSessionsError(error.message);
        setSessionsLoading(false);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const renderSessionRow = (session) => {
    const team1Name = session?.teams?.team1?.name || 'Team 1';
    const team2Name = session?.teams?.team2?.name || 'Team 2';
    const currentInnings = session?.innings?.currentInnings === 2 ? 'second' : 'first';
    const score = session?.innings?.[currentInnings]?.score || { runs: 0, wickets: 0, overs: '0.0' };
    const status = session?.matchState?.status || 'created';
    const sessionCode = session?.meta?.sessionCode || session?.sessionCode || 'NO CODE';

    return (
      <View key={session.id} style={styles.sessionRow}>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle}>{team1Name} vs {team2Name}</Text>
          <Text style={styles.sessionCode}>Code: {sessionCode}</Text>
          <Text style={styles.sessionMeta}>{formatSessionTime(session?.meta?.createdAt)}</Text>
          <Text style={styles.sessionMeta}>
            {status.toUpperCase()}  |  {score.runs}/{score.wickets} ({score.overs})
          </Text>
        </View>
        <TouchableOpacity style={styles.continueButton} onPress={() => onResumeSession(session)}>
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.menuCard}>
      <Text style={styles.title}>Hello, {user.email}</Text>
      <View style={styles.menuTabs}>
        <TouchableOpacity
          style={[styles.menuTab, activeTab === 'menu' && styles.menuTabActive]}
          onPress={() => setActiveTab('menu')}
        >
          <Text style={[styles.menuTabText, activeTab === 'menu' && styles.menuTabTextActive]}>
            Menu
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuTab, activeTab === 'history' && styles.menuTabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.menuTabText, activeTab === 'history' && styles.menuTabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.menuTab, activeTab === 'viewer' && styles.menuTabActive]}
          onPress={() => setActiveTab('viewer')}
        >
          <Text style={[styles.menuTabText, activeTab === 'viewer' && styles.menuTabTextActive]}>
            Viewer
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'menu' ? (
        <View>
          <Text style={styles.subtitle}>Choose an option to continue</Text>
          <TouchableOpacity style={styles.button} onPress={onStartNew}>
            <Text style={styles.buttonText}>Start a New Session</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => setActiveTab('history')}>
            <Text style={styles.buttonTextSecondary}>Session History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => setActiveTab('viewer')}>
            <Text style={styles.buttonTextSecondary}>View by Code</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === 'history' ? (
        <View>
          <Text style={styles.subtitle}>Previous sessions</Text>
          {sessionsLoading ? (
            <ActivityIndicator color="#e94560" />
          ) : sessionsError ? (
            <Text style={styles.emptyHistoryText}>{sessionsError}</Text>
          ) : sessions.length === 0 ? (
            <Text style={styles.emptyHistoryText}>No sessions yet</Text>
          ) : (
            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {sessions.map(renderSessionRow)}
            </ScrollView>
          )}
        </View>
      ) : (
        <View>
          <Text style={styles.subtitle}>Enter a session code</Text>
          <TextInput
            style={styles.input}
            placeholder="Example: A1B2C3"
            placeholderTextColor="#888"
            autoCapitalize="characters"
            value={viewerCode}
            onChangeText={(value) => setViewerCode(value.toUpperCase())}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              const trimmedCode = viewerCode.trim().toUpperCase();
              if (!trimmedCode) {
                Alert.alert('Session Code', 'Please enter a session code.');
                return;
              }
              onViewSession(trimmedCode);
            }}
          >
            <Text style={styles.buttonText}>View Live Session</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.linkButton} onPress={handleSignOut}>
        <Text style={styles.link}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

function SignInScreen({ onToggle }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Welcome Back</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleSignIn} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={onToggle}>
        <Text style={styles.link}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}

function SignUpScreen({ onToggle }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Join the Game</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={onToggle}>
        <Text style={styles.link}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function App() {
  const [showSignUp, setShowSignUp] = useState(false);
  const [user, setUser] = useState(null);
  const [screen, setScreen] = useState('home');
  const [matchConfig, setMatchConfig] = useState(null);
  const [teamSetupData, setTeamSetupData] = useState(null);
  const [matchSession, setMatchSession] = useState(null);
  const [viewerSessionCode, setViewerSessionCode] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setScreen('home');
      }
    });
    return unsubscribe;
  }, []);

  const handleSelectSport = (sport) => {
    if (sport === 'Cricket') {
      setScreen('cricketSetup');
    } else {
      Alert.alert('Selected Sport', `You selected ${sport}. Scoring screen coming soon!`);
    }
  };

  const handleStartMatch = (config) => {
    setMatchConfig(config);
    setViewerSessionCode('');
    setScreen('teamPlayerSetup');
  };

  const handleTeamSetupComplete = (teamData) => {
    setTeamSetupData(teamData);
    setScreen('toss');
  };

  const handleResumeSession = (session) => {
    const teams = {
      team1: session?.teams?.team1 || fallbackTeam('Team 1'),
      team2: session?.teams?.team2 || fallbackTeam('Team 2'),
    };
    const battingTeamKey = session?.innings?.first?.battingTeamKey || 'team1';
    const bowlingTeamKey =
      session?.innings?.first?.bowlingTeamKey ||
      (battingTeamKey === 'team1' ? 'team2' : 'team1');

    setMatchConfig(session?.config || { overs: 20, players: 11 });
    setTeamSetupData(null);
    setMatchSession({
      id: session.id || session?.meta?.matchId,
      createdAt: session?.meta?.createdAt || Date.now(),
      createdBy: session?.meta?.createdBy || user?.uid || null,
      sessionCode: session?.meta?.sessionCode || session?.sessionCode || null,
      config: session?.config || { overs: 20, players: 11 },
      teams,
      battingTeamKey,
      bowlingTeamKey,
      battingTeam: teams[battingTeamKey] || teams.team1,
      bowlingTeam: teams[bowlingTeamKey] || teams.team2,
    });
    setScreen('liveScoring');
  };

  const handleViewSessionByCode = (sessionCode) => {
    setViewerSessionCode(sessionCode);
    setScreen('sessionViewer');
  };

  const handleSelectBattingTeam = (battingTeamKey) => {
    if (!matchConfig || !teamSetupData) return;

    const team1Name = (teamSetupData.team1Name || matchConfig.team1 || 'Team 1').trim();
    const team2Name = (teamSetupData.team2Name || matchConfig.team2 || 'Team 2').trim();
    const team1Players = teamSetupData.team1Players?.length ? teamSetupData.team1Players : ['Player 1', 'Player 2'];
    const team2Players = teamSetupData.team2Players?.length ? teamSetupData.team2Players : ['Player 1', 'Player 2'];
    const teams = {
      team1: { name: team1Name, players: team1Players },
      team2: { name: team2Name, players: team2Players },
    };
    const bowlingTeamKey = battingTeamKey === 'team1' ? 'team2' : 'team1';

    const nextMatchSession = {
      id: `match-${Date.now()}`,
      createdAt: Date.now(),
      createdBy: user?.uid || null,
      sessionCode: createSessionCode(),
      config: matchConfig,
      teams,
      battingTeamKey,
      bowlingTeamKey,
      battingTeam: teams[battingTeamKey],
      bowlingTeam: teams[bowlingTeamKey],
    };
    setMatchSession(nextMatchSession);
    setDoc(doc(firestoreDb, 'matches', nextMatchSession.id), {
      meta: {
        matchId: nextMatchSession.id,
        sport: 'Cricket',
        sessionCode: nextMatchSession.sessionCode,
        createdBy: nextMatchSession.createdBy,
        createdAt: nextMatchSession.createdAt,
        updatedAt: nextMatchSession.createdAt,
      },
      config: nextMatchSession.config,
      teams: {
        team1: teams.team1,
        team2: teams.team2,
        batting: nextMatchSession.battingTeam,
        bowling: nextMatchSession.bowlingTeam,
      },
      innings: {
        currentInnings: 1,
        target: null,
        first: {
          battingTeamKey,
          bowlingTeamKey,
          score: { runs: 0, wickets: 0, overs: '0.0', legalBalls: 0, runRate: 0 },
          extras: { wide: 0, noBall: 0, bye: 0, legBye: 0, total: 0 },
          partnership: { runs: 0, balls: 0 },
          currentBatsmen: [],
          currentBowler: null,
          timeline: [],
          stats: { batting: [], bowling: [] },
        },
        second: {
          battingTeamKey: bowlingTeamKey,
          bowlingTeamKey: battingTeamKey,
          score: { runs: 0, wickets: 0, overs: '0.0', legalBalls: 0, runRate: 0 },
          extras: { wide: 0, noBall: 0, bye: 0, legBye: 0, total: 0 },
          partnership: { runs: 0, balls: 0 },
          currentBatsmen: [],
          currentBowler: null,
          timeline: [],
          stats: { batting: [], bowling: [] },
        },
      },
      timeline: [],
      stats: {
        batting: [],
        bowling: [],
      },
      matchState: {
        status: 'created',
      },
      sessionCode: nextMatchSession.sessionCode,
    }).catch((error) => {
      Alert.alert('Firestore Error', error.message);
    });
    setScreen('liveScoring');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.content, (screen === 'cricketSetup' || screen === 'teamPlayerSetup') && { padding: 0, justifyContent: 'flex-start' }]}>
        {user ? (
          screen === 'sportSelect' ? (
            <SportSelectionScreen
              onBack={() => setScreen('home')}
              onSelectSport={handleSelectSport}
            />
          ) : screen === 'cricketSetup' ? (
            <CricketSetupScreen
              onBack={() => setScreen('sportSelect')}
              onStartMatch={handleStartMatch}
            />
          ) : screen === 'teamPlayerSetup' && matchConfig ? (
            <TeamPlayerSetupScreen
              config={matchConfig}
              onBack={() => setScreen('cricketSetup')}
              onComplete={handleTeamSetupComplete}
            />
          ) : screen === 'toss' && teamSetupData ? (
            <TossScreen
              teams={teamSetupData}
              onBack={() => setScreen('teamPlayerSetup')}
              onSelectBattingTeam={handleSelectBattingTeam}
            />
          ) : screen === 'liveScoring' && matchSession ? (
            <LiveScoreboardScreen
              matchSession={matchSession}
              onBack={() => setScreen('home')}
            />
          ) : screen === 'sessionViewer' && viewerSessionCode ? (
            <MatchViewerScreen
              sessionCode={viewerSessionCode}
              onBack={() => setScreen('home')}
            />
          ) : (
            <HomeScreen
              user={user}
              onStartNew={() => {
                setMatchConfig(null);
                setTeamSetupData(null);
                setMatchSession(null);
                setViewerSessionCode('');
                setScreen('sportSelect');
              }}
              onResumeSession={handleResumeSession}
              onViewSession={handleViewSessionByCode}
            />
          )
        ) : showSignUp ? (
          <SignUpScreen onToggle={() => setShowSignUp(false)} />
        ) : (
          <SignInScreen onToggle={() => setShowSignUp(true)} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2a2a40',
  },
  menuCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2a2a40',
    maxHeight: '88%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a0a0a0',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#0f0f1a',
    color: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a40',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#e94560',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonSecondary: {
    backgroundColor: '#2a2a40',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#e94560',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  linkButton: {
    marginTop: 8,
  },
  menuTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a40',
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 18,
  },
  menuTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
  },
  menuTabActive: {
    backgroundColor: '#e94560',
  },
  menuTabText: {
    color: '#a0a0a0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuTabTextActive: {
    color: '#fff',
  },
  historyList: {
    maxHeight: 360,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f0f1a',
    borderWidth: 1,
    borderColor: '#2a2a40',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  sessionInfo: {
    flex: 1,
    paddingRight: 10,
  },
  sessionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sessionCode: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sessionMeta: {
    color: '#a0a0a0',
    fontSize: 11,
    marginTop: 2,
  },
  continueButton: {
    backgroundColor: '#e94560',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyHistoryText: {
    color: '#a0a0a0',
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 14,
  },
  sportList: {
    maxHeight: 320,
    marginBottom: 8,
  },
  sportButton: {
    backgroundColor: '#0f0f1a',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2a2a40',
    alignItems: 'center',
  },
  sportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

const cricketStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  topBar: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 40,
  },
  field: {
    marginBottom: 32,
  },
  label: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  inputUnderline: {
    height: 2,
    backgroundColor: '#00FF87',
    marginTop: 4,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stepperValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginHorizontal: 24,
    minWidth: 40,
    textAlign: 'center',
  },
  pillToggle: {
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#444',
  },
  pillOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: '#00FF87',
  },
  pillText: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  pillTextActive: {
    color: '#000',
  },
  startButton: {
    backgroundColor: '#00FF87',
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 16,
  },
  startButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  backLink: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
  },
});
