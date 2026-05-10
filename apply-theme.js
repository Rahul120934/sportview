const fs = require('fs');

function updateStyles(file, searchStr, replacement) {
  const content = fs.readFileSync(file, 'utf-8');
  if (content.includes(searchStr)) {
    fs.writeFileSync(file, content.replace(searchStr, replacement));
    console.log(`Updated ${file}`);
  } else {
    // Attempt regex if string doesn't match directly
    console.log(`String not found exactly in ${file}, trying regex fallback...`);
    const regex = new RegExp('const styles = StyleSheet\\.create\\(\\{[\\s\\S]*?\\}\\);', 'g');
    if (regex.test(content)) {
      fs.writeFileSync(file, content.replace(regex, replacement));
      console.log(`Updated styles in ${file} using regex`);
    } else {
      console.error(`Failed to update ${file}`);
    }
  }
}

// 1. App.js
const appJsContent = fs.readFileSync('App.js', 'utf-8');
const appStylesRegex = /const styles = StyleSheet\.create\(\{[\s\S]*?\}\);\s*const cricketStyles = StyleSheet\.create\(\{[\s\S]*?\}\);/g;
const newAppStyles = `const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F9FAFB',
    color: '#111827',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonSecondary: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#2563EB',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 8,
  },
  menuTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 18,
    padding: 4,
  },
  menuTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  menuTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuTabText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuTabTextActive: {
    color: '#111827',
  },
  historyList: {
    maxHeight: 360,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sessionInfo: {
    flex: 1,
    paddingRight: 10,
  },
  sessionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  sessionCode: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  sessionMeta: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyHistoryText: {
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 15,
    fontWeight: '500',
  },
  sportList: {
    maxHeight: 320,
    marginBottom: 8,
  },
  sportButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sportButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
});

const cricketStyles = StyleSheet.create({
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
    marginBottom: 40,
    textAlign: 'center',
  },
  field: {
    marginBottom: 32,
  },
  label: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    color: '#111827',
    fontSize: 22,
    fontWeight: 'bold',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  inputUnderline: {
    height: 2,
    backgroundColor: '#2563EB',
    marginTop: 4,
    borderRadius: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
  },
  stepperButton: {
    width: 48,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    color: '#111827',
    fontSize: 22,
    fontWeight: 'bold',
  },
  stepperValue: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
    marginHorizontal: 32,
    minWidth: 44,
    textAlign: 'center',
  },
  pillToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 4,
  },
  pillOption: {
    flex: 1,
    paddingVertical: 12,
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
  startButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 'auto',
    marginBottom: 16,
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
fs.writeFileSync('App.js', appJsContent.replace(appStylesRegex, newAppStyles));
console.log('App.js updated');
