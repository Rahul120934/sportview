import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { auth, database } from './firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import TeamPlayerSetupScreen from './TeamPlayerSetupScreen';
import TossScreen from './TossScreen';
import LiveScoreboardScreen from './LiveScoreboardScreen';

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

function HomeScreen({ user, onStartNew }) {
  const handleViewSession = () => {
    Alert.alert('View a Session', 'Session viewer screen coming soon!');
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Hello, {user.email}</Text>
      <Text style={styles.subtitle}>Choose an option to continue</Text>
      <TouchableOpacity style={styles.button} onPress={onStartNew}>
        <Text style={styles.buttonText}>Start a New Session</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleViewSession}>
        <Text style={styles.buttonTextSecondary}>View a Session</Text>
      </TouchableOpacity>
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
    setScreen('teamPlayerSetup');
  };

  const handleTeamSetupComplete = (teamData) => {
    setTeamSetupData(teamData);
    setScreen('toss');
  };

  const handleSelectBattingTeam = (battingTeamKey) => {
    if (!matchConfig || !teamSetupData) return;

    const isTeam1Batting = battingTeamKey === 'team1';
    const team1Name = (teamSetupData.team1Name || matchConfig.team1 || 'Team 1').trim();
    const team2Name = (teamSetupData.team2Name || matchConfig.team2 || 'Team 2').trim();
    const team1Players = teamSetupData.team1Players?.length ? teamSetupData.team1Players : ['Player 1', 'Player 2'];
    const team2Players = teamSetupData.team2Players?.length ? teamSetupData.team2Players : ['Player 1', 'Player 2'];
    const battingTeam = {
      name: isTeam1Batting ? team1Name : team2Name,
      players: isTeam1Batting ? team1Players : team2Players,
    };
    const bowlingTeam = {
      name: isTeam1Batting ? team2Name : team1Name,
      players: isTeam1Batting ? team2Players : team1Players,
    };

    const nextMatchSession = {
      id: `match-${Date.now()}`,
      createdAt: Date.now(),
      createdBy: user?.uid || null,
      config: matchConfig,
      battingTeam,
      bowlingTeam,
    };
    setMatchSession(nextMatchSession);
    set(ref(database, `matches/${nextMatchSession.id}`), {
      meta: {
        matchId: nextMatchSession.id,
        sport: 'Cricket',
        createdBy: nextMatchSession.createdBy,
        createdAt: nextMatchSession.createdAt,
        updatedAt: nextMatchSession.createdAt,
      },
      config: nextMatchSession.config,
      teams: {
        team1: nextMatchSession.battingTeam,
        team2: nextMatchSession.bowlingTeam,
        batting: nextMatchSession.battingTeam,
        bowling: nextMatchSession.bowlingTeam,
      },
      deliveries: [],
      innings: {
        currentInnings: 1,
        target: null,
        first: {
          battingTeamKey: 'team1',
          bowlingTeamKey: 'team2',
          deliveries: [],
          score: { runs: 0, wickets: 0, overs: '0.0', legalBalls: 0, runRate: 0 },
          extras: { wide: 0, noBall: 0, bye: 0, legBye: 0, total: 0 },
          partnership: { runs: 0, balls: 0 },
          currentBatsmen: [],
          currentBowler: null,
          timeline: [],
          stats: { batting: [], bowling: [] },
        },
        second: {
          battingTeamKey: 'team2',
          bowlingTeamKey: 'team1',
          deliveries: [],
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
              onBack={() => setScreen('toss')}
            />
          ) : (
            <HomeScreen user={user} onStartNew={() => setScreen('sportSelect')} />
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
