import { DB_CONFIG } from '../config';
import { Shift, ShiftStatus, Employee, DbRoster, DbShiftDefinition, DbStaffAvailability } from '../types';
import { DB_STAFF, DB_ROLES, DB_SHIFTS_DEF, DB_ROSTER, DB_STAFF_AVAILABILITY, DAY_MAP } from '../constants';

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

class DatabaseService {
  private connected = false;
  // In-memory mock tables
  private rosterTable: DbRoster[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const saved = localStorage.getItem('staff_roster_data');
    if (saved) {
      try {
        this.rosterTable = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved roster data', e);
        this.rosterTable = [...DB_ROSTER];
      }
    } else {
      this.rosterTable = [...DB_ROSTER];
    }
  }

  private saveToStorage() {
    localStorage.setItem('staff_roster_data', JSON.stringify(this.rosterTable));
  }

  async connect(): Promise<boolean> {
    console.log(`[MySQL] Connecting to ${DB_CONFIG.host}...`);
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate latency
    
    if (DB_CONFIG.password === 'Linna32@#') {
      this.connected = true;
      console.log(`[MySQL] Connected to database: ${DB_CONFIG.database}`);
      return true;
    }
    throw new Error('Access Denied');
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

  // --- Core Data ---

  // Mimics "SELECT * FROM staff"
  async getEmployees(): Promise<Employee[]> {
    this.ensureConnection();
    
    // Simulate query delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return DB_STAFF.map((s, index) => {
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

        let defaultRole = 'Staff';
      if (s.staff_id >= 2 && s.staff_id <= 6) {
        defaultRole = 'Floor Staff';
      } else if (s.staff_id === 7 || s.staff_id === 8 || s.staff_id === 9) {
        defaultRole = 'Kitchen';
      } else if (s.staff_id === 1) {
        defaultRole = 'Kitchen/Front';
      }

      return {
        id: s.staff_id.toString(),
        name: displayName,
        initials,
        color,
        defaultRole,
        defaultLocation: 'Taringa'
      };
    });
  }

  // Mimics "SELECT * FROM vw_weekly_roster" (Joining tables)
  async getShifts(): Promise<Shift[]> {
    this.ensureConnection();
    console.log('[MySQL] EXEC: SELECT * FROM vw_weekly_roster');
    await new Promise(resolve => setTimeout(resolve, 600));

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

      const startTime = r.start_time_override || shiftDef.start_time;
      const endTime = r.end_time_override || shiftDef.end_time;

      const start = parseTimeToHours(startTime);
      let end = parseTimeToHours(endTime);
      if (end < start) end += 24;

      let duration = end - start;
      // Subtract 30 mins if it's a morning shift starting at 6:00/6:30 and ending at 14:00/15:00
      const startFmt = fmtTime(startTime);
      const endFmt = fmtTime(endTime);
      const isMorning = parseTimeToHours(startTime) < 15;
      if (isMorning && (startFmt === '06:00' || startFmt === '06:30') && (endFmt === '14:00' || endFmt === '15:00')) {
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
        notes: r.notes || undefined
      };
    }).filter(s => s !== null) as Shift[];
  }

  // Add shift using specific Definition ID or custom times
  async addShift(shift: Shift, shiftDefId?: number, startTime?: string, endTime?: string): Promise<void> {
    this.ensureConnection();
    const newId = Math.floor(Math.random() * 100000);
    
    console.log(`[MySQL] INSERT INTO roster SET staff_id=${shift.employeeId}, roster_date='${shift.date}'...`);
    
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
      start_time_override: startTime ? `${startTime}:00` : undefined,
      end_time_override: endTime ? `${endTime}:00` : undefined,
      notes: ''
    });

    this.saveToStorage();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async deleteShift(shiftId: string): Promise<void> {
    this.ensureConnection();
    console.log(`[MySQL] DELETE FROM roster WHERE roster_id=${shiftId}`);
    this.rosterTable = this.rosterTable.filter(r => r.roster_id.toString() !== shiftId);
    this.saveToStorage();
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  async restoreDefaultShifts(weekDates: Date[]): Promise<void> {
    this.ensureConnection();
    console.log('[MySQL] Restoring default shifts for TAN (ID 7)...');
    
    // TAN (ID 7)
    const tanId = 7;
    
    // For each day in the week
    weekDates.forEach(date => {
      const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
      
      // Skip Monday (1) and Wednesday (3)
      if (dayOfWeek === 1 || dayOfWeek === 3) return;
      
      const dateStr = date.toISOString().split('T')[0];
      const dayId = DAY_MAP[dayOfWeek];
      
      // Check if TAN already has a shift on this date in the Dinner row (shift_id 3)
      const existing = this.rosterTable.find(r => r.staff_id === tanId && r.roster_date === dateStr && r.shift_id === 3);
      
      if (!existing) {
        this.rosterTable.push({
          roster_id: Math.floor(Math.random() * 100000),
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
    
    this.saveToStorage();
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  async saveWeekAsTemplate(weekDates: Date[]): Promise<void> {
    this.ensureConnection();
    const dateStrings = weekDates.map(d => d.toISOString().split('T')[0]);
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

    localStorage.setItem('roster_template', JSON.stringify(template));
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async restoreFromTemplate(weekDates: Date[]): Promise<void> {
    this.ensureConnection();
    const templateStr = localStorage.getItem('roster_template');
    if (!templateStr) {
      // Fallback to TAN default if no template exists
      return this.restoreDefaultShifts(weekDates);
    }

    const template = JSON.parse(templateStr);
    const dateStrings = weekDates.map(d => d.toISOString().split('T')[0]);

    template.forEach((t: any) => {
      // Find the date in weekDates that matches t.day_id
      // day_id: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
      const targetDate = weekDates.find(d => {
        const day = d.getDay();
        const mappedDayId = DAY_MAP[day];
        return mappedDayId === t.day_id;
      });

      if (targetDate) {
        const dateStr = targetDate.toISOString().split('T')[0];
        
        // Check for duplicate
        const exists = this.rosterTable.find(r => 
          r.staff_id === t.staff_id && 
          r.roster_date === dateStr && 
          r.shift_id === t.shift_id
        );

        if (!exists) {
          this.rosterTable.push({
            ...t,
            roster_id: Math.floor(Math.random() * 100000),
            roster_date: dateStr
          });
        }
      }
    });

    this.saveToStorage();
    await new Promise(resolve => setTimeout(resolve, 800));
  }

  private ensureConnection() {
    if (!this.connected) {
      throw new Error('Database not connected.');
    }
  }
}

export const db = new DatabaseService();