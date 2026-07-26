// NutriPilot — backend za AI procjenu kalorija (tekst + slika obroka)
// BEZ npm zavisnosti: koristi ugrađeni Node (http + fetch).
// Pokretanje:  postavi ANTHROPIC_API_KEY u .env, pa:  node server.js
// (Treba Node 18+; preporuka Node 20+.)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ---------- učitaj .env (jednostavan parser, bez dotenv paketa) ---------- */
(function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {}
})();

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.MODEL || 'claude-haiku-4-5'; // jeftin i brz; tačnije: 'claude-sonnet-4-6'
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');

if (!API_KEY) {
  console.warn('\n⚠️  ANTHROPIC_API_KEY nije postavljen. Kopiraj .env.example u .env i ubaci ključ.\n');
}

/* ---------- poziv Anthropic Messages API-ja (preko fetch) ---------- */
const API_BASE = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
async function anthropic(body) {
  const r = await fetch(`${API_BASE}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || `API HTTP ${r.status}`);
  return data;
}

/* ---------- strukturisan izlaz preko "tool use" ---------- */
const FOOD_TOOL = {
  name: 'log_food',
  description: 'Vrati procjenu kalorija i makronutrijenata za opisani ili slikani obrok.',
  input_schema: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        description: 'Pojedinačne namirnice/jela prepoznata u obroku.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Naziv namirnice na jeziku korisnika.' },
            emoji: { type: 'string', description: 'Jedan emoji koji predstavlja namirnicu.' },
            quantity: { type: 'string', description: 'Procijenjena količina, npr. "2 kom", "150 g".' },
            kcal: { type: 'number' },
            protein_g: { type: 'number' },
            carbs_g: { type: 'number' },
            fat_g: { type: 'number' }
          },
          required: ['name', 'kcal', 'protein_g', 'carbs_g', 'fat_g']
        }
      },
      confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
      note: { type: 'string', description: 'Kratka napomena za korisnika (opciono).' }
    },
    required: ['items']
  }
};

const SYSTEM_FOOD =
  'Ti si iskusan nutricionista. Procjenjuješ kalorije i makronutrijente iz opisa ili slike obroka. ' +
  'Uvijek koristi alat log_food. Budi realan sa prosječnim porcijama ako količina nije data. ' +
  'Ako unos nije hrana ili je nejasan, vrati prazan niz items i note sa objašnjenjem. ' +
  'Imena namirnica vrati na jeziku korisnika (srpski/crnogorski).';

/* ---------- handleri ---------- */
async function handleEstimate(reqBody, res) {
  if (!API_KEY) return json(res, 500, { error: 'Server nema ANTHROPIC_API_KEY.' });
  const { text, imageBase64, mediaType } = reqBody || {};
  if (!text && !imageBase64) return json(res, 400, { error: 'Pošalji text ili imageBase64.' });

  const content = [];
  if (imageBase64) {
    content.push({ type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } });
  }
  content.push({ type: 'text', text: text ? `Obrok (opis korisnika): ${text}` : 'Procijeni hranu koja se vidi na slici.' });

  const data = await anthropic({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_FOOD,
    tools: [FOOD_TOOL],
    tool_choice: { type: 'tool', name: 'log_food' },
    messages: [{ role: 'user', content }]
  });

  const tool = (data.content || []).find((c) => c.type === 'tool_use');
  if (!tool) return json(res, 502, { error: 'Model nije vratio procjenu.' });

  const items = (tool.input.items || []).map((it) => ({
    name: it.name,
    emoji: it.emoji || '🍽️',
    quantity: it.quantity || '',
    kcal: Math.round(it.kcal || 0),
    protein_g: Math.round(it.protein_g || 0),
    carbs_g: Math.round(it.carbs_g || 0),
    fat_g: Math.round(it.fat_g || 0)
  }));
  const total = items.reduce(
    (a, it) => ({
      kcal: a.kcal + it.kcal,
      protein_g: a.protein_g + it.protein_g,
      carbs_g: a.carbs_g + it.carbs_g,
      fat_g: a.fat_g + it.fat_g
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
  json(res, 200, { items, total, confidence: tool.input.confidence || 'medium', note: tool.input.note || '' });
}

const PLAN_TOOL = {
  name: 'meal_plan',
  description: 'Napravi dnevni plan obroka koji pogađa zadati kalorijski cilj.',
  input_schema: {
    type: 'object',
    properties: {
      meals: {
        type: 'array',
        description: 'Obroci za dan (npr. Doručak, Užina, Ručak, Večera).',
        items: {
          type: 'object',
          properties: {
            slot: { type: 'string', description: 'Doručak / Užina / Ručak / Večera' },
            name: { type: 'string' },
            emoji: { type: 'string' },
            kcal: { type: 'number' },
            protein_g: { type: 'number' },
            carbs_g: { type: 'number' },
            fat_g: { type: 'number' },
            ingredients: {
              type: 'array',
              description: 'Sastojci sa količinama (npr. Piletina 150 g, Riža 100 g).',
              items: {
                type: 'object',
                properties: { item: { type: 'string' }, amount: { type: 'string' } },
                required: ['item', 'amount']
              }
            },
            recipe: { type: 'string', description: 'Kratko uputstvo pripreme (1-2 rečenice).' }
          },
          required: ['slot', 'name', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'ingredients']
        }
      }
    },
    required: ['meals']
  }
};

async function handlePlan(reqBody, res) {
  if (!API_KEY) return json(res, 500, { error: 'Server nema ANTHROPIC_API_KEY.' });
  const { targetKcal, protein, goal, preferences, seed } = reqBody || {};
  const kcal = targetKcal || 2000;
  const prompt =
    `Napravi plan obroka za jedan dan sa ukupno oko ${kcal} kcal (cilj: ${goal || 'održati'}). ` +
    `Ciljaj oko ${protein || Math.round((kcal * 0.3) / 4)} g proteina. ` +
    `Podijeli na 4 obroka: slot mora biti tačno "Doručak", "Užina", "Ručak" ili "Večera". ` +
    (preferences ? `Preferencije/ograničenja: ${preferences}. ` : '') +
    (seed ? `Ovo je varijanta #${seed} — obavezno predloži drugačija jela nego obično, za raznovrsnost. ` : '') +
    `Prilagodi izbor cilju: za mršavljenje lakši i proteinski obroci, za dobijanje mase kalorijski gušći. ` +
    `Za SVAKI obrok obavezno navedi listu sastojaka sa tačnim količinama (npr. „Piletina 150 g", „Riža 80 g", „Maslinovo ulje 1 kašika"). ` +
    `Koristi uobičajene, dostupne namirnice (uklj. domaća jela). Uvijek koristi alat meal_plan.`;

  const data = await anthropic({
    model: MODEL,
    max_tokens: 1500,
    system: 'Ti si nutricionista koji pravi realne, ukusne i uravnotežene planove obroka. Odgovaraj na jeziku korisnika (srpski/crnogorski).',
    tools: [PLAN_TOOL],
    tool_choice: { type: 'tool', name: 'meal_plan' },
    messages: [{ role: 'user', content: prompt }]
  });

  const tool = (data.content || []).find((c) => c.type === 'tool_use');
  if (!tool) return json(res, 502, { error: 'Model nije vratio plan.' });
  const meals = (tool.input.meals || []).map((m) => ({
    slot: m.slot || 'Obrok',
    name: m.name,
    emoji: m.emoji || '🍽️',
    kcal: Math.round(m.kcal || 0),
    protein_g: Math.round(m.protein_g || 0),
    carbs_g: Math.round(m.carbs_g || 0),
    fat_g: Math.round(m.fat_g || 0),
    ingredients: Array.isArray(m.ingredients) ? m.ingredients.map((x) => ({ item: x.item, amount: x.amount })) : [],
    recipe: m.recipe || ''
  }));
  const total = meals.reduce((a, m) => a + m.kcal, 0);
  json(res, 200, { meals, totalKcal: total });
}

async function handleCoach(reqBody, res) {
  if (!API_KEY) return json(res, 500, { error: 'Server nema ANTHROPIC_API_KEY.' });
  const { question, context } = reqBody || {};
  if (!question) return json(res, 400, { error: 'Pošalji question.' });

  const ctx = context
    ? `Kontekst korisnika: cilj ${context.goal}, dnevni cilj ${context.targetKcal} kcal, uneseno ${context.eatenKcal} kcal, preostalo ${context.leftKcal} kcal, streak ${context.streak} dana.`
    : '';

  const data = await anthropic({
    model: MODEL,
    max_tokens: 300,
    system:
      'Ti si topao, motivišući AI trener za ishranu. Odgovaraj kratko (2–4 rečenice), praktično i na jeziku korisnika (srpski/crnogorski). Bez medicinskih tvrdnji; za ozbiljna zdravstvena pitanja preporuči stručnjaka.',
    messages: [{ role: 'user', content: `${ctx}\n\nPitanje: ${question}` }]
  });

  const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(' ').trim();
  json(res, 200, { answer: text || 'Tu sam da pomognem — postavi pitanje o ishrani.' });
}

/* ---------- statički fajlovi ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function serveStatic(req, res) {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  const file = path.join(PUBLIC, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

/* ---------- helpers ---------- */
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => { try { resolve(JSON.parse(d || '{}')); } catch { resolve({}); } });
  });
}

/* ---------- server ---------- */
http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url.startsWith('/api/health')) {
      return json(res, 200, { ok: true, model: MODEL, keySet: !!API_KEY });
    }
    if (req.method === 'POST' && req.url.startsWith('/api/estimate')) return handleEstimate(await readBody(req), res);
    if (req.method === 'POST' && req.url.startsWith('/api/plan')) return handlePlan(await readBody(req), res);
    if (req.method === 'POST' && req.url.startsWith('/api/coach')) return handleCoach(await readBody(req), res);
    if (req.method === 'GET') return serveStatic(req, res);
    json(res, 404, { error: 'Not found' });
  } catch (e) {
    console.error('server error:', e?.message || e);
    json(res, 500, { error: e?.message || 'Greška na serveru.' });
  }
}).listen(PORT, () => {
  console.log(`\n🥑 NutriPilot radi na  http://localhost:${PORT}`);
  console.log(`   Model: ${MODEL}  ·  API ključ: ${API_KEY ? 'postavljen ✓' : 'NEDOSTAJE ✗'}\n`);
});
