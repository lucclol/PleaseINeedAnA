let kv;
try {
  const mod = require('@vercel/kv');
  if (process.env.KV_REST_API_URL || process.env.ec_KV_REST_API_URL) {
    kv = mod.createClient({
      url: process.env.KV_REST_API_URL || process.env.ec_KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN || process.env.ec_KV_REST_API_TOKEN
    });
  }
} catch (e) { kv = null; }

// In-memory fallback when KV is not configured
let memoryData = { snake: [], rhythm: [], typing: [], tetris: [] };

async function getData() {
  if (kv) {
    try {
      return (await kv.get('leaderboard_data')) || { snake: [], rhythm: [], typing: [], tetris: [] };
    } catch (e) { /* fall through to memory */ }
  }
  return memoryData;
}

async function saveData(data) {
  if (kv) {
    try {
      await kv.set('leaderboard_data', data);
      return;
    } catch (e) { /* fall through to memory */ }
  }
  memoryData = data;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const data = await getData();
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { game, name, score } = req.body;
      if (!game || !name || score === undefined) {
        return res.status(400).json({ error: 'Missing game, name, or score' });
      }
      const validGames = ['snake', 'rhythm', 'typing', 'tetris'];
      if (!validGames.includes(game)) {
        return res.status(400).json({ error: 'Invalid game' });
      }

      const data = await getData();
      const entry = {
        name: name.slice(0, 20),
        score: Number(score),
        time: new Date().toISOString()
      };

      data[game].push(entry);
      data[game].sort((a, b) => b.score - a.score);
      if (data[game].length > 50) data[game] = data[game].slice(0, 50);

      await saveData(data);
      return res.status(200).json({
        ok: true,
        rank: data[game].findIndex(e => e.name === entry.name && e.score === entry.score) + 1
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
