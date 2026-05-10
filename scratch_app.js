import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Image, Modal } from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { auth, firestoreDb } from './firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, query, setDoc, where, getDocs, limit } from 'firebase/firestore';
import { CheckCircle2, ChevronRight, Activity, Target, Users, Minus, Plus, Search, Home as HomeIcon, History as HistoryIcon, ShieldCheck, Share2, Copy, Trophy, ScanLine, CircleDot } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

import TeamPlayerSetupScreen from './TeamPlayerSetupScreen';
import TossScreen from './TossScreen';
import LiveScoreboardScreen from './LiveScoreboardScreen';
import MatchViewerScreen from './MatchViewerScreen';

const SPORTS = ['Cricket'];

const fallbackTeam = (name) => ({ name, players: ['Player 1', 'Player 2'] });

function formatSessionTime(timestamp) {
  if (!timestamp) return 'Unknown time';
  return new Date(timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function createSessionCode(length = 6) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

async function generateUniqueSessionCode(length = 6) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = createSessionCode(length);
    try {
      const q = query(collection(firestoreDb, 'matches'), where('meta.sessionCode', '==', candidate), limit(1));
      const docs = await getDocs(q);
      if (docs.empty) return candidate;
    } catch (e) {
      return candidate;
    }
  }
  return createSessionCode(length);
}

function TopBar({ onSignOut, email }) {
  return (
    <View style={appStyles.topBarContainer}>
      <View style={appStyles.logoRow}>
        <Activity color="#0047FF" size={24} />
        <Text style={appStyles.logoText}>STADIUM LIVE</Text>
      </View>
      <TouchableOpacity onPress={onSignOut}>
        <View style={appStyles.avatar}>
          <Text style={appStyles.avatarText}>{email ? email[0].toUpperCase() : 'U'}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function BottomTabBar({ activeTab, onTabSelect }) {
  return (
    <View style={appStyles.bottomTabBar}>
      <TouchableOpacity style={appStyles.tabItem} onPress={() => onTabSelect('menu')}>
        <View style={[appStyles.tabIconContainer, activeTab === 'menu' && appStyles.tabIconActive]}>
          <Target color={activeTab === 'menu' ? "#FFFFFF" : "#6B7280"} size={20} />
        </View>
        <Text style={[appStyles.tabText, activeTab === 'menu' && appStyles.tabTextActive]}>Scoring</Text>
      </TouchableOpacity>
      <TouchableOpacity style={appStyles.tabItem} onPress={() => onTabSelect('history')}>
        <View style={[appStyles.tabIconContainer, activeTab === 'history' && appStyles.tabIconActive]}>
          <HistoryIcon color={activeTab === 'history' ? "#FFFFFF" : "#6B7280"} size={20} />
        </View>
        <Text style={[appStyles.tabText, activeTab === 'history' && appStyles.tabTextActive]}>History</Text>
      </TouchableOpacity>
      <TouchableOpacity style={appStyles.tabItem} onPress={() => onTabSelect('viewer')}>
        <View style={[appStyles.tabIconContainer, activeTab === 'viewer' && appStyles.tabIconActive]}>
          <ScanLine color={activeTab === 'viewer' ? "#FFFFFF" : "#6B7280"} size={20} />
        </View>
        <Text style={[appStyles.tabText, activeTab === 'viewer' && appStyles.tabTextActive]}>Viewer</Text>
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

  return (
    <View style={setupStyles.container}>
      <View style={setupStyles.stepIndicator}>
        <View style={setupStyles.stepCircleActive}><Text style={setupStyles.stepNumActive}>1</Text></View>
        <Text style={setupStyles.stepTextActive}>MATCH SETUP</Text>
        <View style={setupStyles.stepLine} />
        <View style={setupStyles.stepCircle}><Text style={setupStyles.stepNum}>2</Text></View>
        <Text style={setupStyles.stepText}>SCORING</Text>
      </View>
      <Text style={setupStyles.mainTitle}>Initialize New Match</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={setupStyles.card}>
          <Text style={setupStyles.label}>TEAM 1 (HOME)</Text>
          <View style={setupStyles.inputBox}>
            <TextInput
              style={setupStyles.input}
              placeholder="Enter team name"
              placeholderTextColor="#9CA3AF"
              value={team1}
              onChangeText={setTeam1}
            />
            <HomeIcon color="#D1D5DB" size={20} />
          </View>
        </View>
        <View style={setupStyles.card}>
          <Text style={setupStyles.label}>TEAM 2 (AWAY)</Text>
          <View style={setupStyles.inputBox}>
            <TextInput
              style={setupStyles.input}
              placeholder="Enter team name"
              placeholderTextColor="#9CA3AF"
              value={team2}
              onChangeText={setTeam2}
            />
            <Activity color="#D1D5DB" size={20} />
          </View>
        </View>

        <View style={setupStyles.card}>
          <Text style={setupStyles.labelTitle}>Match Length</Text>
          <Text style={setupStyles.labelSubtitle}>Select total overs per innings</Text>
          <View style={setupStyles.stepperContainer}>
            <TouchableOpacity style={setupStyles.stepperButton} onPress={decrementOvers}>
              <Minus color="#4B5563" size={24} />
            </TouchableOpacity>
            <View style={setupStyles.stepperValueBox}>
              <Text style={setupStyles.stepperValue}>{overs}</Text>
              <Text style={setupStyles.stepperLabel}>OVERS</Text>
            </View>
            <TouchableOpacity style={setupStyles.stepperButton} onPress={incrementOvers}>
              <Plus color="#4B5563" size={24} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={setupStyles.card}>
          <Text style={setupStyles.labelTitle}>Squad</Text>
          <Text style={setupStyles.labelSubtitle}>Players per side</Text>
          <View style={setupStyles.squadCurrentRow}>
            <Text style={setupStyles.squadCurrentLabel}>CURRENT</Text>
            <Text style={setupStyles.squadCurrentValue}>{players}</Text>
          </View>
          <View style={setupStyles.squadToggleRow}>
            {[8, 11, 15].map(num => (
              <TouchableOpacity
                key={num}
                style={[setupStyles.squadToggleBtn, players === num && setupStyles.squadToggleBtnActive]}
                onPress={() => setPlayers(num)}
              >
                <Text style={[setupStyles.squadToggleText, players === num && setupStyles.squadToggleTextActive]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={setupStyles.arenaCard}>
          <View style={setupStyles.arenaImagePlaceholder}>
            <Text style={setupStyles.arenaTextPlaceholder}>Stadium Image Placeholder</Text>
            <View style={setupStyles.liveTagRow}>
              <View style={setupStyles.liveDot} />
              <Text style={setupStyles.liveTagText}>LIVE ARENA READY</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={setupStyles.launchButton} onPress={() => onStartMatch({ team1, team2, overs, players, playerIdentity })}>
          <Text style={setupStyles.launchButtonText}>LAUNCH MATCH</Text>
          <Activity color="#FFF" size={20} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
        <Text style={setupStyles.launchNote}>All match settings can be modified during the lunch interval.</Text>
      </ScrollView>
    </View>
  );
}

function HomeScreen({ user, onStartNew, onResumeSession, onViewSession }) {
  const [activeTab, setActiveTab] = useState('menu');
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [viewerCode, setViewerCode] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    const matchesQuery = query(collection(firestoreDb, 'matches'), where('meta.createdBy', '==', user.uid));
    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      const nextSessions = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => (b?.meta?.createdAt || 0) - (a?.meta?.createdAt || 0));
      setSessions(nextSessions);
      setSessionsLoading(false);
    });
    return unsubscribe;
  }, [user?.uid]);

  const renderSessionRow = (session) => {
    const team1Name = session?.teams?.team1?.name || 'Team 1';
    const team2Name = session?.teams?.team2?.name || 'Team 2';
    const currentInnings = session?.innings?.currentInnings === 2 ? 'second' : 'first';
    const score = session?.innings?.[currentInnings]?.score || { runs: 0, wickets: 0, overs: '0.0' };
    const status = session?.matchState?.status || 'created';

    return (
      <View key={session.id} style={homeStyles.historyCard}>
        <View style={homeStyles.historyHeader}>
          <Text style={homeStyles.historyDate}>{status === 'completed' ? 'Finalized' : 'Live'} • {formatSessionTime(session?.meta?.createdAt)}</Text>
        </View>
        <View style={homeStyles.historyTeamRow}>
          <View style={[homeStyles.teamColorDot, { backgroundColor: '#DC2626' }]} />
          <Text style={homeStyles.historyTeamName}>{team1Name}</Text>
          <Text style={homeStyles.historyTeamScore}>{session?.innings?.first?.score?.runs || 0}/{session?.innings?.first?.score?.wickets || 0}</Text>
        </View>
        <View style={homeStyles.historyTeamRow}>
          <View style={[homeStyles.teamColorDot, { backgroundColor: '#60A5FA' }]} />
          <Text style={homeStyles.historyTeamName}>{team2Name}</Text>
          <Text style={homeStyles.historyTeamScore}>{session?.innings?.second?.score?.runs || 0}/{session?.innings?.second?.score?.wickets || 0}</Text>
        </View>
        <TouchableOpacity style={homeStyles.historyViewBtn} onPress={() => onResumeSession(session)}>
          <CheckCircle2 color="#10B981" size={16} />
          <Text style={homeStyles.historyViewText}>Resume Session</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={appStyles.container}>
      <TopBar onSignOut={() => signOut(auth)} email={user?.email} />
      
      <ScrollView style={{ flex: 1, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
        {activeTab === 'menu' && (
          <View style={{ paddingBottom: 100 }}>
            <View style={homeStyles.dashboardHeader}>
              <View style={homeStyles.dashDot} />
              <Text style={homeStyles.dashSubtitle}>SCORER DASHBOARD</Text>
            </View>
            <Text style={homeStyles.dashTitle}>Welcome back, Captain.</Text>
            <Text style={homeStyles.dashDesc}>The stadium is packed. Your digital scoreboard is primed and ready for the first delivery.</Text>
            
            <View style={homeStyles.newMatchCard}>
              <View style={homeStyles.newMatchIconBox}>
                <Plus color="#0047FF" size={24} />
              </View>
              <Text style={homeStyles.newMatchTitle}>Start a New Match</Text>
              <Text style={homeStyles.newMatchDesc}>Initialize professional-grade scoring with custom teams, player rosters, and tournament rules.</Text>
              <TouchableOpacity style={homeStyles.newMatchBtn} onPress={onStartNew}>
                <Text style={homeStyles.newMatchBtnText}>BEGIN SESSION</Text>
                <ChevronRight color="#0047FF" size={16} />
              </TouchableOpacity>
            </View>

            <View style={homeStyles.joinCard}>
              <View style={homeStyles.joinHeaderRow}>
                <ScanLine color="#0047FF" size={20} />
                <Text style={homeStyles.joinTitle}>JOIN LIVE SESSION</Text>
              </View>
              <Text style={homeStyles.joinDesc}>Enter a 6-digit match code to co-score or spectate a live match.</Text>
              <View style={homeStyles.joinInputBox}>
                <TextInput
                  style={homeStyles.joinInput}
                  placeholder="C O D E - X X"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  value={viewerCode}
                  onChangeText={setViewerCode}
                />
                <TouchableOpacity onPress={() => onViewSession(viewerCode)}>
                  <ChevronRight color="#0047FF" size={24} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={homeStyles.recentHeaderRow}>
              <Text style={homeStyles.recentTitle}>Recent Sessions</Text>
              <TouchableOpacity onPress={() => setActiveTab('history')}>
                <Text style={homeStyles.recentLink}>VIEW ALL HISTORY</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={homeStyles.recentList}>
              {sessions.slice(0, 3).map(renderSessionRow)}
            </ScrollView>

            <View style={homeStyles.statsRow}>
              <View style={homeStyles.statCard}>
                <View style={homeStyles.statIcon}><Activity color="#0047FF" size={16} /></View>
                <View>
                  <Text style={homeStyles.statLabel}>MATCHES SCORED</Text>
                  <Text style={homeStyles.statValue}>{sessions.length}</Text>
                </View>
              </View>
              <View style={homeStyles.statCard}>
                <View style={homeStyles.statIcon}><Target color="#0047FF" size={16} /></View>
                <View>
                  <Text style={homeStyles.statLabel}>ACCURACY RATING</Text>
                  <Text style={homeStyles.statValue}>99.2%</Text>
                </View>
              </View>
              <View style={homeStyles.statCard}>
                <View style={homeStyles.statIcon}><Users color="#0047FF" size={16} /></View>
                <View>
                  <Text style={homeStyles.statLabel}>LEAGUE RANK</Text>
                  <Text style={homeStyles.statValue}>#12</Text>
                </View>
              </View>
            </View>
          </View>
        )}
        {activeTab === 'history' && (
          <View style={{ paddingBottom: 100 }}>
             <View style={homeStyles.dashboardHeader}>
              <View style={homeStyles.dashDot} />
              <Text style={homeStyles.dashSubtitle}>ARCHIVE</Text>
            </View>
            <Text style={homeStyles.dashTitle}>Match History</Text>
            <View style={homeStyles.historyTabs}>
              <View style={homeStyles.historyTabActive}><Text style={homeStyles.historyTabTextActive}>All Matches</Text></View>
              <View style={homeStyles.historyTab}><Text style={homeStyles.historyTabText}>Tournaments</Text></View>
            </View>
            {sessions.map((session) => (
              <View key={session.id} style={homeStyles.fullHistoryCard}>
                <View style={homeStyles.fhHeader}>
                  <Text style={homeStyles.fhDate}>{formatSessionTime(session?.meta?.createdAt).toUpperCase()}</Text>
                  <Text style={homeStyles.fhStatus}>COMPLETED</Text>
                </View>
                <Text style={homeStyles.fhSub}>Stadium Arena</Text>
                <View style={homeStyles.fhTeamRow}>
                  <View style={[homeStyles.teamColorDot, { backgroundColor: '#D97706', width: 24, height: 24, borderRadius: 12 }]} />
                  <Text style={homeStyles.fhTeamName}>{session?.teams?.team1?.name || 'Team 1'}</Text>
                  <View style={{alignItems: 'flex-end'}}>
                    <Text style={homeStyles.fhScore}>{session?.innings?.first?.score?.runs || 0}/{session?.innings?.first?.score?.wickets || 0}</Text>
                    <Text style={homeStyles.fhOvers}>({session?.innings?.first?.score?.overs || '0.0'})</Text>
                  </View>
                </View>
                <View style={homeStyles.fhTeamRow}>
                  <View style={[homeStyles.teamColorDot, { backgroundColor: '#4B5563', width: 24, height: 24, borderRadius: 12 }]} />
                  <Text style={homeStyles.fhTeamName}>{session?.teams?.team2?.name || 'Team 2'}</Text>
                  <View style={{alignItems: 'flex-end'}}>
                    <Text style={homeStyles.fhScore}>{session?.innings?.second?.score?.runs || 0}/{session?.innings?.second?.score?.wickets || 0}</Text>
                    <Text style={homeStyles.fhOvers}>({session?.innings?.second?.score?.overs || '0.0'})</Text>
                  </View>
                </View>
                <TouchableOpacity style={homeStyles.fhBtn} onPress={() => onResumeSession(session)}>
                  <Text style={homeStyles.fhBtnText}>View Full Scorecard</Text>
                  <ChevronRight color="#FFF" size={16} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        {activeTab === 'viewer' && (
          <View style={{ paddingBottom: 100, paddingTop: 40, alignItems: 'center' }}>
            <ScanLine color="#0047FF" size={48} />
            <Text style={[homeStyles.dashTitle, { marginTop: 20, textAlign: 'center' }]}>Match Viewer</Text>
            <Text style={[homeStyles.dashDesc, { textAlign: 'center', marginBottom: 30 }]}>Enter a match code to spectate.</Text>
            <TextInput
              style={[homeStyles.joinInput, { width: '100%', marginBottom: 20, borderWidth: 1, borderColor: '#D1D5DB' }]}
              placeholder="Enter Session Code"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="characters"
              value={viewerCode}
              onChangeText={setViewerCode}
            />
            <TouchableOpacity style={homeStyles.newMatchBtn} onPress={() => onViewSession(viewerCode)}>
              <Text style={homeStyles.newMatchBtnText}>View Match</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <BottomTabBar activeTab={activeTab} onTabSelect={setActiveTab} />
    </View>
  );
}

// ... SignInScreen, SignUpScreen (can keep them similar or style them)
function SignInScreen({ onToggle }) {
  // same implementation...
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const handleSignIn = async () => { /* ... */ };
  return (
    <View style={appStyles.container}>
      <TopBar email="" onSignOut={() => {}} />
      <View style={{ padding: 20, justifyContent: 'center', flex: 1 }}>
        <Text style={homeStyles.dashTitle}>Welcome Back</Text>
        <TextInput style={[homeStyles.joinInput, { borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 }]} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={[homeStyles.joinInput, { borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 }]} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={[homeStyles.newMatchBtn, { alignSelf: 'stretch' }]} onPress={async () => { setLoading(true); try { await signInWithEmailAndPassword(auth, email, password); } catch(e){ Alert.alert('Error', e.message); } setLoading(false); }}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={homeStyles.newMatchBtnText}>Sign In</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggle} style={{ marginTop: 20 }}><Text style={{ color: '#0047FF', textAlign: 'center' }}>Create an account</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function SignUpScreen({ onToggle }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <View style={appStyles.container}>
      <TopBar email="" onSignOut={() => {}} />
      <View style={{ padding: 20, justifyContent: 'center', flex: 1 }}>
        <Text style={homeStyles.dashTitle}>Join Stadium Live</Text>
        <TextInput style={[homeStyles.joinInput, { borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 }]} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
        <TextInput style={[homeStyles.joinInput, { borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 }]} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={[homeStyles.newMatchBtn, { alignSelf: 'stretch' }]} onPress={async () => { setLoading(true); try { await createUserWithEmailAndPassword(auth, email, password); } catch(e){ Alert.alert('Error', e.message); } setLoading(false); }}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={homeStyles.newMatchBtnText}>Sign Up</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggle} style={{ marginTop: 20 }}><Text style={{ color: '#0047FF', textAlign: 'center' }}>Already have an account? Sign In</Text></TouchableOpacity>
      </View>
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
  const [sessionCreatedModal, setSessionCreatedModal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setScreen('home');
    });
    return unsubscribe;
  }, []);

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
    // ... same as before
    const teams = { team1: session?.teams?.team1 || fallbackTeam('Team 1'), team2: session?.teams?.team2 || fallbackTeam('Team 2') };
    const battingTeamKey = session?.innings?.first?.battingTeamKey || 'team1';
    const bowlingTeamKey = session?.innings?.first?.bowlingTeamKey || (battingTeamKey === 'team1' ? 'team2' : 'team1');
    setMatchConfig(session?.config || { overs: 20, players: 11 });
    setTeamSetupData(null);
    setMatchSession({
      id: session.id || session?.meta?.matchId, createdAt: session?.meta?.createdAt || Date.now(),
      createdBy: session?.meta?.createdBy || user?.uid || null, sessionCode: session?.meta?.sessionCode || session?.sessionCode || null,
      config: session?.config || { overs: 20, players: 11 }, teams, battingTeamKey, bowlingTeamKey,
      battingTeam: teams[battingTeamKey] || teams.team1, bowlingTeam: teams[bowlingTeamKey] || teams.team2,
    });
    setScreen('liveScoring');
  };

  const handleViewSessionByCode = (sessionCode) => {
    setViewerSessionCode(sessionCode);
    setScreen('sessionViewer');
  };

  const handleSelectBattingTeam = async (battingTeamKey) => {
    if (!matchConfig || !teamSetupData) return;
    const team1Name = (teamSetupData.team1Name || matchConfig.team1 || 'Team 1').trim();
    const team2Name = (teamSetupData.team2Name || matchConfig.team2 || 'Team 2').trim();
    const team1Players = teamSetupData.team1Players?.length ? teamSetupData.team1Players : ['Player 1', 'Player 2'];
    const team2Players = teamSetupData.team2Players?.length ? teamSetupData.team2Players : ['Player 1', 'Player 2'];
    const teams = { team1: { name: team1Name, players: team1Players }, team2: { name: team2Name, players: team2Players } };
    const bowlingTeamKey = battingTeamKey === 'team1' ? 'team2' : 'team1';

    const nextMatchSession = {
      id: `match-${Date.now()}`, createdAt: Date.now(), createdBy: user?.uid || null,
      sessionCode: await generateUniqueSessionCode(), config: matchConfig, teams, battingTeamKey, bowlingTeamKey,
      battingTeam: teams[battingTeamKey], bowlingTeam: teams[bowlingTeamKey],
    };
    setMatchSession(nextMatchSession);
    
    // Create firestore doc
    setDoc(doc(firestoreDb, 'matches', nextMatchSession.id), {
      meta: { matchId: nextMatchSession.id, sport: 'Cricket', sessionCode: nextMatchSession.sessionCode, createdBy: nextMatchSession.createdBy, createdAt: nextMatchSession.createdAt, updatedAt: nextMatchSession.createdAt },
      config: nextMatchSession.config, teams: { team1: teams.team1, team2: teams.team2, batting: nextMatchSession.battingTeam, bowling: nextMatchSession.bowlingTeam },
      innings: { currentInnings: 1, target: null, first: { battingTeamKey, bowlingTeamKey, score: { runs: 0, wickets: 0, overs: '0.0', legalBalls: 0, runRate: 0 }, extras: { wide: 0, noBall: 0, bye: 0, legBye: 0, total: 0 }, partnership: { runs: 0, balls: 0 }, currentBatsmen: [], currentBowler: null, timeline: [], stats: { batting: [], bowling: [] } }, second: { battingTeamKey: bowlingTeamKey, bowlingTeamKey: battingTeamKey, score: { runs: 0, wickets: 0, overs: '0.0', legalBalls: 0, runRate: 0 }, extras: { wide: 0, noBall: 0, bye: 0, legBye: 0, total: 0 }, partnership: { runs: 0, balls: 0 }, currentBatsmen: [], currentBowler: null, timeline: [], stats: { batting: [], bowling: [] } } },
      timeline: [], stats: { batting: [], bowling: [] }, matchState: { status: 'created' }, sessionCode: nextMatchSession.sessionCode,
    }).catch(e => Alert.alert('Error', e.message));

    setSessionCreatedModal(true);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
        <StatusBar style="dark" />
        {user ? (
          screen === 'cricketSetup' ? <CricketSetupScreen onBack={() => setScreen('home')} onStartMatch={handleStartMatch} /> :
          screen === 'teamPlayerSetup' ? <TeamPlayerSetupScreen config={matchConfig} onBack={() => setScreen('cricketSetup')} onComplete={handleTeamSetupComplete} /> :
          screen === 'toss' ? <TossScreen teams={teamSetupData} onBack={() => setScreen('teamPlayerSetup')} onSelectBattingTeam={handleSelectBattingTeam} /> :
          screen === 'liveScoring' ? <LiveScoreboardScreen matchSession={matchSession} onBack={() => setScreen('home')} /> :
          screen === 'sessionViewer' ? <MatchViewerScreen sessionCode={viewerSessionCode} onBack={() => setScreen('home')} /> :
          <HomeScreen user={user} onStartNew={() => setScreen('cricketSetup')} onResumeSession={handleResumeSession} onViewSession={handleViewSessionByCode} />
        ) : showSignUp ? <SignUpScreen onToggle={() => setShowSignUp(false)} /> : <SignInScreen onToggle={() => setShowSignUp(true)} />}

        {/* Session Created Modal */}
        <Modal visible={sessionCreatedModal} transparent animationType="slide">
          <View style={modalStyles.backdrop}>
            <View style={modalStyles.card}>
              <View style={modalStyles.successIconBox}>
                <CheckCircle2 color="#10B981" size={40} />
              </View>
              <Text style={modalStyles.title}>Session Created!</Text>
              <Text style={modalStyles.desc}>Your live scoring session is ready. Fans can scan to follow the scores in real-time.</Text>
              <View style={modalStyles.qrWrapper}>
                <View style={modalStyles.liveBadge}><Text style={modalStyles.liveBadgeText}>• LIVE</Text></View>
                <View style={{ padding: 20, backgroundColor: '#FFF', borderRadius: 16, elevation: 4 }}>
                  {matchSession?.sessionCode ? <QRCode value={`https://viewer-51105.web.app/match/${matchSession.sessionCode}`} size={140} /> : <ActivityIndicator />}
                </View>
              </View>
              <Text style={modalStyles.codeLabel}>UNIQUE SESSION CODE</Text>
              <View style={modalStyles.codeBox}>
                <Text style={modalStyles.codeText}>{matchSession?.sessionCode?.match(/.{1,3}/g)?.join('  ') || '...'}</Text>
                <Copy color="#0047FF" size={20} />
              </View>
              <TouchableOpacity style={modalStyles.primaryBtn} onPress={() => {}}>
                <Share2 color="#FFF" size={16} />
                <Text style={modalStyles.primaryBtnText}>Share Link</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.secondaryBtn} onPress={() => { setSessionCreatedModal(false); setScreen('liveScoring'); }}>
                <Activity color="#0047FF" size={16} />
                <Text style={modalStyles.secondaryBtnText}>Start Scoring</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginTop: 20 }} onPress={() => { setSessionCreatedModal(false); setScreen('home'); }}>
                <Text style={{ color: '#4B5563' }}>← Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// STYLES
const appStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  topBarContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#F4F6F9' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 18, fontWeight: '900', color: '#0047FF', letterSpacing: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: 'bold' },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 20 },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabIconContainer: { padding: 12, borderRadius: 24 },
  tabIconActive: { backgroundColor: '#0047FF' },
  tabText: { fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  tabTextActive: { color: '#0047FF' },
});

const homeStyles = StyleSheet.create({
  dashboardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  dashDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0047FF' },
  dashSubtitle: { fontSize: 12, fontWeight: '700', color: '#0047FF', letterSpacing: 0.5 },
  dashTitle: { fontSize: 28, fontWeight: '900', color: '#111827', lineHeight: 34, marginBottom: 12 },
  dashDesc: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 24 },
  newMatchCard: { backgroundColor: '#0A57FF', borderRadius: 16, padding: 24, marginBottom: 20, overflow: 'hidden' },
  newMatchIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  newMatchTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  newMatchDesc: { fontSize: 13, color: '#D1DBFE', lineHeight: 18, marginBottom: 20 },
  newMatchBtn: { backgroundColor: '#FFF', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  newMatchBtnText: { color: '#0047FF', fontWeight: '800', fontSize: 12 },
  joinCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  joinHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  joinTitle: { fontSize: 12, fontWeight: '800', color: '#111827', letterSpacing: 0.5 },
  joinDesc: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  joinInputBox: { backgroundColor: '#F3F4F6', borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48 },
  joinInput: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: 2 },
  recentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  recentTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  recentLink: { fontSize: 12, fontWeight: '700', color: '#0047FF' },
  recentList: { marginBottom: 24 },
  historyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, width: 260, marginRight: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  historyDate: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  historyTeamRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  teamColorDot: { width: 16, height: 16, borderRadius: 8, marginRight: 8 },
  historyTeamName: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  historyTeamScore: { fontSize: 16, fontWeight: '800', color: '#111827' },
  historyViewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  historyViewText: { fontSize: 13, color: '#10B981', fontWeight: '600' },
  statsRow: { marginBottom: 40 },
  statCard: { backgroundColor: '#E5E7EB', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  statIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 10, fontWeight: '800', color: '#4B5563', letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '900', color: '#111827' },
  historyTabs: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 8, padding: 4, marginBottom: 20 },
  historyTabActive: { flex: 1, backgroundColor: '#FFF', borderRadius: 6, paddingVertical: 8, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  historyTab: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  historyTabTextActive: { fontSize: 13, fontWeight: '700', color: '#0047FF' },
  historyTabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  fullHistoryCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  fhHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  fhDate: { fontSize: 11, fontWeight: '700', color: '#0047FF', backgroundColor: '#E0E7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  fhStatus: { fontSize: 11, fontWeight: '700', color: '#10B981' },
  fhSub: { fontSize: 12, color: '#6B7280', marginTop: 8, fontStyle: 'italic', marginBottom: 16 },
  fhTeamRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  fhTeamName: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827' },
  fhScore: { fontSize: 20, fontWeight: '900', color: '#0047FF' },
  fhOvers: { fontSize: 11, color: '#6B7280', fontWeight: '600', textAlign: 'right' },
  fhBtn: { backgroundColor: '#0047FF', borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, marginTop: 8, gap: 8 },
  fhBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 }
});

const setupStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9', paddingHorizontal: 20, paddingTop: 20 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  stepCircleActive: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0047FF', alignItems: 'center', justifyContent: 'center' },
  stepNumActive: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  stepTextActive: { fontSize: 12, fontWeight: '700', color: '#0047FF', marginLeft: 8 },
  stepLine: { flex: 1, height: 1, backgroundColor: '#D1D5DB', marginHorizontal: 12 },
  stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: '#6B7280', fontSize: 12, fontWeight: 'bold' },
  stepText: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginLeft: 8 },
  mainTitle: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 24 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  label: { fontSize: 11, fontWeight: '800', color: '#111827', letterSpacing: 0.5, marginBottom: 8 },
  inputBox: { backgroundColor: '#F3F4F6', borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48 },
  input: { flex: 1, fontSize: 16, color: '#111827' },
  labelTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  labelSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16, marginTop: 4 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F3F4F6', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12 },
  stepperButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  stepperValueBox: { alignItems: 'center' },
  stepperValue: { fontSize: 32, fontWeight: '900', color: '#0047FF' },
  stepperLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  squadCurrentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  squadCurrentLabel: { fontSize: 12, fontWeight: '700', color: '#111827' },
  squadCurrentValue: { fontSize: 24, fontWeight: '800', color: '#10B981' },
  squadToggleRow: { flexDirection: 'row', gap: 8 },
  squadToggleBtn: { flex: 1, backgroundColor: '#F3F4F6', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  squadToggleBtnActive: { backgroundColor: '#0047FF' },
  squadToggleText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  squadToggleTextActive: { color: '#FFF' },
  arenaCard: { height: 160, borderRadius: 16, backgroundColor: '#111827', overflow: 'hidden', marginBottom: 24, justifyContent: 'flex-end', padding: 16 },
  arenaImagePlaceholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  arenaTextPlaceholder: { color: '#6B7280', fontWeight: 'bold' },
  liveTagRow: { position: 'absolute', bottom: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveTagText: { color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  launchButton: { backgroundColor: '#0047FF', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  launchButtonText: { color: '#FFF', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  launchNote: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 12, marginBottom: 40 }
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(243, 244, 246, 0.95)', justifyContent: 'center', padding: 24 },
  card: { alignItems: 'center' },
  successIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '900', color: '#0047FF', marginBottom: 12 },
  desc: { fontSize: 15, color: '#4B5563', textAlign: 'center', marginBottom: 32, paddingHorizontal: 20 },
  qrWrapper: { position: 'relative', marginBottom: 32 },
  liveBadge: { position: 'absolute', top: -12, right: -20, backgroundColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, zIndex: 10, borderWidth: 2, borderColor: '#FFF' },
  liveBadgeText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  codeLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', letterSpacing: 1, marginBottom: 8 },
  codeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E5E7EB', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12, gap: 16, marginBottom: 32 },
  codeText: { fontSize: 32, fontWeight: '900', color: '#111827', letterSpacing: 4 },
  primaryBtn: { backgroundColor: '#0047FF', width: '100%', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 16 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#FFF', width: '100%', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#0047FF' },
  secondaryBtnText: { color: '#0047FF', fontSize: 16, fontWeight: '700' }
});

