import React, { useRef, useState } from 'react';
import { post, compress, today } from './api.js';

export default function Form() {
  const [nama, setNama] = useState(''); const [hp, setHp] = useState(''); const [tgl, setTgl] = useState(today());
  const [foto, setFoto] = useState(null); const [prev, setPrev] = useState(''); const [bot, setBot] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(false);
  const file = useRef();
  const ok = nama.trim() && hp.replace(/\D/g, '').length >= 9 && tgl && foto && !busy;

  const pick = async (e) => {
    const f = e.target.files?.[0]; if (!f) return; setErr('');
    try { const d = await compress(f); setFoto(d); setPrev(d); } catch (x) { setErr(x.message); }
  };
  const send = async () => {
    setBusy(true); setErr('');
    try { await post('/api/submit', { nama, hp, tgl, foto, website: bot }); setDone(true); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  const again = () => { setNama(''); setHp(''); setTgl(today()); setFoto(null); setPrev(''); setDone(false); };

  return (
    <div className="shell">
      <div className="hero"><div className="coin">★</div><b>Happy Point</b><span>Koperasi Karya Bersama · Juni–Des 2026</span></div>
      {done ? (
        <div className="fbody done"><div className="ck">✓</div><b style={{ fontSize: 18 }}>Faktur terkirim</b>
          <p className="mut" style={{ margin: '8px 0 18px' }}>Terima kasih! Tim akan mengecek faktur dan menghitung poinmu.</p>
          <button className="btn sec" onClick={again}>Kirim faktur lain</button></div>
      ) : (
        <div className="fbody">
          <label>Nama pelanggan</label><input className="in" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Budi Santoso" autoComplete="name" />
          <label>Nomor telepon</label><input className="in" value={hp} onChange={(e) => setHp(e.target.value)} inputMode="tel" placeholder="08xx-xxxx-xxxx" autoComplete="tel" />
          <label>Tanggal belanja</label><input className="in" type="date" value={tgl} max={today()} onChange={(e) => setTgl(e.target.value)} />
          <label>Foto faktur</label>
          <input ref={file} type="file" accept="image/*" hidden onChange={pick} />
          <div className={'drop' + (foto ? ' has' : '')} onClick={() => file.current.click()}>
            {prev ? <><img src={prev} alt="faktur" /><div>✓ Foto terpilih. Ketuk untuk ganti</div></> : '📷 Ketuk untuk foto / pilih dari galeri'}
          </div>
          <input className="hp-trap" tabIndex={-1} autoComplete="off" value={bot} onChange={(e) => setBot(e.target.value)} aria-hidden="true" />
          {err && <div className="err">{err}</div>}
          <button className="btn full" disabled={!ok} onClick={send}>{busy ? 'Mengirim…' : 'Kirim faktur'}</button>
          <div className="rule"><b>Cara dapat poin:</b> belanja produk Garudafood &amp; Dilan Rp100.000 = 1 poin, wajib ada Kacang Atom / Kacang Kulit 1000 min. 1 Ball per faktur. Poin dihitung tim Garudafood setelah faktur dicek.</div>
        </div>
      )}
    </div>
  );
}
