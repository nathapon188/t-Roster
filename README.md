# t-Roster

Weekly staff roster for Taringa. Open the link on any machine, enter the team
passcode once, and everyone sees and edits the same roster.

## Shared roster

Save on one machine and the change appears on the others. There is no database
to run: one JSON document lives in Netlify Blobs behind a passcode.

- `netlify/functions/roster.mjs` holds the document and requires the
  `x-roster-key` header to match the `ROSTER_PASSCODE` environment variable.
  Without that variable set the function refuses every request rather than
  serving staff details openly.
- `services/sync.ts` pulls on load, on tab focus and every 20 seconds, and
  pushes local edits 1.2s after the last change.
- Writes carry the version they were based on. If someone else saved first the
  function replies 409 with their copy, and the client merges and retries once.
- Merging is a union by `roster_id`, and deletions are recorded as tombstones,
  so a shift cleared on one machine is not resurrected by the next machine to
  sync.
- A machine with no unsaved edits accepts the shared copy outright. Only one
  holding unsaved edits keeps its own version of a clashing shift, which it then
  pushes up. If two people edit the same shift at the same moment, the one who
  saves last wins that shift.
- Every machine also keeps its own localStorage copy, so the roster still opens
  when the connection or the function is unavailable. The status pill in the
  header shows Shared, Syncing, Offline or This device, and "This device only"
  opts out of sharing entirely.
- **Save** in the header pushes straight away instead of waiting out the 1.2s
  debounce, and turns green while there is anything unsaved. With nothing
  waiting it reads **Sync** and pulls instead, so it doubles as "show me what
  the others have done".

### If the pill says "Not set up"

That is the function replying 503, which it only does when `ROSTER_PASSCODE` is
missing from its environment. The function itself is deployed and running. Check,
in order: the variable's scope includes **Functions** and not just Builds; the
site has been redeployed since the variable was added, because env changes only
take effect on the next deploy; and the variable covers the deploy context you
are actually opening, not just Production.

### Setting the passcode

In Netlify: Site configuration → Environment variables → add `ROSTER_PASSCODE`
with a value you share with the team, then redeploy. It is never committed. To
rotate it, change the variable and each machine enters the new one once.

## Run it

```
npm install
netlify dev      # serves the app and /api/roster together
```

`npm run dev` alone runs Vite only, so the app loads and works off the local
copy but the shared store is unreachable.

```
npm run build    # production build into dist/
npm run lint     # tsc --noEmit
```

## Staff, rows and groups

Staff are listed in `constants.ts` (`DB_STAFF`). The weekly timetable splits
them across a **Kitchen** and a **Floor** divider.

- Drag a name cell up or down to change the row order.
- Drag it across the divider, or drop it on a divider heading, to move that
  person between Kitchen and Floor. The sub-label under the name follows.
- Both the order and the group assignments are saved to the shared store, so
  every machine sees the same layout.

`DEFAULT_STAFF_GROUPS` and `DEFAULT_STAFF_ORDER` in `constants.ts` are only the
starting point, used before anyone has dragged anything.

## Layout

- `App.tsx` — shell, header, view switching, data loading
- `components/WeeklyTimetableView.tsx` — the week grid, row drag and drop, divider
- `components/DailyListView.tsx` — one day as a list, grouped by Kitchen/Floor
- `components/AddShiftModal.tsx` — adding a shift, honouring availability
- `components/AvailabilityModal.tsx` — who is unavailable when
- `components/ExportModal.tsx` — PNG export via html2canvas
- `components/SyncStatus.tsx` — the header status pill and passcode entry
- `services/db.ts` — the roster itself, localStorage copy, staff order and groups
- `services/sync.ts` — shared store client, merge and conflict retry
- `netlify/functions/roster.mjs` — the shared store
- `constants.ts` — staff, shift definitions, availability, default order/groups

## Local JSON API (optional)

`server.js` is a small Express API kept from an earlier version. It serves shift
definitions from `data/shifts.json` and mirrors them to `data/shifts.txt`. It is
not used by the app and is not part of the Netlify deploy.

```
npm run api            # http://localhost:3001/api/shifts
npm run export:text    # rewrite data/shifts.txt from the JSON
```
