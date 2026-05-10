import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { UserPlus, CheckCircle2, GripVertical, MinusCircle, Search, Activity, Home, ScanLine, History as HistoryIcon, Target } from 'lucide-react-native';

const RosterPlayers = [
  { id: 'r1', name: 'Rohit Sharma', role: 'Top Order Batter', type: 'RHB', initials: 'RS', isCaptain: true },
  { id: 'r2', name: 'Jasprit Bumrah', role: 'Bowler', type: 'RHB • Right-arm Fast', initials: 'JB' },
  { id: 'r3', name: 'Virat Kohli', role: 'Top Order Batter', type: 'RHB', initials: 'VK' },
  { id: 'r4', name: 'MS Dhoni', role: 'Wicket Keeper', type: 'RHB', initials: 'MS', isWk: true },
  { id: 'r5', name: 'Ravindra Jadeja', role: 'All-rounder', type: 'LHB • Left-arm Spin', initials: 'RJ' },
];

export default function TeamPlayerSetupScreen({ config, onBack, onComplete }) {
  const [activeTeam, setActiveTeam] = useState('team1');
  const [team1Name, setTeam1Name] = useState(config?.team1 || 'Team 1');
  const [team2Name, setTeam2Name] = useState(config?.team2 || 'Team 2');
  
  const [team1Players, setTeam1Players] = useState([RosterPlayers[2], RosterPlayers[3], RosterPlayers[4]]);
  const [team2Players, setTeam2Players] = useState([RosterPlayers[0], RosterPlayers[1]]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRosterPlayer, setSelectedRosterPlayer] = useState(RosterPlayers[2]);

  const maxPlayers = config?.players || 11;
  const isNamesMode = config?.playerIdentity !== 'anonymous'; // default to names in new UI

  const activePlayers = activeTeam === 'team1' ? team1Players : team2Players;
  const setActivePlayers = activeTeam === 'team1' ? setTeam1Players : setTeam2Players;

  const handleAddPlayer = (player) => {
    if (activePlayers.length >= maxPlayers) {
      Alert.alert('Limit Reached', `You can only add up to ${maxPlayers} players.`);
      return;
    }
    if (activePlayers.find(p => p.id === player.id)) return;
    setActivePlayers(prev => [...prev, player]);
  };

  const handleRemovePlayer = (id) => {
    setActivePlayers(prev => prev.filter(p => p.id !== id));
  };

  const handleSaveSquad = () => {
    if (team1Players.length === 0 || team2Players.length === 0) {
      Alert.alert('Incomplete Teams', 'Both teams must have at least 1 player.');
      return;
    }
    onComplete({
      team1Name,
      team2Name,
      team1Players: team1Players.map((p) => p.name),
      team2Players: team2Players.map((p) => p.name),
    });
  };

  const availableRoster = RosterPlayers.filter(
    p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !activePlayers.find(ap => ap.id === p.id)
  );

  return (
    <View style={styles.container}>
      {/* Fake Top Bar */}
      <View style={styles.topBarContainer}>
        <View style={styles.logoRow}>
          <Activity color="#0047FF" size={24} />
          <Text style={styles.logoText}>STADIUM LIVE</Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>R</Text></View>
      </View>

      <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
        <Text style={styles.mainTitle}>Team Management</Text>
        <Text style={styles.mainSubtitle}>Configure your squad and batting order for the upcoming match.</Text>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.btnInvite}>
            <UserPlus color="#111827" size={16} />
            <Text style={styles.btnInviteText}>Invite Player</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSave} onPress={handleSaveSquad}>
            <CheckCircle2 color="#FFFFFF" size={16} />
            <Text style={styles.btnSaveText}>Save Squad</Text>
          </TouchableOpacity>
        </View>

        {/* Team Toggle */}
        <View style={styles.pillToggle}>
          <TouchableOpacity style={[styles.pillOption, activeTeam === 'team1' && styles.pillActive]} onPress={() => setActiveTeam('team1')}>
            <TextInput style={[styles.pillText, activeTeam === 'team1' && styles.pillTextActive]} value={team1Name} onChangeText={setTeam1Name} placeholder="Team 1" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pillOption, activeTeam === 'team2' && styles.pillActive]} onPress={() => setActiveTeam('team2')}>
             <TextInput style={[styles.pillText, activeTeam === 'team2' && styles.pillTextActive]} value={team2Name} onChangeText={setTeam2Name} placeholder="Team 2" />
          </TouchableOpacity>
        </View>

        {/* Playing XI Card */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Playing XI</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{activePlayers.length} / {maxPlayers} Selected</Text>
          </View>
        </View>

        <View style={styles.xiContainer}>
          {activePlayers.map((player, idx) => (
            <TouchableOpacity key={player.id} style={styles.playerRow} onPress={() => setSelectedRosterPlayer(player)}>
              <GripVertical color="#9CA3AF" size={20} />
              <Text style={styles.playerIndex}>{idx + 1}</Text>
              <View style={styles.playerAvatarSm}>
                <Text style={styles.playerAvatarTextSm}>{player.initials}</Text>
              </View>
              <View style={styles.playerInfo}>
                <View style={styles.playerNameRow}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  {player.isCaptain && <Text style={styles.roleBadgeC}>(C)</Text>}
                  {player.isWk && <Text style={styles.roleBadgeWk}>(WK)</Text>}
                </View>
                <Text style={styles.playerType}>{player.type}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemovePlayer(player.id)}>
                <MinusCircle color="#9CA3AF" size={24} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity style={styles.addDashedBtn}>
            <Text style={styles.addDashedText}>+ Add Player from Roster</Text>
          </TouchableOpacity>
        </View>

        {/* Available Roster */}
        <Text style={styles.sectionTitleSm}>Available Roster</Text>
        <View style={styles.rosterCard}>
          <View style={styles.searchBox}>
            <Search color="#6B7280" size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search players..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          
          {availableRoster.map(player => (
             <TouchableOpacity key={player.id} style={styles.rosterRow} onPress={() => handleAddPlayer(player)}>
               <View style={styles.rosterAvatar}>
                 <Text style={styles.rosterAvatarText}>{player.initials}</Text>
               </View>
               <View style={styles.playerInfo}>
                 <Text style={styles.playerName}>{player.name}</Text>
                 <Text style={styles.playerType}>{player.role}</Text>
               </View>
             </TouchableOpacity>
          ))}
        </View>

        {/* Selected Player Stats */}
        <Text style={styles.sectionTitleSm}>Selected Player Stats</Text>
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <View style={styles.statsAvatar}>
               <Text style={styles.statsAvatarText}>{selectedRosterPlayer.initials}</Text>
            </View>
            <View>
              <Text style={styles.statsName}>{selectedRosterPlayer.name}</Text>
              <Text style={styles.statsRole}>{selectedRosterPlayer.role}</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Matches</Text>
              <Text style={styles.statValue}>42</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Runs</Text>
              <Text style={styles.statValueBig}>1240</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Wickets</Text>
              <Text style={styles.statValue}>14</Text>
            </View>
          </View>
        </View>
        
        <View style={{height: 100}} />
      </ScrollView>

      {/* Fake Bottom Tab Bar */}
      <View style={styles.bottomTabBar}>
        <View style={styles.tabItem}>
          <Target color="#0047FF" size={20} />
          <Text style={styles.tabTextActive}>Scoring</Text>
        </View>
        <View style={styles.tabItem}>
          <HistoryIcon color="#6B7280" size={20} />
          <Text style={styles.tabText}>History</Text>
        </View>
        <View style={styles.tabItem}>
          <ScanLine color="#6B7280" size={20} />
          <Text style={styles.tabText}>Viewer</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F9' },
  topBarContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 18, fontWeight: '900', color: '#0047FF', letterSpacing: 1 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: 'bold' },
  scrollArea: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  mainTitle: { fontSize: 28, fontWeight: '900', color: '#111827', marginBottom: 8 },
  mainSubtitle: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 20 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  btnInvite: { flex: 1, backgroundColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  btnInviteText: { color: '#111827', fontWeight: '700', fontSize: 14 },
  btnSave: { flex: 1, backgroundColor: '#0047FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  btnSaveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  pillToggle: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 8, padding: 4, marginBottom: 24 },
  pillOption: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  pillActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  pillText: { fontSize: 14, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
  pillTextActive: { color: '#0047FF', fontWeight: '800' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  countBadge: { backgroundColor: '#0047FF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  countBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  xiContainer: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 24 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  playerIndex: { fontSize: 14, fontWeight: '800', color: '#0047FF', width: 24, textAlign: 'center', marginRight: 8 },
  playerAvatarSm: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  playerAvatarTextSm: { fontSize: 14, fontWeight: '700', color: '#4B5563' },
  playerInfo: { flex: 1 },
  playerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  playerName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  roleBadgeC: { fontSize: 10, fontWeight: '800', color: '#10B981' },
  roleBadgeWk: { fontSize: 10, fontWeight: '800', color: '#10B981' },
  playerType: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  addDashedBtn: { borderWidth: 1, borderColor: '#A78BFA', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4, backgroundColor: '#FFFFFF' },
  addDashedText: { color: '#4C1D95', fontWeight: '700', fontSize: 14 },
  sectionTitleSm: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 12 },
  rosterCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 24 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, height: 40, marginBottom: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#111827' },
  rosterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  rosterAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rosterAvatarText: { color: '#1E3A8A', fontWeight: '700', fontSize: 14 },
  statsCard: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 20, marginBottom: 40 },
  statsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statsAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  statsAvatarText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  statsName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statsRole: { fontSize: 13, color: '#4B5563', marginTop: 4 },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  statLabel: { fontSize: 11, fontWeight: '700', color: '#4B5563', marginBottom: 8 },
  statValue: { fontSize: 28, fontWeight: '900', color: '#0047FF' },
  statValueBig: { fontSize: 36, fontWeight: '900', color: '#0047FF', letterSpacing: -1, lineHeight: 36 },
  bottomTabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 20 },
  tabItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  tabText: { fontSize: 12, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  tabTextActive: { fontSize: 12, color: '#0047FF', marginTop: 4, fontWeight: '600' },
});
