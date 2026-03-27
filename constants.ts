import { DbStaff, DbRole, DbShiftDefinition, DbRoster, DbStaffAvailability } from './types';

// --- MOCK DATABASE TABLES ---

export const DB_ROLES: DbRole[] = [
  { role_id: 1, role_name: 'Staff' }
];

// UPDATED: Specific shifts as requested
export const DB_SHIFTS_DEF: DbShiftDefinition[] = [
  { shift_id: 1, shift_name: 'Morning', start_time: '06:00:00', end_time: '10:30:00' },
  { shift_id: 2, shift_name: 'Lunch', start_time: '11:00:00', end_time: '15:00:00' },
  { shift_id: 3, shift_name: 'Evening', start_time: '16:30:00', end_time: '21:00:00' }
];

// UPDATED: New Staff List (9 People)
export const DB_STAFF: DbStaff[] = [
  { staff_id: 1, first_name: 'LINNA', last_name: '', is_active: 1 },
  { staff_id: 8, first_name: 'NAT', last_name: '', is_active: 1 },
  { staff_id: 7, first_name: 'TAN', last_name: '(Teera)', is_active: 1 },
  { staff_id: 2, first_name: 'BRYAN', last_name: '', is_active: 1 },  
  { staff_id: 5, first_name: 'BEN', last_name: '', is_active: 1 },
  { staff_id: 3, first_name: 'GRACE', last_name: '', is_active: 1 },
  { staff_id: 6, first_name: 'SUE', last_name: '', is_active: 1 },
  { staff_id: 4, first_name: 'MAI', last_name: '', is_active: 1 },
  { staff_id: 9, first_name: 'PANG', last_name: '', is_active: 1 }
];

// Mapping: JS Day (0=Sun, 1=Mon...) to DB Day ID (1=Mon... 7=Sun)
export const DAY_MAP: Record<number, number> = {
  1: 1, // Mon
  2: 2, // Tue
  3: 3, // Wed
  4: 4, // Thu
  5: 5, // Fri
  6: 6, // Sat
  0: 7  // Sun
};

// Mock Availability
export const DB_STAFF_AVAILABILITY: DbStaffAvailability[] = [
  // Bryan W (ID 2)
  { availability_id: 2, staff_id: 2, day_id: 4, shift_id: 3, is_available: 0, notes: 'Unavailable' },
  { availability_id: 2, staff_id: 2, day_id: 5, shift_id: 3, is_available: 0, notes: 'Unavailable' },
  { availability_id: 2, staff_id: 2, day_id: 6, shift_id: 3, is_available: 0, notes: 'Unavailable' },
  { availability_id: 2, staff_id: 2, day_id: 7, shift_id: 3, is_available: 0, notes: 'Unavailable' }
  
];

// Helper to generate dates relative to today
const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const getRelativeDate = (diff: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + diff);
  return formatDate(d);
};

export const DB_ROSTER: DbRoster[] = [
  // Today
  { roster_id: 101, staff_id: 1, role_id: 1, day_id: 1, shift_id: 1, roster_date: getRelativeDate(0) },
  { roster_id: 102, staff_id: 2, role_id: 1, day_id: 1, shift_id: 2, roster_date: getRelativeDate(0) },
  { roster_id: 103, staff_id: 3, role_id: 1, day_id: 1, shift_id: 2, roster_date: getRelativeDate(0) },
  
  // Weekly
  { roster_id: 107, staff_id: 4, role_id: 1, day_id: 2, shift_id: 3, roster_date: getRelativeDate(1) },
];

export const LOCATIONS = ['Taringa'];