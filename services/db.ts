import { DB_CONFIG } from '../config';
import { Shift, ShiftStatus } from '../types';
import { MOCK_SHIFTS } from '../constants';

class DatabaseService {
  private connected = false;
  // We use the mock data as our initial database "seed"
  private shifts: Shift[] = [...MOCK_SHIFTS];

  /**
   * Simulates connecting to the Google Cloud SQL instance
   */
  async connect(): Promise<boolean> {
    console.log(`[MySQL] Attempting connection to ${DB_CONFIG.host}:${DB_CONFIG.port}...`);
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (DB_CONFIG.password === 'Linna32@#') {
      this.connected = true;
      console.log(`[MySQL] Successfully connected as user '${DB_CONFIG.user}'`);
      return true;
    } else {
      console.error('[MySQL] Access Denied: Invalid credentials');
      throw new Error('Database connection failed');
    }
  }

  /**
   * Simulates: SELECT * FROM shifts
   */
  async getShifts(): Promise<Shift[]> {
    this.ensureConnection();
    console.log('[MySQL] EXEC: SELECT * FROM shifts ORDER BY date ASC');
    
    // Simulate query time
    await new Promise(resolve => setTimeout(resolve, 800));
    return [...this.shifts];
  }

  /**
   * Simulates: INSERT INTO shifts (...) VALUES (...)
   */
  async addShift(shift: Shift): Promise<void> {
    this.ensureConnection();
    console.log(`[MySQL] EXEC: INSERT INTO shifts (id, employeeId, date, role) VALUES ('${shift.id}', '${shift.employeeId}', '${shift.date}', '${shift.role}')`);
    
    await new Promise(resolve => setTimeout(resolve, 600));
    this.shifts.push(shift);
  }

  private ensureConnection() {
    if (!this.connected) {
      throw new Error('Database not connected. Call connect() first.');
    }
  }
}

export const db = new DatabaseService();