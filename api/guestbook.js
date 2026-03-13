const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const entries = (await kv.get('guestbook_entries')) || [];
      return res.status(200).json(entries);
    }

    if (req.method === 'POST') {
      const entries = (await kv.get('guestbook_entries')) || [];
      const { name, msg, img, audio } = req.body;
      const entry = {
        id: Date.now(),
        name: (name || 'Anonymous').slice(0, 50),
        msg: (msg || '').slice(0, 500),
        time: new Date().toISOString()
      };
      // Only store image/audio URLs, not base64 (too large for KV)
      if (img && img.length < 200000) entry.img = img;
      if (audio && audio.length < 200000) entry.audio = audio;
      entries.push(entry);
      // Keep last 200 entries
      if (entries.length > 200) entries.splice(0, entries.length - 200);
      await kv.set('guestbook_entries', entries);
      return res.status(200).json(entry);
    }

    if (req.method === 'DELETE') {
      const { password } = req.body;
      if (password !== 'evan') {
        return res.status(403).json({ error: 'Wrong password' });
      }
      await kv.set('guestbook_entries', []);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    // If KV is not configured, return helpful error
    return res.status(500).json({
      error: 'Database not configured. Add a Vercel KV store from your Vercel dashboard.',
      details: err.message
    });
  }
};
