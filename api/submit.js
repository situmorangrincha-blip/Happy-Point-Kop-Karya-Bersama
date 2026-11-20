import crypto from 'node:crypto';
import { db, uploadPhoto, sendMail, bad } from './_lib.js';
import { normHp } from '../shared/points.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export default async function handler(req, res) {
  if (req.method !== 'POST') return bad(res, 405, 'Method tidak didukung');
  try {
    const b = req.body || {};
    if (b.website) return res.status(200).json({ ok: true }); // honeypot untuk bot
    const nama = String(b.nama || '').trim().slice(0, 80);
    const hp = normHp(b.hp);
    const tgl = String(b.tgl || '');
    if (!nama) return bad(res, 400, 'Nama wajib diisi');
    if (hp.length < 9 || hp.length > 15) return bad(res, 400, 'Nomor telepon belum benar');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) return bad(res, 400, 'Tanggal belanja belum benar');
    const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(b.foto || ''));
    if (!m) return bad(res, 400, 'Foto faktur wajib diupload');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length < 2000 || buf.length > 3_300_000) return bad(res, 400, 'Ukuran foto tidak sesuai, coba foto ulang');

    const path = `${tgl.slice(0, 7)}/${crypto.randomUUID()}.jpg`;
    await uploadPhoto(path, buf);
    const row = await db('POST', 'submissions', { body: { nama, hp, tgl_belanja: tgl, foto_path: path }, single: true });

    // Email notifikasi tidak boleh menggagalkan pengiriman faktur
    let mail = null;
    try {
      const rec = (await db('GET', 'recipients', { query: 'select=email' })).map((r) => r.email);
      const url = (process.env.APP_URL || '').replace(/\/$/, '') + '/admin';
      mail = await sendMail(rec, `Faktur baru Happy Point: ${nama}`,
        `<p>Ada faktur baru masuk.</p><p><b>${esc(nama)}</b><br>HP: ${esc(hp)}<br>Tanggal belanja: ${esc(tgl)}</p><p><a href="${url}">Buka halaman admin</a></p>`);
    } catch (e) { mail = { sent: 0, note: e.message }; }
    return res.status(200).json({ ok: true, id: row?.id, mail });
  } catch (e) {
    return bad(res, 500, e.message);
  }
}
