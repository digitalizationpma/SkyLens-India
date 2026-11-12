/* Supabase SkyLens India (akun varietyspontanea, ref ykugzswjdjwuakokidkg, ap-south-1). ?backend=mock = backend tiruan di browser (uji tanpa internet). */
var VN_SB_URL = 'https://ykugzswjdjwuakokidkg.supabase.co';
var VN_SB_KEY = 'sb_publishable_seDWueM8yUZ70g0HEtxGpw_16jpZ-hE';
(function(){ try{ var q = new URLSearchParams(location.search).get('backend'); if(q) localStorage.setItem('slvn_backend', q); if(localStorage.getItem('slvn_backend') === 'mock'){ VN_SB_URL = 'https://mock.skylens-in.local'; VN_SB_KEY = 'mock'; } }catch(e){} })();
/* SkyLens India — konfigurasi app (fork SkyLens 2.0). Dibangkitkan oleh tools/patch_app.py */
/* data area (zona, outlet, jalan) diambil per depo dari GitHub Pages; di browser cukup relatif */
const DATA_URL = (location.hostname === 'appassets.androidplatform.net') ? 'https://digitalizationpma.github.io/SkyLens-India/app/' : './';
const VN_DEPO = null;   // nasional: semua NPP (dulu pilot BIG SON)
const VN_SIKLUS_MULAI = '2026-11-09';            // Senin minggu ke-1 siklus 4 minggu (bisa diganti lewat dashboard › Super Admin)
const VN_BATAS_ORDER_KECIL = 1000;                // alasan "order kecil" (INR)
const VN_ROSTER_NAT = {"NDD MUMBAI":{"A":[["MUM-M01","SALES M01"],["MUM-M02","SALES M02"],["MUM-M03","SALES M03"],["MUM-M04","SALES M04"],["MUM-M05","SALES M05"],["MUM-M06","SALES M06"],["MUM-M07","SALES M07"],["MUM-V01","Vacant SR"]],"AF":[["MUM-M01","SALES M01"],["MUM-M02","SALES M02"],["MUM-M03","SALES M03"],["MUM-M04","SALES M04"],["MUM-M05","SALES M05"],["MUM-M06","SALES M06"],["MUM-M07","SALES M07"],["MUM-V01","Vacant SR"]],"BF":[["MUM-M01","SALES M01"],["MUM-M02","SALES M02"],["MUM-M03","SALES M03"],["MUM-M04","SALES M04"],["MUM-M05","SALES M05"],["MUM-M06","SALES M06"],["MUM-M07","SALES M07"],["MUM-V01","Vacant SR"]]}};
function vnSkenario(){ try{ var s = localStorage.getItem('slvn_skenario'); if(['A', 'AF', 'BF'].indexOf(s) >= 0) return s; }catch(e){} return 'A'; }
function vnFokus(){ try{ var f = localStorage.getItem('slvn_fokus'); if(f === 'SEMUA' || f === 'HUNTER') return f; }catch(e){} return 'SEMUA'; }
function vnTis(){ try{ var t = +localStorage.getItem('slvn_tis'); if(t >= 1 && t <= 60) return t; }catch(e){} return 5; }   /* India: waktu per toko (menit), diatur Super Admin */
function vnSiklusMulai(){ try{ var s = localStorage.getItem('slvn_siklus_mulai'); if(/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return s; }catch(e){} return VN_SIKLUS_MULAI; }
/* Hunter saja: sales FARMER tidak memegang petak (sama dengan "fokus GDKDA" di Indonesia). MIXED (skenario M) selalu ikut. */
function vnDiluarFokus(nama){ return vnFokus() === 'HUNTER' && /^FARMER\b/i.test(String(nama || '').trim()); }
const MANIFEST = {"NDD MUMBAI":{"region":"MUMBAI","reg":"W01","center":[19.0885,72.8996],"n_zona":5136,"n_outlet":3665,"db":"NDDMUM"}};
const ROSTER = {}; Object.keys(VN_ROSTER_NAT).forEach(function(d){ ROSTER[d] = VN_ROSTER_NAT[d][vnSkenario()] || []; }); ROSTER['TESTING'] = [['TEST-KEVIN','TESTER KEVIN'],['TEST-01','TESTER 01']];
const MANAJER = {};
var VN_KATALOG = (function(){ try{ return JSON.parse(localStorage.getItem('slvn_katalog') || '[]'); }catch(e){ return []; } })();
/* pengaturan bersama dari server (tabel app_config): skenario JKS, fokus penyisir, tanggal mulai siklus, katalog */
async function vnMuatConfig(){
  try{
    const r = await fetch(VN_SB_URL + '/rest/v1/app_config?select=kunci,nilai', {headers: {apikey: VN_SB_KEY, Authorization: 'Bearer ' + VN_SB_KEY}});
    if(!r.ok) return;
    const map = {skenario_jks: 'slvn_skenario', fokus_penyisir: 'slvn_fokus', siklus_mulai: 'slvn_siklus_mulai'};
    const peta2 = {tis_menit: 'slvn_tis'};
    (await r.json()).forEach(x => {
      if(map[x.kunci] && typeof x.nilai === 'string') localStorage.setItem(map[x.kunci], x.nilai);
      if(peta2[x.kunci] != null && x.nilai != null) localStorage.setItem(peta2[x.kunci], String(x.nilai));
      if(x.kunci === 'katalog_vn' && Array.isArray(x.nilai)){ localStorage.setItem('slvn_katalog', JSON.stringify(x.nilai)); VN_KATALOG = x.nilai; }
    });
  }catch(e){}
}

/* ambil JSON data area: jaringan dulu, kalau gagal pakai salinan terakhir (Cache API) supaya app tetap jalan tanpa sinyal */
async function vnAmbilJson(url){
  let cache = null; try{ cache = await caches.open('slvn-data-v1'); }catch(e){}
  try{
    const r = await fetch(url, {cache: 'no-cache'});
    if(!r.ok) throw new Error('HTTP ' + r.status);
    if(cache){ try{ await cache.put(url, r.clone()); }catch(e){} }
    return await r.json();
  }catch(e){
    if(cache){ const m = await cache.match(url); if(m) return await m.json(); }
    throw e;
  }
}

/* data toko & petak per depo: hanya untuk sales yang sudah masuk dengan PIN (RPC sales_data). Salinan terakhir disimpan untuk dipakai tanpa sinyal. */
async function vnDataSales(dep){
  const kunci = 'https://slvn.local/area/' + encodeURIComponent(dep) + '/' + vnSkenario();
  let cache = null; try{ cache = await caches.open('slvn-data-v2'); }catch(e){}
  try{
    if(!sesi || !sesi.token) throw new Error('tanpa sesi');
    const j = await rpc('sales_data', {p_token: sesi.token, p_sken: vnSkenario()});
    if(!j || !j.ok) throw new Error((j && j.error) || 'data ditolak');
    const isi = {zona: j.zona || [], outlet: j.outlet || [], kpi: j.kpi || {}};
    if(cache){ try{ await cache.put(kunci, new Response(JSON.stringify(isi), {headers: {'Content-Type': 'application/json'}})); }catch(e){} }
    return isi;
  }catch(e){
    if(cache){ const m = await cache.match(kunci); if(m) return await m.json(); }
    throw e;
  }
}
