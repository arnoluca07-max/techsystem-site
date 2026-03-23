import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import sanitizeHtml from 'sanitize-html';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-immediately';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'arnoluca07@gmail.com').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Sito123';
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`;
const isProd = process.env.NODE_ENV === 'production';

const db = new Database(path.join(__dirname, 'data', 'site.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS site_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    hero_title TEXT NOT NULL,
    hero_subtitle TEXT NOT NULL,
    intro_title TEXT NOT NULL,
    intro_text TEXT NOT NULL,
    section_one_title TEXT NOT NULL,
    section_one_text TEXT NOT NULL,
    section_two_title TEXT NOT NULL,
    section_two_text TEXT NOT NULL,
    section_three_title TEXT NOT NULL,
    section_three_text TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_note TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    need TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS metrics (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL
  );
`);

const defaults = {
  hero_title: 'Un sito che fa sentire il tuo lavoro più forte, più elegante e più credibile.',
  hero_subtitle: 'TechSystem crea presenze online luminose, ordinate e memorabili: pagine che accolgono, raccontano bene chi sei e fanno nascere fiducia al primo sguardo.',
  intro_title: 'Una presenza online che lascia il segno',
  intro_text: 'Ogni dettaglio è pensato per dare una sensazione alta, curata e rassicurante. Il risultato è una pagina bella da vedere, facile da capire e piacevole da usare sia da telefono sia da computer.',
  section_one_title: 'Fa subito una grande impressione',
  section_one_text: 'Chi arriva capisce immediatamente che dietro il brand c’è gusto, attenzione e desiderio di fare le cose bene.',
  section_two_title: 'Racconta con chiarezza quello che fai',
  section_two_text: 'Parole semplici, ritmo pulito e sezioni ordinate aiutano chi legge a orientarsi senza fatica.',
  section_three_title: 'Invita le persone a scriverti',
  section_three_text: 'La pagina accompagna il visitatore con naturalezza verso il contatto, senza confusione e senza distrazioni.',
  contact_email: 'arnoluca07@gmail.com',
  contact_note: 'Scrivimi per raccontarmi la tua attività e l’immagine che vuoi dare online.'
};

const existing = db.prepare('SELECT id FROM site_content WHERE id = 1').get();
if (!existing) {
  db.prepare(`
    INSERT INTO site_content (
      id, hero_title, hero_subtitle, intro_title, intro_text,
      section_one_title, section_one_text,
      section_two_title, section_two_text,
      section_three_title, section_three_text,
      contact_email, contact_note, updated_at
    ) VALUES (
      1, @hero_title, @hero_subtitle, @intro_title, @intro_text,
      @section_one_title, @section_one_text,
      @section_two_title, @section_two_text,
      @section_three_title, @section_three_text,
      @contact_email, @contact_note, @updated_at
    )
  `).run({ ...defaults, updated_at: new Date().toISOString() });
}

const getMetric = db.prepare('SELECT value FROM metrics WHERE key = ?');
const setMetric = db.prepare(`
  INSERT INTO metrics (key, value) VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`);
for (const key of ['visits', 'pageviews']) {
  if (!getMetric.get(key)) setMetric.run(key, 0);
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi. Riprova tra qualche minuto.' }
});

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "img-src": ["'self'", 'data:'],
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "connect-src": ["'self'"],
      "form-action": ["'self'"],
      "base-uri": ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(cookieParser());
app.use('/static', express.static(path.join(__dirname, 'public'), { maxAge: isProd ? '7d' : 0 }));

const adminPasswordHash = bcrypt.hashSync(ADMIN_PASSWORD, 12);

function cleanText(value, max = 300) {
  const stripped = sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} }).trim();
  return stripped.slice(0, max);
}

function signAuthToken() {
  return jwt.sign({ role: 'admin', email: ADMIN_EMAIL }, JWT_SECRET, { expiresIn: '8h', issuer: SITE_URL });
}

function authRequired(req, res, next) {
  const token = req.cookies.admin_token;
  if (!token) return res.status(401).json({ error: 'Accesso richiesto.' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { issuer: SITE_URL });
    if (decoded.role !== 'admin' || decoded.email !== ADMIN_EMAIL) {
      return res.status(401).json({ error: 'Sessione non valida.' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Sessione scaduta.' });
  }
}

function getContent() {
  return db.prepare('SELECT * FROM site_content WHERE id = 1').get();
}

function getStats() {
  return {
    visits: getMetric.get('visits')?.value || 0,
    pageviews: getMetric.get('pageviews')?.value || 0,
    messages: db.prepare('SELECT COUNT(*) AS total FROM messages').get().total || 0
  };
}

app.get('/', (req, res) => {
  setMetric.run('visits', (getMetric.get('visits')?.value || 0) + 1);
  setMetric.run('pageviews', (getMetric.get('pageviews')?.value || 0) + 1);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/content', (req, res) => {
  res.json(getContent());
});

app.post('/api/contact', (req, res) => {
  const name = cleanText(req.body.name, 80);
  const email = cleanText(req.body.email, 120);
  const need = cleanText(req.body.need, 120);
  const message = cleanText(req.body.message, 1500);

  if (!name || !email || !message || !need) {
    return res.status(400).json({ error: 'Compila tutti i campi.' });
  }

  db.prepare('INSERT INTO messages (name, email, need, message, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(name, email, need, message, new Date().toISOString());

  res.json({ ok: true });
});

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const email = cleanText(req.body.email, 120).toLowerCase();
  const password = String(req.body.password || '');

  const emailOk = email === ADMIN_EMAIL;
  const passwordOk = await bcrypt.compare(password, adminPasswordHash);

  if (!emailOk || !passwordOk) {
    return res.status(401).json({ error: 'Email o password non corrette.' });
  }

  const token = signAuthToken();
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
  });

  res.json({ ok: true });
});

app.post('/api/admin/logout', authRequired, (req, res) => {
  res.clearCookie('admin_token', { path: '/' });
  res.json({ ok: true });
});

app.get('/api/admin/me', authRequired, (req, res) => {
  res.json({ ok: true, email: ADMIN_EMAIL });
});

app.get('/api/admin/stats', authRequired, (req, res) => {
  res.json(getStats());
});

app.get('/api/admin/messages', authRequired, (req, res) => {
  const rows = db.prepare('SELECT id, name, email, need, message, created_at FROM messages ORDER BY id DESC').all();
  res.json(rows);
});

app.post('/api/admin/content', authRequired, (req, res) => {
  const payload = {
    hero_title: cleanText(req.body.hero_title, 180),
    hero_subtitle: cleanText(req.body.hero_subtitle, 400),
    intro_title: cleanText(req.body.intro_title, 160),
    intro_text: cleanText(req.body.intro_text, 400),
    section_one_title: cleanText(req.body.section_one_title, 160),
    section_one_text: cleanText(req.body.section_one_text, 300),
    section_two_title: cleanText(req.body.section_two_title, 160),
    section_two_text: cleanText(req.body.section_two_text, 300),
    section_three_title: cleanText(req.body.section_three_title, 160),
    section_three_text: cleanText(req.body.section_three_text, 300),
    contact_email: cleanText(req.body.contact_email, 120),
    contact_note: cleanText(req.body.contact_note, 300),
    updated_at: new Date().toISOString()
  };

  if (Object.values(payload).some((v) => !v)) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori.' });
  }

  db.prepare(`
    UPDATE site_content SET
      hero_title = @hero_title,
      hero_subtitle = @hero_subtitle,
      intro_title = @intro_title,
      intro_text = @intro_text,
      section_one_title = @section_one_title,
      section_one_text = @section_one_text,
      section_two_title = @section_two_title,
      section_two_text = @section_two_text,
      section_three_title = @section_three_title,
      section_three_text = @section_three_text,
      contact_email = @contact_email,
      contact_note = @contact_note,
      updated_at = @updated_at
    WHERE id = 1
  `).run(payload);

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`TechSystem live on http://localhost:${PORT}`);
});
