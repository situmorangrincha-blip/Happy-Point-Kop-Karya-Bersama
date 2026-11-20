import crypto from 'node:crypto';

const need = (k) => { const v = process.env[k]; if (!v) throw new Error('Env belum diisi: ' + k); return v; };
const base = () => need('SUPABASE_URL').replace(/\/$/, '');
const key = () => need('SUPABASE_SERVICE_KEY');
const hdr = (extra = {}) => ({ apikey: key(), Authorization: 'Bearer ' + key(), ...extra });

export async function db(method, table, { query = '', body, single = false } = {}) {
  const r = await fetch(`${base()}/rest/v1/${table}${query ? '?' + query : ''}`, {
    method,
    headers: hdr({ 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Database ${r.status}: ${t.slice(0, 200)}`);
  const j = t ? JSON.parse(t) : [];
  return single ? j[0] : j;
}

export async function uploadPhoto(path, buf) {
  const r = await fetch(`${base()}/storage/v1/object/faktur/${path}`, {
    method: 'POST', headers: hdr({ 'Content-Type': 'image/jpeg', 'x-upsert': 'false' }), body: buf,
  });
  if (!r.ok) throw new Error('Upload foto gagal: ' + (await r.text()).slice(0, 200));
}

export async function signedPhoto(path) {
  const r = await fetch(`${base()}/storage/v1/object/sign/faktur/${path}`, {
    method: 'POST', headers: hdr({ 'Content-Type': 'application/json' }), body: JSON.stringify({ expiresIn: 900 }),
  });
  const j = await r.json();
  if (!r.ok || !j.signedURL) throw new Error('Foto tidak ditemukan');
  return `${base()}/storage/v1${j.signedURL}`;
}

// ---- password dan sesi ----
export const hashPw = (pw) => { const salt = crypto.randomBytes(16).toString('hex'); return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex'); };
export const checkPw = (pw, h) => {
  const [salt, hex] = String(h || '').split(':'); if (!salt || !hex) return false;
  const a = Buffer.from(crypto.scryptSync(pw, salt, 32).toString('hex')); const b = Buffer.from(hex);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const sign = (p) => crypto.createHmac('sha256', need('SESSION_SECRET')).update(p).digest('base64url');
export const makeToken = (u) => { const p = Buffer.from(JSON.stringify({ ...u, exp: Date.now() + 14 * 864e5 })).toString('base64url'); return p + '.' + sign(p); };
export const readToken = (t) => {
  try {
    const [p, s] = String(t || '').split('.');
    if (!p || !s || sign(p) !== s) return null;
    const u = JSON.parse(Buffer.from(p, 'base64url').toString());
    return u.exp > Date.now() ? u : null;
  } catch { return null; }
};

// ---- email (Gmail SMTP lewat nodemailer) ----
export async function sendMail(to, subject, html) {
  if (!to.length) return { sent: 0, note: 'Tidak ada penerima' };
  const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS;
  if (!user || !pass) return { sent: 0, note: 'SMTP_USER / SMTP_PASS belum diisi' };
  const nodemailer = (await import('nodemailer')).default;
  const tr = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  await tr.sendMail({ from: `"Happy Point KKB" <${user}>`, to: to.join(','), subject, html });
  return { sent: to.length };
}

export const bad = (res, code, msg) => res.status(code).json({ error: msg });
