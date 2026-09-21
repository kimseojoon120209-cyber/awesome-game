import { initialOwned, initialEquipped, items, levels, crates } from '../shared/catalog.js';

const jsonValue = (value) => typeof value === 'string' ? JSON.parse(value) : value;
const cleanProfile = (profile) => ({
  name: profile.name,
  coins: Number(profile.coins),
  owned: [...new Set([...initialOwned, ...jsonValue(profile.owned)])],
  equipped: { ...initialEquipped, ...jsonValue(profile.equipped) },
  admin: Number(profile.admin_until) > Date.now(),
});

function send(res, value, status = 200, headers = {}) {
  res.statusCode = status;
  for (const [name, headerValue] of Object.entries({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  })) res.setHeader(name, headerValue);
  res.end(JSON.stringify(value));
}

function requestBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') return JSON.parse(req.body);
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));
  return req.body;
}

function cookieValue(req, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return req.headers.cookie?.match(new RegExp(`(?:^|; )${escaped}=([^;]+)`))?.[1] || null;
}

async function supabase(path, { method = 'GET', body, prefer } = {}) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error('Supabase is not configured');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(prefer ? { prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const result = text ? JSON.parse(text) : null;
  if (!response.ok) {
    console.error('Supabase request failed', response.status, result);
    throw new Error('Database request failed');
  }
  return result;
}

const profileById = async (id) => {
  if (!id) return null;
  const rows = await supabase(`profiles?id=eq.${encodeURIComponent(id)}&select=*`);
  return rows[0] || null;
};

export default async function handler(req, res) {
  try {
    const origin = `https://${req.headers.host}`;
    const url = new URL(req.url, origin);
    const path = url.pathname;
    if (req.method === 'POST' && req.headers.origin && req.headers.origin !== origin) {
      return send(res, { error: 'Invalid origin' }, 403);
    }

    const id = cookieValue(req, 'sprint');
    let profile = await profileById(id);

    if (path === '/api/profile' && req.method === 'POST') {
      const body = requestBody(req);
      const name = String(body.name || '').trim().slice(0, 16);
      if (!name) return send(res, { error: 'Please enter your name' }, 400);
      const profileId = profile?.id || crypto.randomUUID();
      if (profile) {
        const rows = await supabase(`profiles?id=eq.${encodeURIComponent(profileId)}&select=*`, {
          method: 'PATCH', body: { name }, prefer: 'return=representation',
        });
        profile = rows[0];
      } else {
        const rows = await supabase('profiles?select=*', {
          method: 'POST',
          body: {
            id: profileId,
            name,
            coins: 450,
            owned: initialOwned,
            equipped: initialEquipped,
            admin_until: 0,
          },
          prefer: 'return=representation',
        });
        profile = rows[0];
      }
      return send(res, cleanProfile(profile), 200, {
        'set-cookie': `sprint=${profileId}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000; Secure`,
      });
    }

    if (path === '/api/profile') return send(res, profile ? cleanProfile(profile) : null);

    if (path === '/api/ranks') {
      const level = Number(url.searchParams.get('level'));
      if (!levels[level]) return send(res, { error: 'Invalid level' }, 400);
      const page = Math.max(0, Number(url.searchParams.get('page')) || 0);
      const query = new URLSearchParams({
        select: 'id,name,level,duration,status,correct,loadout,admin,ended',
        level: `eq.${level}`,
        ended: 'not.is.null',
        status: 'eq.won',
        admin: 'eq.false',
        correct: `eq.${levels[level].target}`,
        order: 'duration.asc,ended.asc,id.asc',
        limit: '50',
        offset: String(page * 50),
      });
      const rows = await supabase(`runs?${query}`);
      return send(res, rows.map((run) => ({
        ...run,
        loadout: typeof run.loadout === 'string' ? run.loadout : JSON.stringify(run.loadout),
      })));
    }

    if (!profile) return send(res, { error: 'Choose a player name first' }, 401);
    const admin = Number(profile.admin_until) > Date.now();

    if (path === '/api/admin' && req.method === 'POST') {
      const body = requestBody(req);
      if (body.logout) {
        await supabase(`profiles?id=eq.${encodeURIComponent(profile.id)}`, {
          method: 'PATCH', body: { admin_until: 0 }, prefer: 'return=minimal',
        });
        return send(res, { ok: true });
      }
      if (!process.env.ADMIN_PASSWORD) return send(res, { error: 'Admin access is not configured' }, 503);
      if (body.password !== process.env.ADMIN_PASSWORD) return send(res, { error: 'Incorrect password' }, 403);
      await supabase(`profiles?id=eq.${encodeURIComponent(profile.id)}`, {
        method: 'PATCH', body: { admin_until: Date.now() + 3600000 }, prefer: 'return=minimal',
      });
      return send(res, { ok: true });
    }

    if (path === '/api/equip' && req.method === 'POST') {
      const { id: itemId } = requestBody(req);
      const item = items.find((candidate) => candidate.id === itemId);
      const owned = jsonValue(profile.owned);
      if (!item || (!admin && !initialOwned.includes(itemId) && !owned.includes(itemId))) {
        return send(res, { error: 'Item is locked' }, 403);
      }
      const equipped = { ...initialEquipped, ...jsonValue(profile.equipped), [item.cat]: itemId };
      await supabase(`profiles?id=eq.${encodeURIComponent(profile.id)}`, {
        method: 'PATCH', body: { equipped }, prefer: 'return=minimal',
      });
      return send(res, { ...cleanProfile(profile), equipped });
    }

    if (path === '/api/chest' && req.method === 'POST') {
      const { tier } = requestBody(req);
      const crate = crates[tier - 1];
      if (!crate) return send(res, { error: 'Unknown chest' }, 400);
      const owned = jsonValue(profile.owned);
      const pool = items.filter((item) => item.tier === tier && !owned.includes(item.id));
      if (!pool.length) return send(res, { error: 'You own every item in this chest' }, 409);
      if (!admin && Number(profile.coins) < crate.cost) return send(res, { error: 'Not enough coins' }, 400);
      const prize = pool[Math.floor(Math.random() * pool.length)];
      const nextOwned = [...owned, prize.id];
      const cost = admin ? 0 : crate.cost;
      const updated = await supabase('rpc/syntax_open_chest', {
        method: 'POST',
        body: {
          p_profile: profile.id,
          p_expected_owned: owned,
          p_new_owned: nextOwned,
          p_cost: cost,
        },
      });
      if (!updated) return send(res, { error: 'Balance changed. Please try again.' }, 409);
      return send(res, {
        prize,
        profile: {
          ...cleanProfile(profile),
          coins: Number(profile.coins) - cost,
          owned: [...new Set([...initialOwned, ...nextOwned])],
        },
      });
    }

    if (path === '/api/start' && req.method === 'POST') {
      const { level } = requestBody(req);
      if (!levels[level]) return send(res, { error: 'Invalid level' }, 400);
      const runId = crypto.randomUUID();
      await supabase('runs', {
        method: 'POST',
        body: {
          id: runId,
          player: profile.id,
          name: profile.name,
          level,
          started: Date.now(),
          status: 'playing',
          loadout: jsonValue(profile.equipped),
          admin,
        },
        prefer: 'return=minimal',
      });
      return send(res, { id: runId, admin });
    }

    if (path === '/api/finish' && req.method === 'POST') {
      const body = requestBody(req);
      const rows = await supabase(`runs?id=eq.${encodeURIComponent(String(body.id))}&player=eq.${encodeURIComponent(profile.id)}&select=*`);
      const run = rows[0];
      if (!run) return send(res, { error: 'Match not found' }, 404);
      if (run.ended) return send(res, {
        profile: cleanProfile(profile), saved: true, reward: 0, ranked: run.status === 'won' && !run.admin,
      });
      if (!['won', 'lost', 'abandoned'].includes(body.status)) return send(res, { error: 'Invalid result' }, 400);
      const duration = Math.max(0, Math.round(Number(body.duration)));
      const correct = Math.max(0, Math.min(levels[run.level].target, Number(body.correct) || 0));
      if (!Number.isFinite(duration) || duration > Date.now() - Number(run.started) + 2000) {
        return send(res, { error: 'Invalid match time' }, 400);
      }
      if (body.status === 'won' && correct !== levels[run.level].target) {
        return send(res, { error: 'Incomplete match' }, 400);
      }
      const reward = body.status === 'won' && !run.admin
        ? Math.max(80, 300 - Math.floor(duration / 1000) * 2 + run.level * 25)
        : 0;
      const updated = await supabase('rpc/syntax_finish_run', {
        method: 'POST',
        body: {
          p_run_id: run.id,
          p_player: profile.id,
          p_ended: Date.now(),
          p_duration: duration,
          p_correct: correct,
          p_status: body.status,
          p_reward: reward,
        },
      });
      profile = await profileById(profile.id);
      return send(res, {
        profile: cleanProfile(profile),
        reward: updated ? reward : 0,
        saved: true,
        ranked: body.status === 'won' && !run.admin,
      });
    }

    return send(res, { error: 'Not found' }, 404);
  } catch (error) {
    console.error(error);
    return send(res, { error: 'Could not reach the game database. Please try again.' }, 503);
  }
}
