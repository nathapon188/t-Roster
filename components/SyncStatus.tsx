import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, KeyRound, Check, Laptop, CloudUpload } from 'lucide-react';
import { SyncStatus as Status } from '../types';
import { sync } from '../services/sync';

// Header pill showing whether this device is in step with the shared roster,
// plus the passcode entry and the "this device only" opt-out.
const SyncStatusPill: React.FC = () => {
  const [status, setStatus] = useState<Status>(sync.getStatus());
  const [detail, setDetail] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [entry, setEntry] = useState('');
  const [unsaved, setUnsaved] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => sync.subscribe((s, d) => {
    setStatus(s);
    setDetail(d);
    setUnsaved(sync.hasUnsaved);
    // Nothing to type in once the passcode is accepted.
    if (s === 'idle') setOpen(false);
  }), []);

  // Push straight away instead of waiting out the debounce, so "I pressed Save"
  // and "the other machines have it" are the same moment.
  const saveNow = async () => {
    await sync.saveNow();
    setUnsaved(sync.hasUnsaved);
    if (!sync.hasUnsaved) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    }
  };

  const needsPasscode = status === 'unauthorised';

  const look: Record<Status, { label: string; className: string; icon: React.ReactNode }> = {
    idle: { label: 'Shared', className: 'bg-green-50 text-green-700 border-green-200', icon: <Cloud size={12} /> },
    syncing: { label: 'Syncing', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: <RefreshCw size={12} className="animate-spin" /> },
    unauthorised: { label: 'Passcode', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: <KeyRound size={12} /> },
    unconfigured: { label: 'Not set up', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: <KeyRound size={12} /> },
    offline: { label: 'Offline', className: 'bg-gray-100 text-gray-500 border-gray-300', icon: <CloudOff size={12} /> },
    local: { label: 'This device', className: 'bg-gray-100 text-gray-600 border-gray-300', icon: <Laptop size={12} /> }
  };

  const current = look[status];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry.trim()) return;
    sync.passcode = entry.trim();
    setEntry('');
    void sync.pull();
  };

  return (
    <div className="relative flex items-center gap-2">
      {sync.shared && (
        <button
          onClick={saveNow}
          disabled={status === 'syncing'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-60 no-export ${
            unsaved
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          title="Save now and send to every device"
        >
          {justSaved ? <Check size={12} /> : <CloudUpload size={12} />}
          <span>{justSaved ? 'Saved' : unsaved ? 'Save' : 'Sync'}</span>
        </button>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${current.className}`}
        title={detail || 'Shared roster status'}
      >
        {current.icon}
        <span>{current.label}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 text-xs">
          <p className="text-gray-600 mb-3">
            {status === 'idle' && 'Every device with the passcode sees this roster. Changes save automatically.'}
            {status === 'syncing' && 'Talking to the shared roster.'}
            {needsPasscode && 'Enter the team passcode to load the shared roster.'}
            {status === 'unconfigured' && (detail || 'ROSTER_PASSCODE is not set on the site yet.')}
            {status === 'offline' && `Working from this device's copy. ${detail || 'The shared roster is unreachable.'}`}
            {status === 'local' && 'Sharing is off. Changes stay on this device.'}
          </p>

          {sync.shared && (
            <form onSubmit={submit} className="flex gap-1.5 mb-3">
              <input
                type="password"
                value={entry}
                onChange={e => setEntry(e.target.value)}
                placeholder={sync.passcode ? 'Change passcode' : 'Team passcode'}
                className="flex-1 border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <button type="submit" className="px-2 bg-green-600 text-white rounded hover:bg-green-700" title="Save passcode">
                <Check size={14} />
              </button>
            </form>
          )}

          <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={!sync.shared}
              onChange={e => {
                sync.shared = !e.target.checked;
                setOpen(true);
              }}
            />
            This device only
          </label>
        </div>
      )}
    </div>
  );
};

export default SyncStatusPill;
