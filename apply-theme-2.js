const fs = require('fs');

function replaceStyles(file, newStyles) {
  const content = fs.readFileSync(file, 'utf-8');
  const regex = /const styles = StyleSheet\.create\(\{[\s\S]*?\}\);/g;
  fs.writeFileSync(file, content.replace(regex, newStyles));
  console.log(`${file} updated.`);
}

// 2. TeamPlayerSetupScreen.js
const tpsStyles = `const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
  },
  topBar: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 12,
  },
  field: {
    marginBottom: 8,
  },
  label: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  input: {
    color: '#111827',
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  inputUnderline: {
    height: 2,
    backgroundColor: '#2563EB',
    marginTop: 2,
    borderRadius: 1,
  },
  pillToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    padding: 4,
  },
  pillOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  pillActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pillText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: 'bold',
  },
  pillTextActive: {
    color: '#2563EB',
  },
  countText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  addInput: {
    flex: 1,
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 10,
    marginRight: 12,
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  playerList: {
    flex: 1,
    marginBottom: 16,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  playerNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playerNumberText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: 'bold',
  },
  playerName: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  removeText: {
    color: '#EF4444',
    fontSize: 24,
    fontWeight: '300',
    paddingHorizontal: 4,
  },
  emptyText: {
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 24,
    fontSize: 15,
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  backLink: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
});`;
replaceStyles('TeamPlayerSetupScreen.js', tpsStyles);

// 3. TossScreen.js
const tossStyles = `const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  topBar: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 28,
    fontSize: 15,
    fontWeight: '500',
  },
  optionButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  optionText: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  linkButton: {
    marginTop: 12,
  },
  link: {
    color: '#2563EB',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
});`;
replaceStyles('TossScreen.js', tossStyles);

