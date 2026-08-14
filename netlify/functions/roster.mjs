// Shared roster store: one JSON document in Netlify Blobs, guarded by a
// passcode. Every device that knows the passcode reads and writes the same
// roster, so a change saved on one machine shows up on all the others.
//
// Set ROSTER_PASSCODE in the Netlify site settings. Without it the function
// refuses every request rather than serving staff details openly.
//
//   GET  /api/roster  -> { version, state }
//   PUT  /api/roster  -> { baseVersion, state } -> { version }
//                        409 with the current copy if someone else saved first

import { getStore } from '@netlify/blobs'

const KEY = 'roster'
const MAX_BYTES = 512 * 1024

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

/** Length-independent compare, so the response time gives nothing away. */
function sameSecret(a = '', b = '') {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const emptyDoc = {
  version: 0,
  state: { roster: [], closed: [], template: null, staffOrder: [], staffGroups: {}, deleted: [] },
  updatedAt: null,
}

export default async function handler(req) {
  const expected = process.env.ROSTER_PASSCODE
  if (!expected) {
    return json({ error: 'not_configured', message: 'ROSTER_PASSCODE is not set on this site.' }, 503)
  }

  const supplied = req.headers.get('x-roster-key') || ''
  if (!sameSecret(supplied, expected)) {
    return json({ error: 'unauthorised' }, 401)
  }

  const store = getStore({ name: 'roster', consistency: 'strong' })

  if (req.method === 'GET') {
    const doc = (await store.get(KEY, { type: 'json' })) || emptyDoc
    return json(doc)
  }

  if (req.method === 'PUT') {
    let body
    try {
      body = await req.json()
    } catch {
      return json({ error: 'bad_json' }, 400)
    }

    const { baseVersion, state } = body || {}
    if (!state || !Array.isArray(state.roster) || !Array.isArray(state.closed)) {
      return json({ error: 'bad_state' }, 400)
    }
    const payload = JSON.stringify(state)
    if (payload.length > MAX_BYTES) {
      return json({ error: 'too_large', message: 'Roster is larger than 512KB.' }, 413)
    }

    const current = (await store.get(KEY, { type: 'json' })) || emptyDoc
    if (typeof baseVersion === 'number' && baseVersion !== current.version) {
      // Someone else saved in the meantime: hand back their copy to merge into.
      return json({ error: 'conflict', ...current }, 409)
    }

    const next = {
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
      state: {
        roster: state.roster,
        closed: state.closed,
        template: state.template ?? null,
        staffOrder: Array.isArray(state.staffOrder) ? state.staffOrder : [],
        staffGroups: state.staffGroups && typeof state.staffGroups === 'object' ? state.staffGroups : {},
        // Keep the tail: old tombstones stop mattering once every device has synced past them.
        deleted: (state.deleted || []).slice(-500),
      },
    }
    await store.setJSON(KEY, next)
    return json({ version: next.version, updatedAt: next.updatedAt })
  }

  return json({ error: 'method_not_allowed' }, 405)
}

export const config = { path: '/api/roster' }
