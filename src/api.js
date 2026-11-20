export async function post(url, body, token) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch { /* kosong */ }
  if (!r.ok) { const e = new Error(j.error || 'Terjadi kesalahan (' + r.status + ')'); e.status = r.status; throw e; }
  return j;
}
export const Rp = (n) => 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
export const fmtTgl = (d) => (d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(2, 4) : '');
export const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

// kecilkan foto di HP supaya cepat diupload (maks 1600px, JPEG)
export function compress(file, max = 1600, q = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Foto tidak bisa dibaca, coba foto lain')); };
    img.src = url;
  });
}
