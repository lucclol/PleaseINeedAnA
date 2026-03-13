const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const data = (await kv.get('leaderboard_data')) || {
        snake: [],
        rhythm: [],
        typing: []
      };
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { game, name, score } = req.body;
      if (!game || !name || score === undefined) {
        return res.status(400).json({ error: 'Missing game, name, or score' });
      }
      const validGames = ['snake', 'rhythm', 'typing'];
      if (!validGames.includes(game)) {
        return res.status(400).json({ error: 'Invalid game' });
      }

      const data = (await kv.get('leaderboard_data')) || {
        snake: [],
        rhythm: [],
        typing: []
      };

      const entry = {
        name: name.slice(0, 20),
        score: Number(score),
        time: new Date().toISOString()
      };

      data[game].push(entry);
      // Sort by score descending, keep top 50
      data[game].sort((a, b) => b.score - a.score);
      if (data[game].length > 50) data[game] = data[game].slice(0, 50);

      await kv.set('leaderboard_data', data);
      return res.status(200).json({ ok: true, rank: data[game].findIndex(e => e.name === entry.name && e.score === entry.score) + 1 });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({
      error: 'Database not configured. Add a Vercel KV store from your Vercel dashboard.',
      details: err.message
    });
  }
};
