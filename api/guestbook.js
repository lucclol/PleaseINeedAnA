let kv;
try {
  const mod = require('@vercel/kv');
  // Check both standard and ec_ prefixed env vars
  if (process.env.KV_REST_API_URL || process.env.ec_KV_REST_API_URL) {
    kv = mod.createClient({
      url: process.env.KV_REST_API_URL || process.env.ec_KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN || process.env.ec_KV_REST_API_TOKEN
    });
  }
} catch (e) { kv = null; }

// In-memory fallback when KV is not configured
// Persists across requests within the same serverless instance
let memoryEntries = [];

async function getEntries() {
  if (kv) {
    try {
      return (await kv.get('guestbook_entries')) || [];
    } catch (e) { /* fall through to memory */ }
  }
  return memoryEntries;
}

async function saveEntries(entries) {
  if (kv) {
    try {
      await kv.set('guestbook_entries', entries);
      return;
    } catch (e) { /* fall through to memory */ }
  }
  memoryEntries = entries;
}

// Slur filter
const blockedPatterns = [
  /\bn[i1]gg[ae3]r?s?\b/i, /\bf[a@]gg?[o0]t?s?\b/i, /\br[e3]t[a@]rd(ed|s)?\b/i,
  /\bk[i1]ke?s?\b/i, /\bsp[i1]c?k?s?\b/i, /\bch[i1]nk?s?\b/i, /\bw[e3]tb[a@]ck?s?\b/i,
  /\btr[a@]nn(y|ie)s?\b/i, /\bcunt?s?\b/i, /\btwat?s?\b/i,
  /\bdy?ke?s?\b/i, /\bgook?s?\b/i, /\bwh[o0]re?s?\b/i,
];

function containsSlur(text) {
  return blockedPatterns.some(p => p.test(text || ''));
}

// Simple rate limiting per IP (in-memory)
const rateLimitMap = {};
const RATE_LIMIT_WINDOW = 10000; // 10 seconds

function isRateLimited(ip) {
  const now = Date.now();
  const last = rateLimitMap[ip] || 0;
  if (now - last < RATE_LIMIT_WINDOW) return true;
  rateLimitMap[ip] = now;
  return false;
}

// Spam detection - repeated similar messages
const recentMessages = [];
const SPAM_WINDOW = 60000; // 1 minute
const MAX_SIMILAR = 3;

function isSpam(msg) {
  const now = Date.now();
  // Clean old entries
  while (recentMessages.length > 0 && now - recentMessages[0].time > SPAM_WINDOW) {
    recentMessages.shift();
  }
  // Check for duplicates or very similar messages
  const normalized = (msg || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const similar = recentMessages.filter(m => m.text === normalized).length;
  recentMessages.push({ text: normalized, time: now });
  return similar >= MAX_SIMILAR;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const entries = await getEntries();
      return res.status(200).json(entries);
    }

    if (req.method === 'POST') {
      const { name, msg, img, audio, authorToken, website } = req.body;

      // Honeypot check
      if (website) return res.status(200).json({ id: 0 });

      // Rate limiting
      const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
      if (isRateLimited(ip)) {
        return res.status(429).json({ error: 'Too many requests. Please wait before posting again.' });
      }

      // Slur filter
      if (containsSlur(name) || containsSlur(msg)) {
        return res.status(400).json({ error: 'Your message contains inappropriate language.' });
      }

      // Spam detection
      if (isSpam(msg)) {
        return res.status(400).json({ error: 'Duplicate or spammy message detected.' });
      }

      const entries = await getEntries();
      const entry = {
        id: Date.now(),
        name: (name || 'Anonymous').slice(0, 50),
        msg: (msg || '').slice(0, 500),
        time: new Date().toISOString(),
        authorToken: authorToken || null
      };
      if (img && img.length < 1500000) entry.img = img;
      if (audio && audio.length < 3000000) entry.audio = audio;
      entries.push(entry);
      if (entries.length > 200) entries.splice(0, entries.length - 200);
      await saveEntries(entries);
      return res.status(200).json(entry);
    }

    if (req.method === 'DELETE') {
      const { password, id, authorToken } = req.body;

      // Clear all entries (owner only)
      if (!id && password === 'paulina') {
        await saveEntries([]);
        return res.status(200).json({ ok: true });
      }

      // Delete single entry by id
      if (id) {
        const entries = await getEntries();
        const entry = entries.find(e => e.id === id);
        if (!entry) return res.status(404).json({ error: 'Entry not found' });

        const isOwner = password === 'paulina';
        const isAuthor = authorToken && entry.authorToken === authorToken;
        if (!isOwner && !isAuthor) {
          return res.status(403).json({ error: 'Not authorized to delete this entry' });
        }

        const filtered = entries.filter(e => e.id !== id);
        await saveEntries(filtered);
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Missing id or password' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
