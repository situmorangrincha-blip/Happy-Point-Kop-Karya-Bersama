import React, { useEffect, useMemo, useState } from 'react';
import { post, Rp, fmtTgl } from './api.js';
import { buildLedger, carryBefore, TIERS, PER_POIN } from '../shared/points.js';

const TK = 'hp_admin_token';
const getTok = () => { try { return localStorage.getItem(TK) || ''; } catch { return ''; } };
const setTok = (v) => { try { v ? localStorage.setItem(TK, v) : localStorage.removeItem(TK); } catch { /* abaikan */ } };

export default function Admin() {
  const [tok, setT] = useState(getTok());
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('queue');
  const [toast, setToast] = useState('');
  const say = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const logout = () => { setTok(''); setT(''); setData(null); };
  const act = async (action, p = {}) => {
    try { return await post('/api/admin', { action, ...p }, tok); }
    catch (e) { if (e.status === 401) logout(); throw e; }
  };
  const load = async () => { try { setData(await act('list')); } catch (e) { say(e.message); } };
  useEffect(() => { if (tok) load(); }, [tok]); // eslint-disable-line

  if (!tok) return <Login onOk={(t) => { setTok(t); setT(t); }} />;
  if (!data) return <div className="shell wide"><p className="mut" style={{ padding: 20 }}>Memuat…</p><Toast m={toast} /></div>;

  const props = { data, act, load, say };
  const tabs = [['queue', 'Antrean faktur'], ['cust', 'Pelanggan & saldo'], ['set', 'Pengaturan']];
  return (
    <div className="admin">
      <div className="top"><div className="logo"><i>★</i>Happy Point KKB</div>
        <div className="tabs">{tabs.map(([k, l]) => <button key={k} className={'tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>)}</div>
        <span className="mut who">{data.me.name} <a onClick={logout}>keluar</a></span></div>
      <div className="wrap">
        {tab === 'queue' && <Queue {...props} />}
        {tab === 'cust' && <Cust {...props} />}
        {tab === 'set' && <Settings {...props} />}
      </div>
      <Toast m={toast} />
    </div>
  );
}
const Toast = ({ m }) => <div className={'toast' + (m ? ' on' : '')}>{m}</div>;

function Login({ onOk }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async (e) => { e.preventDefault(); setBusy(true); setErr('');
    try { const r = await post('/api/admin', { action: 'login', username: u, password: p }); onOk(r.token); } catch (x) { setErr(x.message); } finally { setBusy(false); } };
  return (
    <div className="shell"><div className="hero"><b>Admin Happy Point</b><span>Koperasi Karya Bersama</span></div>
      <form className="fbody" onSubmit={go}>
        <label>Username</label><input className="in" value={u} onChange={(e) => setU(e.target.value)} autoCapitalize="none" autoComplete="username" />
        <label>Password</label><input className="in" type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" />
        {err && <div className="err">{err}</div>}
        <button className="btn full" disabled={busy || !u || !p}>{busy ? 'Masuk…' : 'Masuk'}</button>
      </form></div>
  );
}

const STATUS = { baru: ['Baru', 'p-new'], ok: ['Terverifikasi', 'p-ok'], no: ['Ditolak', 'p-no'] };

function Queue({ data, act, load, say }) {
  const [sel, setSel] = useState(null); const [filter, setFilter] = useState('baru');
  const { byHp, perSub } = useMemo(() => buildLedger(data.subs, data.reds), [data]);
  const list = data.subs.filter((s) => filter === 'all' || s.status === filter);
  const s = data.subs.find((x) => x.id === sel);
  const kpi = [['Menunggu cek', data.subs.filter((x) => x.status === 'baru').length], ['Terverifikasi', data.subs.filter((x) => x.status === 'ok').length],
    ['Pelanggan', Object.keys(byHp).length], ['Saldo poin beredar', Object.values(byHp).reduce((a, x) => a + x.saldo, 0)]];
  return (
    <>
      <div className="kpis">{kpi.map(([l, v]) => <div className="kpi" key={l}><small>{l}</small><b>{v}</b></div>)}</div>
      <div className="split">
        <div className="card" style={{ overflow: 'auto' }}>
          <div className="row2" style={{ marginBottom: 8 }}><h3 style={{ margin: 0, flex: 1 }}>Faktur masuk</h3>
            <div className="seg">{[['baru', 'Baru'], ['ok', 'OK'], ['no', 'Ditolak'], ['all', 'Semua']].map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}</div></div>
          <table><thead><tr><th>Tgl belanja</th><th>Nama</th><th>HP</th><th>Status</th></tr></thead>
            <tbody>{list.map((x) => <tr key={x.id} className={'row' + (x.id === sel ? ' sel' : '')} onClick={() => setSel(x.id)}>
              <td>{fmtTgl(x.tgl_belanja)}</td><td>{x.nama}</td><td className="mut">{x.hp}</td><td><span className={'pill ' + STATUS[x.status][1]}>{STATUS[x.status][0]}</span></td></tr>)}
              {!list.length && <tr><td colSpan="4" className="mut" style={{ padding: 16 }}>Tidak ada faktur.</td></tr>}</tbody></table>
        </div>
        <div className="card">{s ? <Detail key={s.id} s={s} subs={data.subs} per={perSub[s.id]} act={act} load={load} say={say} /> : <p className="mut">Pilih satu faktur di daftar.</p>}</div>
      </div>
    </>
  );
}

function Detail({ s, subs, act, load, say }) {
  const [url, setUrl] = useState(''); const [big, setBig] = useState(false);
  const [belanja, setBelanja] = useState(s.belanja ? String(s.belanja) : ''); const [kacang, setKacang] = useState(!!s.kacang); const [busy, setBusy] = useState(false);
  useEffect(() => { let on = true; act('photo', { id: s.id }).then((r) => on && setUrl(r.url)).catch(() => {}); return () => { on = false; }; }, [s.id]); // eslint-disable-line
  const before = carryBefore(subs, s); const b = Number(belanja.replace(/\D/g, '')) || 0;
  const sum = before + b; const p = kacang ? Math.floor(sum / PER_POIN) : 0;
  const run = async (a, msg) => { setBusy(true); try { await act(a, { id: s.id, belanja: b, kacang }); say(msg); await load(); } catch (e) { say(e.message); } finally { setBusy(false); } };
  return (
    <>
      <h3>{s.nama} <span className="mut" style={{ fontWeight: 600 }}>· {s.hp}</span></h3>
      <div className="photo" onClick={() => url && setBig(true)}>{url ? <img src={url} alt="faktur" /> : 'Memuat foto…'}</div>
      <p className="note">Tanggal belanja {s.tgl_belanja} · dikirim {new Date(s.created_at).toLocaleString('id-ID')}</p>
      <label>Total belanja produk Garudafood &amp; Dilan (Rp)</label>
      <input className="in" inputMode="numeric" value={belanja ? Number(belanja.replace(/\D/g, '')).toLocaleString('id-ID') : ''} onChange={(e) => setBelanja(e.target.value)} placeholder="mis. 450.000" />
      <label className="chk"><input type="checkbox" checked={kacang} onChange={(e) => setKacang(e.target.checked)} /><span>Ada <b>Kacang Atom / Kacang Kulit 1000</b> minimal 1 Ball di faktur ini</span></label>
      <div className="calc">
        {!kacang ? <><div><span>Syarat kacang</span><span style={{ color: 'var(--bad)' }}>belum terpenuhi</span></div><div className="big"><span>Poin faktur ini</span><span>0</span></div><div className="mut sm">Tanpa kacang, belanja faktur ini tidak dihitung.</div></>
          : <><div><span>Sisa kebawa sebelumnya</span><span>{Rp(before)}</span></div><div><span>+ Belanja faktur ini</span><span>{Rp(b)}</span></div><div><span>Jumlah</span><span>{Rp(sum)}</span></div>
            <div className="big"><span>Poin faktur ini</span><span>+{p}</span></div><div className="mut sm">Sisa kebawa ke faktur berikutnya: {Rp(sum - p * PER_POIN)}</div></>}
      </div>
      <div className="row2" style={{ marginTop: 12 }}>
        <button className="btn" style={{ flex: 2 }} disabled={busy || (kacang && !b)} onClick={() => run('verify', 'Tersimpan, saldo pelanggan diperbarui')}>Simpan verifikasi</button>
        <button className="btn bad" style={{ flex: 1 }} disabled={busy} onClick={() => run('reject', 'Faktur ditolak')}>Tolak</button></div>
      {s.status !== 'baru' && <p className="note" style={{ marginTop: 8 }}>{STATUS[s.status][0]} oleh {s.verified_by || '-'} · {s.verified_at ? new Date(s.verified_at).toLocaleString('id-ID') : ''} <a onClick={() => run('reset', 'Dikembalikan ke antrean')}>kembalikan ke antrean</a></p>}
      {big && <div className="lightbox" onClick={() => setBig(false)}><img src={url} alt="faktur besar" /></div>}
    </>
  );
}

function Cust({ data, act, load, say }) {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(null); const [pick, setPick] = useState(null);
  const { byHp } = useMemo(() => buildLedger(data.subs, data.reds), [data]);
  const rows = Object.values(byHp).filter((x) => (x.nama + x.hp).toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.saldo - a.saldo);
  const redeem = async (hp, t) => { try { await act('redeem', { hp, poin: t[0], hadiah: t[1] }); say(`Ditukar: ${t[1]} (−${t[0]} poin)`); setPick(null); await load(); } catch (e) { say(e.message); } };
  const del = async (id) => { if (!confirm('Batalkan penukaran ini? Poin dikembalikan ke saldo.')) return; try { await act('delRedeem', { id }); await load(); } catch (e) { say(e.message); } };
  const xl = async () => {
    const X = await import('xlsx'); const { perSub } = buildLedger(data.subs, data.reds);
    const faktur = data.subs.map((s) => ({ 'Tgl belanja': s.tgl_belanja, Nama: s.nama, HP: s.hp, Status: STATUS[s.status][0], 'Belanja Garudafood+Dilan': s.belanja, 'Ada kacang 1 Ball': s.kacang ? 'Ya' : 'Tidak', 'Poin faktur': perSub[s.id]?.p ?? 0, 'Diverifikasi oleh': s.verified_by || '', 'Waktu kirim': new Date(s.created_at).toLocaleString('id-ID') }));
    const rekap = Object.values(byHp).map((x) => ({ Nama: x.nama, HP: x.hp, 'Jumlah faktur': x.n, 'Total belanja': x.tot, 'Poin didapat': x.poin, 'Sudah ditukar': x.used, 'Saldo poin': x.saldo, 'Sisa belanja kebawa': x.carry }));
    const tukar = data.reds.map((r) => ({ Tanggal: new Date(r.created_at).toLocaleString('id-ID'), HP: r.hp, Hadiah: r.hadiah, Poin: r.poin, Oleh: r.by_name || '' }));
    const wb = X.utils.book_new();
    for (const [n, d] of [['Faktur', faktur], ['Rekap Poin', rekap], ['Penukaran', tukar]]) { const ws = X.utils.json_to_sheet(d); ws['!cols'] = Object.keys(d[0] || { a: 1 }).map((k) => ({ wch: Math.max(12, k.length + 2) })); X.utils.book_append_sheet(wb, ws, n); }
    X.writeFile(wb, `HappyPoint_KKB_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  return (
    <>
      <div className="row2" style={{ marginBottom: 10 }}><input className="in" placeholder="cari nama / nomor HP" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn sec" style={{ flex: 'none' }} onClick={xl}>⬇ Export Excel</button></div>
      <div className="card" style={{ overflow: 'auto', marginBottom: 12 }}>
        <table><thead><tr><th>Nama</th><th>HP</th><th className="r">Total belanja</th><th className="r">Poin</th><th className="r">Ditukar</th><th className="r">Saldo</th><th className="r">Sisa kebawa</th><th /></tr></thead>
          <tbody>{rows.map((x) => { const reds = data.reds.filter((r) => r.hp === x.hp); return (
            <React.Fragment key={x.hp}>
              <tr><td>{x.nama}</td><td className="mut">{x.hp}</td><td className="r">{Rp(x.tot)}</td><td className="r">{x.poin}</td><td className="r"><a onClick={() => setOpen(open === x.hp ? null : x.hp)}>{x.used}</a></td>
                <td className="r"><b style={{ color: 'var(--pri)' }}>{x.saldo}</b></td><td className="r mut">{Rp(x.carry)}</td><td className="r"><button className="btn sm sec" disabled={x.saldo < TIERS[0][0]} onClick={() => setPick(pick === x.hp ? null : x.hp)}>Tukar</button></td></tr>
              {pick === x.hp && <tr><td colSpan="8"><div className="tiers">{TIERS.map((t) => <button key={t[0]} className="tier" disabled={x.saldo < t[0]} onClick={() => redeem(x.hp, t)}><span>{t[1]}</span><b>{t[0]}</b></button>)}</div></td></tr>}
              {open === x.hp && <tr><td colSpan="8" className="sm mut">{reds.length ? reds.map((r) => <div key={r.id}>{new Date(r.created_at).toLocaleDateString('id-ID')} · {r.hadiah} (−{r.poin}) oleh {r.by_name} <a onClick={() => del(r.id)}>batalkan</a></div>) : 'Belum ada penukaran.'}</td></tr>}
            </React.Fragment>); })}
            {!rows.length && <tr><td colSpan="8" className="mut" style={{ padding: 16 }}>Belum ada pelanggan.</td></tr>}</tbody></table>
      </div>
      <div className="card"><h3>Hadiah</h3><div className="tiers">{TIERS.map((t) => <div className="tier" key={t[0]}><span>{t[1]}</span><b>{t[0]}</b></div>)}</div></div>
    </>
  );
}

function Settings({ data, act, load, say }) {
  const [em, setEm] = useState(''); const [a, setA] = useState({ username: '', name: '', password: '' }); const [pw, setPw] = useState('');
  const run = async (fn, msg) => { try { await fn(); if (msg) say(msg); await load(); } catch (e) { say(e.message); } };
  const owner = data.me.role === 'owner';
  return (
    <div className="grid2">
      <div className="card"><h3>Email notifikasi</h3><p className="note">Tiap ada faktur baru, email masuk ke semua alamat ini.</p>
        {data.recipients.map((r) => <div className="em" key={r.id}><span>{r.email}</span><button onClick={() => run(() => act('delRecipient', { id: r.id }))}>hapus</button></div>)}
        <div className="row2" style={{ marginTop: 8 }}><input className="in" placeholder="tambah email penerima" value={em} onChange={(e) => setEm(e.target.value)} />
          <button className="btn sm" onClick={() => run(async () => { await act('addRecipient', { email: em }); setEm(''); }, 'Penerima ditambahkan')}>Tambah</button></div></div>
      <div className="card"><h3>Akun admin</h3><p className="note">Tiap orang punya login sendiri, jadi tercatat siapa yang memverifikasi.</p>
        {data.admins.map((x) => <div className="em" key={x.id}><span>{x.name} <span className="mut">({x.username})</span></span><span className="mut sm" style={{ flex: 'none' }}>{x.role === 'owner' ? 'pemilik' : 'admin'}</span>
          {owner && x.id !== data.me.id && <button onClick={() => confirm('Hapus akun ' + x.name + '?') && run(() => act('delAdmin', { id: x.id }), 'Akun dihapus')}>hapus</button>}</div>)}
        {owner && <><label>Tambah admin</label><div className="row2"><input className="in" placeholder="username" value={a.username} onChange={(e) => setA({ ...a, username: e.target.value })} autoCapitalize="none" />
          <input className="in" placeholder="nama" value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} /></div>
          <div className="row2" style={{ marginTop: 6 }}><input className="in" placeholder="password (min 6)" type="password" value={a.password} onChange={(e) => setA({ ...a, password: e.target.value })} />
            <button className="btn sm" onClick={() => run(async () => { await act('addAdmin', a); setA({ username: '', name: '', password: '' }); }, 'Admin ditambahkan')}>Tambah</button></div></>}
        <label>Ganti password saya</label><div className="row2"><input className="in" type="password" placeholder="password baru" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn sm sec" onClick={() => run(async () => { await act('setPassword', { password: pw }); setPw(''); }, 'Password diganti')}>Simpan</button></div></div>
    </div>
  );
}
