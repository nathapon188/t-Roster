const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const JSON_FILE = path.join(DATA_DIR, 'shifts.json');
const TEXT_FILE = path.join(DATA_DIR, 'shifts.txt');

const COLUMNS = [
  { key: 'shift_id', label: 'ID' },
  { key: 'shift_name', label: 'SHIFT' },
  { key: 'start_time', label: 'START' },
  { key: 'end_time', label: 'END' }
];

function readShifts() {
  if (!fs.existsSync(JSON_FILE)) return [];

  const raw = fs.readFileSync(JSON_FILE, 'utf8').trim();
  if (!raw) return [];

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('shifts.json must contain a JSON array');
  }

  return parsed.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
}

// Fixed-width table so the .txt stays readable in any viewer.
function toText(shifts) {
  const widths = COLUMNS.map(col =>
    Math.max(col.label.length, ...shifts.map(s => String(s[col.key] ?? '').length), 0)
  );

  const row = values => values.map((v, i) => String(v).padEnd(widths[i])).join('  ').trimEnd();

  const lines = [
    'ROSTER SHIFTS',
    `Generated ${new Date().toLocaleString('en-AU')}`,
    `${shifts.length} shift${shifts.length === 1 ? '' : 's'}`,
    '',
    row(COLUMNS.map(c => c.label)),
    row(widths.map(w => '-'.repeat(w)))
  ];

  for (const shift of shifts) {
    lines.push(row(COLUMNS.map(c => shift[c.key] ?? '')));
  }

  return lines.join('\n') + '\n';
}

// Writes both representations so the JSON and the .txt never drift apart.
function writeShifts(shifts) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(JSON_FILE, JSON.stringify(shifts, null, 2) + '\n', 'utf8');
  fs.writeFileSync(TEXT_FILE, toText(shifts), 'utf8');
  return shifts;
}

module.exports = { readShifts, writeShifts, toText, JSON_FILE, TEXT_FILE };
