const fs = require('fs');
const content = fs.readFileSync('LiveScoreboardScreen.js', 'utf-8');
const returnIndex = content.indexOf('  return (\n    <View style={styles.container}>');
if (returnIndex === -1) {
  console.log('Could not find return statement');
  process.exit(1);
}

const newReturnAndStyles = `  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Score Header */}
        <View style={styles.scoreCard}>
          <View style={styles.scoreHeaderRow}>
            <View style={styles.liveBadgeRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveMatchText}>LIVE MATCH</Text>
            </View>
            <Text style={styles.inningsText}>Innings {activeInnings}</Text>
          </View>
          <Text style={styles.teamsTitle}>{currentSession.battingTeam.name.toUpperCase()} VS {currentSession.bowlingTeam.name.toUpperCase()}</Text>
          <View style={styles.mainScoreRow}>
            <Text style={styles.mainScoreText}>{innings.score.runs}/{innings.score.wickets}</Text>
            <Text style={styles.mainOversText}>({innings.score.overs})</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.crrLabel}>CRR <Text style={styles.crrValue}>{innings.score.runRate}</Text></Text>
            <Text style={styles.projScoreText}>Proj. Score <Text style={styles.projScoreValue}>{Math.round((innings.score.runRate || 0) * (config?.overs || 20))}</Text></Text>
          </View>
          {activeInnings === 2 && (
             <Text style={styles.crrLabel}>Target <Text style={styles.crrValue}>{targetRuns}</Text>  |  Need {runsRequired} in {ballsRemaining}</Text>
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
                <TouchableOpacity key={\`edit-\${button.label}\`} style={styles.modalOption} onPress={() => applyEditToDelivery(button.type, button.value || 0)}>
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
  modalConfirmText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
`;

const updatedContent = content.substring(0, returnIndex) + newReturnAndStyles;
fs.writeFileSync('LiveScoreboardScreen.js', updatedContent, 'utf-8');
console.log('Successfully updated LiveScoreboardScreen.js');
