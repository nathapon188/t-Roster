import { Shift, ShiftStatus, Employee, DbRoster, DbShiftDefinition, DbStaffAvailability, DbClosedDate, RosterState, RosterTemplateEntry, StaffGroup } from '../types';
import { DB_STAFF, DB_ROLES, DB_SHIFTS_DEF, DB_ROSTER, DB_STAFF_AVAILABILITY, DAY_MAP, DEFAULT_STAFF_GROUPS, DEFAULT_STAFF_ORDER } from '../constants';
import { sync } from './sync';

// Helper to assign colors based on staff ID/Index (Deterministic)
const COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-purple-100 text-purple-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-indigo-100 text-indigo-700',
  'bg-cyan-100 text-cyan-700'
];

// Ids have to be unique across devices, not just within one browser: two people
// adding a shift at once must not land on the same roster_id and overwrite each
// other in the merge. Millisecond clock plus a random tail, well inside
// Number.MAX_SAFE_INTEGER.
const nextRosterId = () => Date.now() * 1000 + Math.floor(Math.random() * 1000);

const readJson = <T,>(key: string, fallback: T): T => {
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  try {
    return JSON.parse(saved) as T;
  } catch (e) {
    console.error(`Failed to parse ${key}`, e);
    return fallback;
  }
};

class DatabaseService {
  private connected = true;
  // In-memory mock tables
  private rosterTable: DbRoster[] = [];
  private closedDatesTable: DbClosedDate[] = [];
  private templateTable: RosterTemplateEntry[] | null = null;
  private staffOrder: number[] = [];
  private staffGroups: Record<string, StaffGroup> = {};
  // roster_id of every shift deleted here, so another device's stale copy
  // cannot bring it back on the next sync.
  private deletedIds: number[] = [];

  private changeListeners = new Set<() => void>();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    this.rosterTable = readJson<DbRoster[]>('staff_roster_data', [...DB_ROSTER]);
    this.closedDatesTable = readJson<DbClosedDate[]>('closed_dates', []);
    this.templateTable = readJson<RosterTemplateEntry[] | null>('roster_template', null);
    this.staffOrder = readJson<number[]>('roster_staff_order', [...DEFAULT_STAFF_ORDER]);
    this.staffGroups = readJson<Record<string, StaffGroup>>('roster_staff_groups', { ...DEFAULT_STAFF_GROUPS });
    this.deletedIds = readJson<number[]>('roster_deleted_ids', []);
  }

  private saveToStorage() {
    localStorage.setItem('staff_roster_data', JSON.stringify(this.rosterTable));
    localStorage.setItem('closed_dates', JSON.stringify(this.closedDatesTable));
    localStorage.setItem('roster_template', JSON.stringify(this.templateTable));
    localStorage.setItem('roster_staff_order', JSON.stringify(this.staffOrder));
    localStorage.setItem('roster_staff_groups', JSON.stringify(this.staffGroups));
    localStorage.setItem('roster_deleted_ids', JSON.stringify(this.deletedIds));
  }

  /** Save locally, then let the other devices know 1.2s after the last change. */
  private commit() {
    this.saveToStorage();
    sync.markDirty();
  }

  // --- Shared store plumbing ---

  /** Anything that changes underneath the UI, including a pull from another device. */
  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notify() {
    this.changeListeners.forEach(l => l());
  }

  private getState = (): RosterState => ({
    roster: this.rosterTable,
    closed: this.closedDatesTable,
    template: this.templateTable,
    staffOrder: this.staffOrder,
    staffGroups: this.staffGroups,
    deleted: this.deletedIds,
  });

  private applyState = (state: RosterState) => {
    this.rosterTable = state.roster;
    this.closedDatesTable = state.closed;
    this.templateTable = state.template;
    if (state.staffOrder.length) this.staffOrder = state.staffOrder;
    if (Object.keys(state.staffGroups).length) this.staffGroups = state.staffGroups;
    this.deletedIds = state.deleted;
    this.saveToStorage();
    this.notify();
  };

  private toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async connect(): Promise<boolean> {
    console.log(`[Local] Initializing local storage database...`);
    this.connected = true;
    sync.attach(this.getState, this.applyState);
    sync.start();
    return true;
  }

  // --- Staff order and Kitchen/Floor grouping ---

  getStaffGroup(staffId: string | number): StaffGroup {
    return this.staffGroups[String(staffId)] || DEFAULT_STAFF_GROUPS[String(staffId)] || 'floor';
  }

  /** Staff ids in display order: anyone missing from the saved order goes last. */
  private orderedStaffIds(): number[] {
    const known = this.staffOrder.filter(id => DB_STAFF.some(s => s.staff_id === id));
    const missing = DB_STAFF.map(s => s.staff_id).filter(id => !known.includes(id));
    return [...known, ...missing];
  }

  /** Persist a new row order, and the group each row now sits in. */
  async setStaffOrder(orderedIds: (string | number)[], groups?: Record<string, StaffGroup>): Promise<void> {
    this.ensureConnection();
    this.staffOrder = orderedIds.map(id => Number(id));
    if (groups) this.staffGroups = { ...this.staffGroups, ...groups };
    this.commit();
    this.notify();
  }

  async setStaffGroup(staffId: string | number, group: StaffGroup): Promise<void> {
    this.ensureConnection();
    this.staffGroups = { ...this.staffGroups, [String(staffId)]: group };
    this.commit();
    this.notify();
  }

  // --- Reference Data ---

  async getShiftDefinitions(): Promise<DbShiftDefinition[]> {
    this.ensureConnection();
    return [...DB_SHIFTS_DEF];
  }

  // Mimics "SELECT * FROM staff_availability WHERE staff_id = ?"
  async getStaffAvailability(staffId: number): Promise<DbStaffAvailability[]> {
    this.ensureConnection();
    return DB_STAFF_AVAILABILITY.filter(a => a.staff_id === staffId);
  }

  // Mimics "SELECT * FROM staff_availability"
  async getAllStaffAvailability(): Promise<DbStaffAvailability[]> {
    this.ensureConnection();
    return [...DB_STAFF_AVAILABILITY];
  }

  async getClosedDates(): Promise<DbClosedDate[]> {
    this.ensureConnection();
    return [...this.closedDatesTable];
  }

  async toggleClosedDate(date: string, reason?: string): Promise<void> {
    this.ensureConnection();
    const index = this.closedDatesTable.findIndex(d => d.date === date);
    if (index >= 0) {
      this.closedDatesTable.splice(index, 1);
    } else {
      this.closedDatesTable.push({ date, reason });
    }
    this.commit();
  }

  // --- Core Data ---

  // Mimics "SELECT * FROM staff"
  async getEmployees(): Promise<Employee[]> {
    this.ensureConnection();
    
    // Simulate query delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const ordered = this.orderedStaffIds()
      .map(id => DB_STAFF.find(s => s.staff_id === id))
      .filter((s): s is typeof DB_STAFF[number] => Boolean(s));

    return ordered.map((s) => {
      // Colour follows the person, not the row, so dragging does not recolour anyone.
      const index = DB_STAFF.findIndex(other => other.staff_id === s.staff_id);
      // Logic to determine initials and colors (frontend specific)
      let initials = s.first_name[0] + (s.last_name ? s.last_name[0] : '');
      
      // User requested specific initials
      const nameUpper = s.first_name.toUpperCase();
      if (nameUpper === 'LINNA') initials = 'LN';
      else if (nameUpper === 'NAT') initials = 'NB';
      else if (nameUpper === 'TAN') initials = 'TN';
      else if (nameUpper === 'BRYAN') initials = 'BW';
      else if (nameUpper === 'BEN') initials = 'BP';
      else if (nameUpper === 'GRACE') initials = 'GD';
      else if (nameUpper === 'SUE') initials = 'SJ';

      const color = COLORS[index % COLORS.length];
      
      let displayName = s.first_name;

      // Check for duplicate first names in the database
      const duplicates = DB_STAFF.filter(
        other => other.staff_id !== s.staff_id && 
                 other.first_name.toLowerCase() === s.first_name.toLowerCase()
      );

        if (duplicates.length > 0) {
           // We have duplicates, append initial of last name
           // If duplicates also share initial, we expand the suffix until unique or full last name is used
           let suffixLen = 1;
           const myLast = s.last_name;
           
           // While the current suffix matches any other person's suffix in the duplicate group
           // expand the suffix.
           while (suffixLen <= myLast.length) {
             const mySuffix = myLast.substring(0, suffixLen).toLowerCase();
             const isStillAmbiguous = duplicates.some(d => d.last_name.substring(0, suffixLen).toLowerCase() === mySuffix);
             
             if (!isStillAmbiguous) break;
             suffixLen++;
           }
           
           displayName = `${s.first_name} ${s.last_name.substring(0, suffixLen)}`;
        }

      // The sub-label follows the divider, so moving a row across it relabels the person.
      const group = this.getStaffGroup(s.staff_id);
      let defaultRole = group === 'kitchen' ? 'Kitchen' : 'Floor Staff';
      if (s.staff_id === 1) defaultRole = 'Kitchen/Front';

      return {
        id: s.staff_id.toString(),
        name: displayName,
        initials,
        color,
        defaultRole,
        defaultLocation: 'Taringa',
        group: this.getStaffGroup(s.staff_id)
      };
    });
  }

  // Mimics "SELECT * FROM vw_weekly_roster" (Joining tables)
  async getShifts(): Promise<Shift[]> {
    this.ensureConnection();
    console.log('[Local] Fetching roster data');
    await new Promise(resolve => setTimeout(resolve, 100));

    // Perform JOINs in memory
    return this.rosterTable.map(r => {
      const staff = DB_STAFF.find(s => s.staff_id === r.staff_id);
      const role = DB_ROLES.find(role => role.role_id === r.role_id);
      const shiftDef = DB_SHIFTS_DEF.find(def => def.shift_id === r.shift_id);

      if (!staff || !role || !shiftDef) {
        // console.warn('Orphaned roster entry', r);
        return null;
      }

      // Basic time formatting HH:mm
      const fmtTime = (t: string) => t.substring(0, 5);

      const parseTimeToHours = (t: string) => {
        if (!t || !t.includes(':')) return 0;
        const [h, m] = t.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return 0;
        return h + (m / 60);
      };

      const startTime = r.start_time_override !== undefined ? r.start_time_override : shiftDef.start_time;
      const endTime = r.end_time_override !== undefined ? r.end_time_override : shiftDef.end_time;

      const start = parseTimeToHours(startTime);
      let end = parseTimeToHours(endTime);
      if (end < start && endTime !== '') end += 24;

      const startFmt = fmtTime(startTime);
      const endFmt = fmtTime(endTime);

      let duration = (endTime === '' || startTime === '' || startTime === 'L' || startTime === 'D') ? 0 : (end - start);
      
      // Use manual break if provided, otherwise fallback to auto-break for shifts > 7h
      const hasBreak = r.has_break !== undefined ? r.has_break === 1 : duration > 7;
      
      if (hasBreak && duration > 0) {
        duration -= 0.5;
      }

      return {
        id: r.roster_id.toString(),
        employeeId: r.staff_id.toString(),
        startTime: startFmt,
        endTime: endFmt,
        date: r.roster_date,
        location: 'Taringa', // Not in roster schema, defaulting
        role: role.role_name,
        status: ShiftStatus.PUBLISHED, // Not in roster schema, defaulting
        duration: duration,
        hasBreak: hasBreak,
        notes: r.notes || undefined
      };
    }).filter(s => s !== null) as Shift[];
  }

  // Add shift using specific Definition ID or custom times
  async addShift(shift: Shift, shiftDefId?: number, startTime?: string, endTime?: string, hasBreak?: boolean): Promise<void> {
    this.ensureConnection();
    const newId = nextRosterId();
    
    console.log(`[Local] Adding shift to roster...`);
    
    // Find definition (use provided ID or default to 1)
    const defId = shiftDefId || 1;
    // Default role is now just 'Staff' (ID 1)
    const defaultRole = DB_ROLES.find(r => r.role_id === 1) || DB_ROLES[0];
    const dateObj = new Date(shift.date);
    const dayId = DAY_MAP[dateObj.getDay()];

    this.rosterTable.push({
      roster_id: newId,
      staff_id: parseInt(shift.employeeId),
      role_id: defaultRole.role_id,
      day_id: dayId, 
      shift_id: defId,
      roster_date: shift.date,
      start_time_override: startTime !== undefined ? (startTime.includes(':') ? `${startTime}:00` : startTime) : undefined,
      end_time_override: endTime !== undefined ? (endTime.includes(':') ? `${endTime}:00` : endTime) : undefined,
      has_break: hasBreak !== undefined ? (hasBreak ? 1 : 0) : undefined,
      notes: ''
    });

    this.commit();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async deleteShift(shiftId: string): Promise<void> {
    this.ensureConnection();
    console.log(`[Local] Deleting shift ${shiftId}`);
    this.rosterTable = this.rosterTable.filter(r => r.roster_id.toString() !== shiftId);
    // Record the removal so a device syncing an older copy does not re-add it.
    const id = Number(shiftId);
    if (!Number.isNaN(id) && !this.deletedIds.includes(id)) {
      this.deletedIds = [...this.deletedIds, id].slice(-500);
    }
    this.commit();
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  async restoreDefaultShifts(weekDates: Date[]): Promise<void> {
    this.ensureConnection();
    console.log('[Local] Restoring default shifts for TAN (ID 3)...');
    
    // TAN (ID 3)
    const tanId = 3;
    
    // For each day in the week
    weekDates.forEach(date => {
      const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
      
      // Skip Monday (1) and Wednesday (3)
      if (dayOfWeek === 1 || dayOfWeek === 3) return;
      
      const dateStr = this.toLocalDateString(date);
      const dayId = DAY_MAP[dayOfWeek];
      
      // Check if TAN already has a shift on this date in the Dinner row (shift_id 3)
      const existing = this.rosterTable.find(r => r.staff_id === tanId && r.roster_date === dateStr && r.shift_id === 3);
      
      if (!existing) {
        this.rosterTable.push({
          roster_id: nextRosterId(),
          staff_id: tanId,
          role_id: 1, // Staff
          day_id: dayId,
          shift_id: 3, // Evening/Dinner
          roster_date: dateStr,
          start_time_override: 'L',
          end_time_override: 'D',
          notes: 'Default Full-time'
        });
      }
    });
    
    this.commit();
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  async saveWeekAsTemplate(weekDates: Date[]): Promise<void> {
    this.ensureConnection();
    const dateStrings = weekDates.map(d => this.toLocalDateString(d));
    const weekShifts = this.rosterTable.filter(r => dateStrings.includes(r.roster_date));
    
    // Normalize shifts for template (remove roster_id and roster_date, keep day_id)
    const template = weekShifts.map(s => ({
      staff_id: s.staff_id,
      role_id: s.role_id,
      day_id: s.day_id,
      shift_id: s.shift_id,
      start_time_override: s.start_time_override,
      end_time_override: s.end_time_override,
      notes: s.notes
    }));

    // The template is shared too, so a week saved on one machine can be
    // restored from any other.
    this.templateTable = template;
    this.commit();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async restoreFromTemplate(weekDates: Date[]): Promise<void> {
    this.ensureConnection();
    const template = this.templateTable;
    if (!template || !template.length) {
      // Fallback to TAN default if no template exists
      return this.restoreDefaultShifts(weekDates);
    }

    template.forEach((t: any) => {
      // Find the date in weekDates that matches t.day_id
      // day_id: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
      const targetDate = weekDates.find(d => {
        const day = d.getDay();
        const mappedDayId = DAY_MAP[day];
        return mappedDayId === t.day_id;
      });

      if (targetDate) {
        const dateStr = this.toLocalDateString(targetDate);
        
        // Check for duplicate
        const exists = this.rosterTable.find(r => 
          r.staff_id === t.staff_id && 
          r.roster_date === dateStr && 
          r.shift_id === t.shift_id
        );

        if (!exists) {
          this.rosterTable.push({
            ...t,
            roster_id: nextRosterId(),
            roster_date: dateStr
          });
        }
      }
    });

    this.commit();
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  private ensureConnection() {
    if (!this.connected) {
      throw new Error('Database not connected.');
    }
  }
}

export const db = new DatabaseService();