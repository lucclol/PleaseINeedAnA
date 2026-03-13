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
      const { name, msg, img, audio, authorToken } = req.body;
      const entry = {
        id: Date.now(),
        name: (name || 'Anonymous').slice(0, 50),
        msg: (msg || '').slice(0, 500),
        time: new Date().toISOString(),
        authorToken: authorToken || null
      };
      if (img && img.length < 200000) entry.img = img;
      if (audio && audio.length < 200000) entry.audio = audio;
      entries.push(entry);
      if (entries.length > 200) entries.splice(0, entries.length - 200);
      await kv.set('guestbook_entries', entries);
      return res.status(200).json(entry);
    }

    if (req.method === 'DELETE') {
      const { password, id, authorToken } = req.body;

      // Clear all entries (owner only)
      if (!id && password === 'evan') {
        await kv.set('guestbook_entries', []);
        return res.status(200).json({ ok: true });
      }

      // Delete single entry by id
      if (id) {
        const entries = (await kv.get('guestbook_entries')) || [];
        const entry = entries.find(e => e.id === id);
        if (!entry) return res.status(404).json({ error: 'Entry not found' });

        // Owner can delete any entry, author can delete their own
        const isOwner = password === 'evan';
        const isAuthor = authorToken && entry.authorToken === authorToken;
        if (!isOwner && !isAuthor) {
          return res.status(403).json({ error: 'Not authorized to delete this entry' });
        }

        const filtered = entries.filter(e => e.id !== id);
        await kv.set('guestbook_entries', filtered);
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Missing id or password' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({
      error: 'Database not configured. Add a Vercel KV store from your Vercel dashboard.',
      details: err.message
    });
  }
};
