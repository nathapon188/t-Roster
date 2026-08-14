// Shared store client. Pulls the roster on load, on tab focus and every 20
// seconds, and pushes local edits 1.2s after the last change. Writes carry the
// version they were based on, so if another device saved first the function
// replies 409 and we merge their copy in before retrying.
//
// The device always keeps its own localStorage copy (services/db.ts owns that),
// so the roster still opens when the function is unreachable. "This device
// only" opts out of sharing entirely.

import { RosterState, SyncStatus } from '../types';

const ENDPOINT = '/api/roster';
const KEY_PASSCODE = 'roster_sync_key';
const KEY_MODE = 'roster_sync_mode';
const PULL_INTERVAL = 20000;
const PUSH_DEBOUNCE = 1200;

type Listener = (status: SyncStatus, detail?: string) => void;

interface RemoteDoc {
  version: number;
  state: RosterState;
  updatedAt?: string | null;
}

const emptyState = (): RosterState => ({
  roster: [],
  closed: [],
  template: null,
  staffOrder: [],
  staffGroups: {},
  deleted: [],
});

class SyncService {
  private version = 0;
  private dirty = false;          // this device holds edits the server has not seen
  private status: SyncStatus = 'idle';
  private detail: string | undefined;
  private listeners = new Set<Listener>();
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private inFlight = false;
  private started = false;

  // Wired up by services/db.ts.
  private readState: () => RosterState = emptyState;
  private writeState: (state: RosterState) => void = () => {};

  // --- Configuration -------------------------------------------------------

  get passcode(): string {
    try {
      return localStorage.getItem(KEY_PASSCODE) || '';
    } catch {
      return '';
    }
  }

  set passcode(value: string) {
    try {
      if (value) localStorage.setItem(KEY_PASSCODE, value);
      else localStorage.removeItem(KEY_PASSCODE);
    } catch {
      /* private browsing */
    }
  }

  get shared(): boolean {
    try {
      return localStorage.getItem(KEY_MODE) !== 'local';
    } catch {
      return false;
    }
  }

  set shared(on: boolean) {
    try {
      localStorage.setItem(KEY_MODE, on ? 'shared' : 'local');
    } catch {
      /* private browsing */
    }
    if (on) {
      this.setStatus('idle');
      void this.pull();
    } else {
      this.setStatus('local');
    }
  }

  // --- Wiring --------------------------------------------------------------

  attach(readState: () => RosterState, writeState: (state: RosterState) => void) {
    this.readState = readState;
    this.writeState = writeState;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status, this.detail);
    return () => this.listeners.delete(listener);
  }

  getStatus(): SyncStatus {
    return this.status;
  }

  private setStatus(status: SyncStatus, detail?: string) {
    this.status = status;
    this.detail = detail;
    this.listeners.forEach(l => l(status, detail));
  }

  start() {
    if (this.started) return;
    this.started = true;

    if (!this.shared) {
      this.setStatus('local');
      return;
    }

    void this.pull();
    this.pollTimer = setInterval(() => void this.pull(), PULL_INTERVAL);
    window.addEventListener('focus', () => void this.pull());
    window.addEventListener('online', () => void this.pull());
  }

  /** Called by db.ts after any change that should reach the other devices. */
  markDirty() {
    this.dirty = true;
    if (!this.shared || !this.passcode) return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => void this.push(), PUSH_DEBOUNCE);
  }

  // --- Transport -----------------------------------------------------------

  private headers(): HeadersInit {
    return { 'content-type': 'application/json', 'x-roster-key': this.passcode };
  }

  /** Maps the responses that are not a plain success onto a status. */
  private handleFailure(res: Response, body: any): boolean {
    if (res.status === 401) {
      this.setStatus('unauthorised');
      return true;
    }
    if (res.status === 503 && body?.error === 'not_configured') {
      this.setStatus('unconfigured', body?.message);
      return true;
    }
    if (!res.ok && res.status !== 409) {
      this.setStatus('offline', body?.message || `HTTP ${res.status}`);
      return true;
    }
    return false;
  }

  async pull(): Promise<void> {
    if (!this.shared || this.inFlight) return;
    if (!this.passcode) {
      this.setStatus('unauthorised');
      return;
    }

    this.inFlight = true;
    try {
      this.setStatus('syncing');
      const res = await fetch(ENDPOINT, { headers: this.headers(), cache: 'no-store' });
      const body = await res.json().catch(() => null);
      if (this.handleFailure(res, body)) return;

      const doc = body as RemoteDoc;
      this.version = doc.version ?? 0;

      if (this.dirty) {
        // Local edits are not on the server yet: keep them, fold in anything new.
        this.writeState(mergeState(doc.state, this.readState(), 'local'));
        this.setStatus('idle');
        this.inFlight = false;
        await this.push();
        return;
      }

      // Nothing unsaved here, so the shared copy wins outright.
      this.writeState(normalise(doc.state));
      this.setStatus('idle');
    } catch (e: any) {
      this.setStatus('offline', e?.message);
    } finally {
      this.inFlight = false;
    }
  }

  async push(retry = true): Promise<void> {
    if (!this.shared || this.inFlight) return;
    if (!this.passcode) {
      this.setStatus('unauthorised');
      return;
    }

    this.inFlight = true;
    try {
      this.setStatus('syncing');
      const res = await fetch(ENDPOINT, {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify({ baseVersion: this.version, state: this.readState() }),
      });
      const body = await res.json().catch(() => null);

      if (res.status === 409) {
        // Someone saved first. Merge their copy under ours and try once more.
        const theirs = body as RemoteDoc;
        this.version = theirs.version ?? this.version;
        this.writeState(mergeState(theirs.state, this.readState(), 'local'));
        this.inFlight = false;
        if (retry) await this.push(false);
        else this.setStatus('offline', 'Could not settle a conflicting save.');
        return;
      }

      if (this.handleFailure(res, body)) return;

      this.version = body?.version ?? this.version + 1;
      this.dirty = false;
      this.setStatus('idle');
    } catch (e: any) {
      this.setStatus('offline', e?.message);
    } finally {
      this.inFlight = false;
    }
  }
}

// --- Merging ---------------------------------------------------------------

function normalise(state: Partial<RosterState> | null | undefined): RosterState {
  const base = emptyState();
  if (!state) return base;
  return {
    roster: Array.isArray(state.roster) ? state.roster : base.roster,
    closed: Array.isArray(state.closed) ? state.closed : base.closed,
    template: Array.isArray(state.template) ? state.template : null,
    staffOrder: Array.isArray(state.staffOrder) ? state.staffOrder : base.staffOrder,
    staffGroups: state.staffGroups && typeof state.staffGroups === 'object' ? state.staffGroups : base.staffGroups,
    deleted: Array.isArray(state.deleted) ? state.deleted : base.deleted,
  };
}

/**
 * Union the two rosters by roster_id. `wins` decides who keeps a clashing
 * entry: the device holding unsaved edits does, so its work is not thrown away
 * by a stale snapshot. Deletions are tombstoned rather than implied by absence,
 * so a shift removed here is not resurrected by the next device to sync.
 */
export function mergeState(
  remote: Partial<RosterState> | null | undefined,
  local: Partial<RosterState> | null | undefined,
  wins: 'local' | 'remote' = 'local',
): RosterState {
  const r = normalise(remote);
  const l = normalise(local);

  const tombstones = new Set<number>([...r.deleted, ...l.deleted]);

  const byId = new Map<number, RosterState['roster'][number]>();
  const first = wins === 'local' ? r.roster : l.roster;
  const second = wins === 'local' ? l.roster : r.roster;
  for (const entry of first) byId.set(entry.roster_id, entry);
  for (const entry of second) byId.set(entry.roster_id, entry);

  const roster = [...byId.values()].filter(entry => !tombstones.has(entry.roster_id));

  // Closed dates, the staff order, the groups and the template are single
  // values rather than collections of independent rows, so the side holding
  // unsaved edits keeps its version outright.
  const preferred = wins === 'local' ? l : r;
  const fallback = wins === 'local' ? r : l;

  return {
    roster,
    // Taken outright rather than unioned: clearing every closed date is a real
    // edit, and this side is the one holding unsaved edits.
    closed: preferred.closed,
    template: preferred.template ?? fallback.template,
    staffOrder: preferred.staffOrder.length ? preferred.staffOrder : fallback.staffOrder,
    staffGroups: Object.keys(preferred.staffGroups).length ? preferred.staffGroups : fallback.staffGroups,
    deleted: [...tombstones].slice(-500),
  };
}

export const sync = new SyncService();
