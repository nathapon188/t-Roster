// --- Database Schema Interfaces ---

export interface DbStaff {
  staff_id: number;
  first_name: string;
  last_name: string;
  is_active: number; // tinyint(1)
  created_at?: string;
}

export interface DbRole {
  role_id: number;
  role_name: string;
}

export interface DbShiftDefinition {
  shift_id: number;
  shift_name: string;
  start_time: string; // 'HH:mm:ss'
  end_time: string;   // 'HH:mm:ss'
}

export interface DbRoster {
  roster_id: number;
  staff_id: number;
  role_id: number;
  day_id: number;
  shift_id: number;
  roster_date: string; // 'YYYY-MM-DD'
  start_time_override?: string; // 'HH:mm:ss'
  end_time_override?: string;   // 'HH:mm:ss'
  notes?: string;
}

export interface DbStaffAvailability {
  availability_id: number;
  staff_id: number;
  day_id: number; // 1=Mon, 7=Sun
  shift_id: number;
  is_available: number; // 0 or 1
  notes?: string;
}

// --- Frontend UI Interfaces ---

// Helper enum for UI logic (mapped from DbRole)
export enum RoleName {
  MANAGER = 'Manager',
  CHEF = 'Chef',
  WAITER = 'Waiter',
  BARISTA = 'Barista',
  OPEN = 'Open Shift'
}

export enum ShiftStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
  LATE = 'Late',
  COMPLETED = 'Completed'
}

// UI Employee Object (Mapped from DbStaff)
export interface Employee {
  id: string; // Mapped from staff_id
  name: string; // Computed first + last
  initials: string; // Computed
  color: string; // Computed/Assigned
  defaultRole: string;
  defaultLocation: string;
}

// UI Shift Object (Mapped from DbRoster + Joins)
export interface Shift {
  id: string; // roster_id
  employeeId: string; // staff_id
  startTime: string; // from DbShiftDefinition
  endTime: string;   // from DbShiftDefinition
  date: string;      // roster_date
  location: string;
  role: string;      // role_name
  status: ShiftStatus; // Mocked for UI
  duration: number;  // Computed
  notes?: string;
}

export type ViewMode = 'daily' | 'weekly';