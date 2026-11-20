import { db, signedPhoto, hashPw, checkPw, makeToken, readToken, bad } from './_lib.js';
import { buildLedger, normHp } from '../shared/points.js';

const clean = (a) => ({ id: a.id, username: a.username, name: a.name, role: a.role });

export default async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'Method tidak didukung');
  try {
    const b = req.body || {};
    // ---- login ----
    if (b.action === 'login') {
      const username = String(b.username || '').trim().toLowerCase(), password = String(b.password || '');
      if (!username || !password) return bad(res, 400, 'Isi username dan password');
      let admins = await db('GET', 'admins', { query: 'select=*' });
      if (!admins.length && process.env.ADMIN_USER && process.env.ADMIN_PASS
          && username === process.env.ADMIN_USER.toLowerCase() && password === process.env.ADMIN_PASS) {
        const a = await db('POST', 'admins', { body: { username, name: process.env.ADMIN_NAME || 'Pemilik', role: 'owner', pass_hash: hashPw(password) }, single: true });
        return res.json({ token: makeToken(clean(a)), user: clean(a) });
      }
      const a = admins.find((x) => x.username === username);
      if (!a || !checkPw(password, a.pass_hash)) return bad(res, 401, 'Username atau password salah');
      return res.json({ token: makeToken(clean(a)), user: clean(a) });
    }

    const me = readToken((req.headers.authorization || '').replace(/^Bearer /, ''));
    if (!me) return bad(res, 401, 'Sesi habis, login lagi');

    switch (b.action) {
      case 'list': {
        const [subs, reds, recipients, admins] = await Promise.all([
          db('GET', 'submissions', { query: 'select=*&order=created_at.desc&limit=5000' }),
          db('GET', 'redemptions', { query: 'select=*&order=created_at.desc&limit=5000' }),
          db('GET', 'recipients', { query: 'select=*&order=created_at.asc' }),
          db('GET', 'admins', { query: 'select=id,username,name,role&order=created_at.asc' }),
        ]);
        return res.json({ me, subs, reds, recipients, admins });
      }
      case 'photo': {
        const s = await db('GET', 'submissions', { query: `select=foto_path&id=eq.${encodeURIComponent(b.id)}`, single: true });
        if (!s) return bad(res, 404, 'Faktur tidak ditemukan');
        return res.json({ url: await signedPhoto(s.foto_path) });
      }
      case 'verify': {
        const belanja = Math.max(0, Math.round(Number(b.belanja) || 0));
        const r = await db('PATCH', 'submissions', { query: `id=eq.${encodeURIComponent(b.id)}`, single: true,
          body: { status: 'ok', belanja, kacang: !!b.kacang, verified_by: me.name || me.username, verified_at: new Date().toISOString() } });
        return res.json({ ok: true, row: r });
      }
      case 'reject':
      case 'reset': {
        const r = await db('PATCH', 'submissions', { query: `id=eq.${encodeURIComponent(b.id)}`, single: true,
          body: b.action === 'reject'
            ? { status: 'no', belanja: 0, kacang: false, verified_by: me.name || me.username, verified_at: new Date().toISOString() }
            : { status: 'baru', belanja: 0, kacang: false, verified_by: null, verified_at: null } });
        return res.json({ ok: true, row: r });
      }
      case 'redeem': {
        const hp = normHp(b.hp), poin = Math.round(Number(b.poin) || 0), hadiah = String(b.hadiah || '').slice(0, 80);
        if (!hp || poin <= 0 || !hadiah) return bad(res, 400, 'Data penukaran belum lengkap');
        const [subs, reds] = await Promise.all([db('GET', 'submissions', { query: 'select=*&limit=5000' }), db('GET', 'redemptions', { query: 'select=*&limit=5000' })]);
        const saldo = buildLedger(subs, reds).byHp[hp]?.saldo || 0;
        if (saldo < poin) return bad(res, 400, `Saldo ${saldo} poin, belum cukup untuk ${poin} poin`);
        const r = await db('POST', 'redemptions', { body: { hp, poin, hadiah, by_name: me.name || me.username }, single: true });
        return res.json({ ok: true, row: r });
      }
      case 'delRedeem':
        await db('DELETE', 'redemptions', { query: `id=eq.${encodeURIComponent(b.id)}` });
        return res.json({ ok: true });
      case 'addRecipient': {
        const email = String(b.email || '').trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad(res, 400, 'Format email belum benar');
        const r = await db('POST', 'recipients', { body: { email }, single: true });
        return res.json({ ok: true, row: r });
      }
      case 'delRecipient':
        await db('DELETE', 'recipients', { query: `id=eq.${encodeURIComponent(b.id)}` });
        return res.json({ ok: true });
      case 'addAdmin': {
        if (me.role !== 'owner') return bad(res, 403, 'Hanya pemilik yang bisa menambah admin');
        const username = String(b.username || '').trim().toLowerCase(), name = String(b.name || '').trim(), pw = String(b.password || '');
        if (!/^[a-z0-9._-]{3,30}$/.test(username)) return bad(res, 400, 'Username 3-30 karakter (huruf kecil, angka, titik, strip)');
        if (pw.length < 6) return bad(res, 400, 'Password minimal 6 karakter');
        const r = await db('POST', 'admins', { body: { username, name: name || username, role: 'admin', pass_hash: hashPw(pw) }, single: true });
        return res.json({ ok: true, row: clean(r) });
      }
      case 'delAdmin':
        if (me.role !== 'owner') return bad(res, 403, 'Hanya pemilik yang bisa menghapus admin');
        if (String(b.id) === String(me.id)) return bad(res, 400, 'Akun sendiri tidak bisa dihapus');
        await db('DELETE', 'admins', { query: `id=eq.${encodeURIComponent(b.id)}` });
        return res.json({ ok: true });
      case 'setPassword': {
        const pw = String(b.password || '');
        if (pw.length < 6) return bad(res, 400, 'Password minimal 6 karakter');
        await db('PATCH', 'admins', { query: `id=eq.${encodeURIComponent(me.id)}`, body: { pass_hash: hashPw(pw) } });
        return res.json({ ok: true });
      }
      default: return bad(res, 400, 'Aksi tidak dikenal');
    }
  } catch (e) {
    return bad(res, 500, e.message);
  }
}
