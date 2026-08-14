// Regenerates data/shifts.txt from data/shifts.json. Run: npm run export:text
const store = require('./store');

try {
  const shifts = store.readShifts();
  store.writeShifts(shifts);
  console.log(`✅ Wrote ${shifts.length} shifts to ${store.TEXT_FILE}`);
} catch (error) {
  console.error('❌ EXPORT ERROR:', error.message);
  process.exit(1);
}
