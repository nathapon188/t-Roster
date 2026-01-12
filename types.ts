export enum Role {
  MANAGER = 'Manager',
  CHEF = 'Chef',
  WAITER = 'Waiter',
  BARISTA = 'Barista',
  OPEN = 'Open Shift'
}

export enum ShiftStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
  LATE = 'Late for Clock In',
  COMPLETED = 'Completed'
}

export interface Employee {
  id: string;
  name: string;
  initials: string; // Initials to display (e.g., "GP")
  color: string;    // Tailwind classes for background and text color
  defaultRole: Role;
  defaultLocation: string;
  hourlyRate?: number;
}

export interface Shift {
  id: string;
  employeeId: string; // If null, it's an Open Shift
  startTime: string; // ISO String or similar for sorting, but keeping simple HH:mm for this demo
  endTime: string;
  date: string; // YYYY-MM-DD
  location: string;
  role: Role;
  status: ShiftStatus;
  duration: number; // in hours
}

export type ViewMode = 'daily' | 'weekly';