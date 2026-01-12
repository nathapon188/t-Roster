import { Employee, Role, Shift, ShiftStatus } from './types';

export const LOCATIONS = ['Bourke St Cafe', 'Hay St Cafe', 'Main Kitchen'];

export const EMPLOYEES: Employee[] = [
  {
    id: 'open',
    name: 'Open Shifts',
    initials: '?',
    color: 'bg-gray-900 text-white',
    defaultRole: Role.OPEN,
    defaultLocation: 'Bourke St Cafe'
  },
  {
    id: '1',
    name: 'Gary Payne',
    initials: 'GP',
    color: 'bg-blue-100 text-blue-700',
    defaultRole: Role.CHEF,
    defaultLocation: 'Hay St Cafe'
  },
  {
    id: '2',
    name: 'Steve Harris',
    initials: 'SH',
    color: 'bg-emerald-100 text-emerald-700',
    defaultRole: Role.MANAGER,
    defaultLocation: 'Bourke St Cafe'
  },
  {
    id: '3',
    name: 'Crystal S. Gonzalez',
    initials: 'CG',
    color: 'bg-purple-100 text-purple-700',
    defaultRole: Role.WAITER,
    defaultLocation: 'Bourke St Cafe'
  },
  {
    id: '4',
    name: 'Kathleen Johnson',
    initials: 'KJ',
    color: 'bg-amber-100 text-amber-700',
    defaultRole: Role.BARISTA,
    defaultLocation: 'Bourke St Cafe'
  },
  {
    id: '5',
    name: 'Oliver Marin',
    initials: 'OM',
    color: 'bg-rose-100 text-rose-700',
    defaultRole: Role.MANAGER,
    defaultLocation: 'Hay St Cafe'
  },
  {
    id: '6',
    name: 'Bruce Deckand',
    initials: 'BD',
    color: 'bg-indigo-100 text-indigo-700',
    defaultRole: Role.MANAGER,
    defaultLocation: 'Bourke St Cafe',
    hourlyRate: 1058.85
  }
];

// Helper to generate dates relative to today
const today = new Date();
const formatDate = (date: Date) => date.toISOString().split('T')[0];
const getRelativeDate = (diff: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + diff);
  return formatDate(d);
};

export const MOCK_SHIFTS: Shift[] = [
  // Today's Shifts
  {
    id: 's1',
    employeeId: '1',
    startTime: '07:00',
    endTime: '14:00',
    date: getRelativeDate(0),
    location: 'Hay St Cafe',
    role: Role.CHEF,
    status: ShiftStatus.DRAFT,
    duration: 7
  },
  {
    id: 's2',
    employeeId: '2',
    startTime: '09:00',
    endTime: '17:00',
    date: getRelativeDate(0),
    location: 'Bourke St Cafe',
    role: Role.MANAGER,
    status: ShiftStatus.DRAFT,
    duration: 8
  },
  {
    id: 's3',
    employeeId: '3',
    startTime: '09:00',
    endTime: '17:00',
    date: getRelativeDate(0),
    location: 'Bourke St Cafe',
    role: Role.WAITER,
    status: ShiftStatus.LATE,
    duration: 8
  },
  {
    id: 's4',
    employeeId: '4',
    startTime: '09:00',
    endTime: '17:00',
    date: getRelativeDate(0),
    location: 'Bourke St Cafe',
    role: Role.BARISTA,
    status: ShiftStatus.DRAFT,
    duration: 8
  },
  {
    id: 's5',
    employeeId: '5',
    startTime: '09:00',
    endTime: '17:30',
    date: getRelativeDate(0),
    location: 'Hay St Cafe',
    role: Role.MANAGER,
    status: ShiftStatus.DRAFT,
    duration: 8.5
  },
  
  // Weekly Mock Data (Spread out)
  // Monday
  {
    id: 'w1',
    employeeId: 'open',
    startTime: '07:00',
    endTime: '17:00',
    date: getRelativeDate(1), // Tomorrow
    location: 'Bourke St Cafe',
    role: Role.WAITER,
    status: ShiftStatus.DRAFT,
    duration: 9
  },
  {
    id: 'w2',
    employeeId: '6',
    startTime: '12:00',
    endTime: '17:00',
    date: getRelativeDate(1),
    location: 'Bourke St Cafe',
    role: Role.MANAGER,
    status: ShiftStatus.PUBLISHED,
    duration: 5
  },
   // Wednesday
  {
    id: 'w3',
    employeeId: 'open',
    startTime: '11:00',
    endTime: '14:00',
    date: getRelativeDate(3), 
    location: 'Bourke St Cafe',
    role: Role.WAITER,
    status: ShiftStatus.DRAFT,
    duration: 3
  },
  {
    id: 'w4',
    employeeId: '6',
    startTime: '09:00',
    endTime: '17:00',
    date: getRelativeDate(3),
    location: 'Bourke St Cafe',
    role: Role.MANAGER,
    status: ShiftStatus.PUBLISHED,
    duration: 8
  },
    // Thursday
  {
    id: 'w5',
    employeeId: '6',
    startTime: '09:00',
    endTime: '17:00',
    date: getRelativeDate(4),
    location: 'Bourke St Cafe',
    role: Role.MANAGER,
    status: ShiftStatus.LATE, // Simulate alert
    duration: 8
  },
];