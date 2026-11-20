// Aturan poin Happy Point KKB (dipakai web dan API)
export const PER_POIN = 100000; // Rp100.000 = 1 poin
export const TIERS = [
  [10, 'Gery Salut 1 pack'],
  [20, 'Gula pasir'],
  [40, 'Minyak goreng 2L'],
  [60, 'Clevo 1 dus'],
  [100, 'Mie instan 1 dus'],
  [330, 'Gift voucher'],
];

export const normHp = (v) => {
  let d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('62')) d = '0' + d.slice(2);
  else if (d && !d.startsWith('0')) d = '0' + d;
  return d;
};

// Hanya faktur terverifikasi (status 'ok') yang ada kacang yang dihitung.
// Sisa belanja di bawah Rp100.000 kebawa ke faktur berikutnya (urut tanggal belanja). Poin tidak hangus.
export function buildLedger(subs, reds = []) {
  const byHp = {};
  for (const s of subs) (byHp[s.hp] ||= []).push(s);
  const out = {}; const perSub = {};
  for (const [hp, list] of Object.entries(byHp)) {
    const nama = [...list].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]?.nama || '';
    let carry = 0, poin = 0, tot = 0;
    const ok = list.filter((s) => s.status === 'ok' && s.kacang)
      .sort((a, b) => (a.tgl_belanja + a.created_at).localeCompare(b.tgl_belanja + b.created_at));
    for (const s of ok) {
      const b = Number(s.belanja) || 0; tot += b;
      const sum = carry + b; const p = Math.floor(sum / PER_POIN);
      perSub[s.id] = { before: carry, p, after: sum - p * PER_POIN };
      poin += p; carry = sum - p * PER_POIN;
    }
    const used = reds.filter((r) => r.hp === hp).reduce((a, r) => a + r.poin, 0);
    out[hp] = { hp, nama, tot, poin, used, saldo: poin - used, carry, n: list.length };
  }
  return { byHp: out, perSub };
}

// Sisa kebawa tepat sebelum faktur tertentu (untuk pratinjau perhitungan di admin)
export function carryBefore(subs, target) {
  let carry = 0;
  const ok = subs.filter((s) => s.hp === target.hp && s.id !== target.id && s.status === 'ok' && s.kacang)
    .filter((s) => (s.tgl_belanja + s.created_at) < (target.tgl_belanja + target.created_at))
    .sort((a, b) => (a.tgl_belanja + a.created_at).localeCompare(b.tgl_belanja + b.created_at));
  for (const s of ok) carry = (carry + (Number(s.belanja) || 0)) % PER_POIN;
  return carry;
}
