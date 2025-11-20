// js/app.js - main logic for Perpustakaan with cart
const STORAGE_KEY = 'perpus_data_v1';
const STORAGE_CATEGORIES = 'perpus_categories_v1';
const STORAGE_ACTIVITY = 'perpus_activity_v1';
const STORAGE_CART = 'perpus_cart_v1';

/* ---------- Default data (seed) ---------- */
const defaultBooks = [
  { id: 1, judul: "Pemrograman Dasar", penulis: "A. Programmer", kategori: "Teknologi", cover: "" },
  { id: 2, judul: "Algoritma & Struktur Data", penulis: "B. Developer", kategori: "Teknologi", cover: "" },
  { id: 3, judul: "Sejarah Indonesia", penulis: "Sejarawan C", kategori: "Sejarah", cover: "" },
  { id: 4, judul: "Dasar Statistik", penulis: "D. Data", kategori: "Matematika", cover: "" }
];
const defaultCategories = ["Teknologi", "Sejarah", "Matematika"];

/* ---------- Storage helpers ---------- */
function getRaw(key){ return localStorage.getItem(key); }
function loadJSON(key, fallback){ const r = getRaw(key); return r ? JSON.parse(r) : fallback; }
function saveJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

/* init if empty */
function ensureInitialData(){
  if (!getRaw(STORAGE_KEY)) saveJSON(STORAGE_KEY, defaultBooks);
  if (!getRaw(STORAGE_CATEGORIES)) saveJSON(STORAGE_CATEGORIES, defaultCategories);
  if (!getRaw(STORAGE_ACTIVITY)) saveJSON(STORAGE_ACTIVITY, []);
  if (!getRaw(STORAGE_CART)) saveJSON(STORAGE_CART, []);
}
ensureInitialData();

/* ---------- getters/setters ---------- */
function getAllBooks(){ return loadJSON(STORAGE_KEY, []); }
function saveAllBooks(arr){ saveJSON(STORAGE_KEY, arr); }

function getCategories(){ return loadJSON(STORAGE_CATEGORIES, []); }
function saveCategories(arr){ saveJSON(STORAGE_CATEGORIES, arr); }

function getActivity(){ return loadJSON(STORAGE_ACTIVITY, []); }
function logActivity(text){ const logs = getActivity(); logs.unshift({ time: new Date().toISOString(), text }); saveJSON(STORAGE_ACTIVITY, logs); }

function getCart(){ return loadJSON(STORAGE_CART, []); }
function saveCart(arr){ saveJSON(STORAGE_CART, arr); }

/* ---------- util: base64 file reader ---------- */
function fileToBase64(file){
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = e => reject(e);
    reader.readAsDataURL(file);
  });
}

/* ---------- fallback cover (if none) ---------- */
const COVER_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='600'>
    <rect width='100%' height='100%' fill='#f3f4f6'/>
    <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='#9ca3af' font-size='24'>No cover</text>
  </svg>`
);

/* ---------- CRUD buku ---------- */
function addBook(b){
  const books = getAllBooks();
  b.id = (books.reduce((m,x)=>Math.max(m,x.id),0) || 0) + 1;
  books.push(b);
  saveAllBooks(books);
  logActivity(`Admin menambah buku: ${b.judul}`);
}
function updateBook(b){
  const books = getAllBooks();
  const idx = books.findIndex(x=>x.id===b.id);
  if (idx === -1) return false;
  books[idx] = b;
  saveAllBooks(books);
  logActivity(`Admin mengedit buku: ${b.judul}`);
  return true;
}
function deleteBook(id){
  const books = getAllBooks();
  const removed = books.find(x=>x.id===id);
  const filtered = books.filter(x=>x.id!==id);
  saveAllBooks(filtered);
  logActivity(`Admin menghapus buku: ${removed ? removed.judul : id}`);
}
function getBookById(id){ return getAllBooks().find(b=>b.id===id); }

/* ---------- Kategori ---------- */
function addCategory(name){
  if (!name) return;
  const cats = getCategories();
  if (!cats.includes(name)){
    cats.push(name);
    saveCategories(cats);
    logActivity(`Admin menambah kategori: ${name}`);
  }
}
function removeCategory(name){
  const cats = getCategories().filter(c=>c!==name);
  saveCategories(cats);
  logActivity(`Admin menghapus kategori: ${name}`);
}

/* ---------- Rekomendasi: kategori terbanyak ---------- */
function getTopCategory(){
  const books = getAllBooks();
  if (!books.length) return null;
  const counts = {};
  books.forEach(b => counts[b.kategori] = (counts[b.kategori]||0)+1);
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  return sorted.length ? sorted[0][0] : null;
}
function getRecommendations(limit=4){
  const top = getTopCategory();
  if (!top) return [];
  return getAllBooks().filter(b=>b.kategori===top).slice(0, limit);
}

/* ---------- Cart functions ---------- */
function addToCart(id){
  const cart = getCart();
  if (!cart.includes(id)) {
    cart.push(id);
    saveCart(cart);
    logActivity(`User menambahkan buku ke keranjang: id=${id}`);
    return true;
  }
  return false;
}
function removeFromCart(id){
  let cart = getCart().filter(x=>x!==id);
  saveCart(cart);
  logActivity(`User menghapus buku dari keranjang: id=${id}`);
}
function clearCart(){ saveCart([]); logActivity('User mengosongkan keranjang'); }

/* ---------- Render helpers: create card DOM ---------- */
function createBookCardElement(book, options = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'book-card';

  const coverBox = document.createElement('div');
  coverBox.className = 'book-cover';
  const img = document.createElement('img');
  img.alt = book.judul;
  img.src = book.cover && book.cover.trim() ? book.cover : COVER_PLACEHOLDER;
  img.onerror = ()=>{ img.src = COVER_PLACEHOLDER; };
  coverBox.appendChild(img);
  wrapper.appendChild(coverBox);

  const title = document.createElement('div');
  title.className = 'book-title';
  title.textContent = book.judul;
  wrapper.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'book-meta';
  meta.textContent = `${book.penulis} • ${book.kategori}`;
  wrapper.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const btnView = document.createElement('button');
  btnView.textContent = 'Lihat';
  btnView.onclick = ()=> { window.location.href = `detail.html?id=${book.id}`; logActivity(`User membuka detail buku: ${book.judul}`); };
  actions.appendChild(btnView);

  const btnCart = document.createElement('button');
  btnCart.textContent = 'Tambah ke Keranjang';
  btnCart.onclick = ()=> {
    const ok = addToCart(book.id);
    if (ok) alert('Buku berhasil ditambahkan ke keranjang');
    else alert('Buku sudah ada di keranjang');
  };
  actions.appendChild(btnCart);

  if (options.admin){
    const btnEdit = document.createElement('button');
    btnEdit.textContent = 'Edit';
    btnEdit.onclick = ()=> { if (typeof fillEditForm === 'function') fillEditForm(book); };
    actions.appendChild(btnEdit);

    const btnDelete = document.createElement('button');
    btnDelete.textContent = 'Hapus';
    btnDelete.onclick = ()=> {
      if (confirm(`Hapus buku "${book.judul}"?`)) {
        deleteBook(book.id);
        if (typeof renderAdminPage === 'function') renderAdminPage();
      }
    };
    actions.appendChild(btnDelete);
  }

  wrapper.appendChild(actions);
  return wrapper;
}

/* ---------- Page render functions ---------- */

/* Home recommendations */
function renderHomeRecommendations(){
  const el = document.getElementById('home-rekomendasi');
  if (!el) return;
  el.innerHTML = '';
  const recs = getRecommendations(6);
  if (!recs.length){ el.textContent = 'Belum ada rekomendasi.'; return; }
  recs.forEach(b => el.appendChild(createBookCardElement(b)));
}

/* Koleksi page (search + filter) */
function renderCollectionPage(){
  const listEl = document.getElementById('koleksi-list');
  const search = document.getElementById('search-input');
  const filter = document.getElementById('filter-kategori');
  if (!listEl) return;

  // populate categories
  const cats = getCategories();
  filter.innerHTML = '<option value="">Semua kategori</option>';
  cats.forEach(c => {
    const o = document.createElement('option'); o.value = c; o.textContent = c; filter.appendChild(o);
  });

  function refresh(){
    const q = (search.value || '').toLowerCase();
    const k = filter.value;
    const books = getAllBooks().filter(b => {
      const matchesQ = b.judul.toLowerCase().includes(q) || b.penulis.toLowerCase().includes(q);
      const matchesK = k ? b.kategori === k : true;
      return matchesQ && matchesK;
    });
    listEl.innerHTML = '';
    if (!books.length) { listEl.textContent = 'Tidak ada buku ditemukan.'; return; }
    books.forEach(b => listEl.appendChild(createBookCardElement(b)));
    logActivity(`User mencari: "${q}" kategori="${k}"`);
  }

  search.addEventListener('input', refresh);
  filter.addEventListener('change', refresh);
  refresh();
}

/* Recommendation page */
function renderRecommendationPage(){
  const sel = document.getElementById('kategori-select');
  const listEl = document.getElementById('rekomendasi-list');
  if (!sel || !listEl) return;

  sel.innerHTML = '<option value="">-- Pilih kategori --</option>';
  getCategories().forEach(c=>{
    const o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o);
  });

  sel.addEventListener('change', () => {
    const k = sel.value;
    listEl.innerHTML = '';
    if (!k) { listEl.textContent = 'Pilih kategori untuk melihat rekomendasi.'; return; }
    const books = getAllBooks().filter(b => b.kategori === k);
    if (!books.length) { listEl.textContent = 'Tidak ada buku di kategori ini.'; return; }
    books.forEach(b => listEl.appendChild(createBookCardElement(b)));
    logActivity(`User melihat rekomendasi kategori: ${k}`);
  });

  // set default to top category
  const top = getTopCategory();
  if (top) {
    sel.value = top;
    sel.dispatchEvent(new Event('change'));
  } else {
    listEl.textContent = 'Belum ada data rekomendasi.';
  }
}

/* Detail page */
function renderDetailPage(){
  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'), 10);
  const container = document.getElementById('detail');
  if (!container) return;
  if (!id) { container.innerHTML = '<p>ID buku tidak valid.</p>'; return; }
  const book = getBookById(id);
  if (!book) { container.innerHTML = '<p>Buku tidak ditemukan.</p>'; return; }

  document.getElementById('judul').textContent = book.judul;
  document.getElementById('penulis').textContent = book.penulis;
  document.getElementById('kategori').textContent = book.kategori;
  const img = document.getElementById('cover');
  img.src = book.cover && book.cover.trim() ? book.cover : COVER_PLACEHOLDER;
  img.onerror = () => { img.src = COVER_PLACEHOLDER; };

  document.getElementById('btn-cart').onclick = () => {
    const ok = addToCart(book.id);
    if (ok) alert('Buku berhasil ditambahkan ke keranjang');
    else alert('Buku sudah ada di keranjang');
  };
}

/* Cart page */
function renderCartPage(){
  const listEl = document.getElementById('cart-list');
  if (!listEl) return;
  const ids = getCart();
  if (!ids.length){ listEl.innerHTML = '<p>Keranjang kosong.</p>'; document.getElementById('confirm-btn').disabled = true; return; }
  listEl.innerHTML = '';
  const books = getAllBooks().filter(b => ids.includes(b.id));
  books.forEach(b => {
    const card = createBookCardElement(b);
    // replace actions: keep remove-from-cart only and view
    const actions = card.querySelector('.actions');
    actions.innerHTML = '';
    const btnView = document.createElement('button'); btnView.textContent = 'Lihat'; btnView.onclick = ()=> window.location.href = `detail.html?id=${b.id}`;
    const btnRemove = document.createElement('button'); btnRemove.textContent = 'Hapus dari Keranjang';
    btnRemove.onclick = ()=> { removeFromCart(b.id); renderCartPage(); };
    actions.appendChild(btnView);
    actions.appendChild(btnRemove);
    listEl.appendChild(card);
  });
  document.getElementById('confirm-btn').disabled = false;
}

/* Cart actions (confirm/clear) */
async function confirmCartAction(){
  const ids = getCart();
  if (!ids.length) return alert('Keranjang kosong.');
  const books = getAllBooks().filter(b=>ids.includes(b.id)).map(b=>b.judul).join(', ');
  logActivity(`User mengonfirmasi peminjaman: ${books}`);
  alert('Peminjaman berhasil! Silakan ambil buku di perpustakaan.');
  clearCart();
  renderCartPage();
}

/* ---------- Admin page rendering & interactions ---------- */
function renderAdminPage(){
  const loginCard = document.getElementById('login-card');
  const panel = document.getElementById('admin-panel');
  const passInput = document.getElementById('admin-pass');
  const loginBtn = document.getElementById('admin-login-btn');
  if (!loginCard || !panel) return;

  loginBtn.onclick = () => {
    const pass = passInput.value || '';
    if (pass === 'admin123') {
      loginCard.classList.add('hidden');
      panel.classList.remove('hidden');
      setupAdminUI();
      logActivity('Admin login berhasil');
    } else {
      alert('Password salah');
      logActivity('Admin login gagal');
    }
  };

  // If admin already visible (rare), setup
  if (!loginCard.classList.contains('hidden')) return;
}

function setupAdminUI(){
  const idField = document.getElementById('buku-id');
  const judulField = document.getElementById('buku-judul');
  const penulisField = document.getElementById('buku-penulis');
  const kategoriField = document.getElementById('buku-kategori');
  const coverField = document.getElementById('buku-cover');
  const coverFileField = document.getElementById('buku-cover-file');
  const saveBtn = document.getElementById('buku-save');
  const clearBtn = document.getElementById('buku-clear');

  const kategoriInput = document.getElementById('kategori-input');
  const kategoriAddBtn = document.getElementById('kategori-add');
  const kategoriListEl = document.getElementById('kategori-list');

  const adminKoleksiList = document.getElementById('admin-koleksi-list');
  const activityLog = document.getElementById('activity-log');

  function refreshCategories(){
    kategoriListEl.innerHTML = '';
    getCategories().forEach(c => {
      const li = document.createElement('li');
      li.textContent = c;
      const del = document.createElement('button'); del.textContent = 'Hapus';
      del.onclick = ()=> { if (confirm(`Hapus kategori ${c}?`)){ removeCategory(c); refreshCategories(); renderAdminBooks(); } };
      li.appendChild(del);
      kategoriListEl.appendChild(li);
    });
  }

  kategoriAddBtn.onclick = () => {
    const name = (kategoriInput.value || '').trim();
    if (!name) return alert('Masukkan nama kategori');
    addCategory(name);
    kategoriInput.value = '';
    refreshCategories();
    renderAdminBooks();
  };

  function renderAdminBooks(){
    adminKoleksiList.innerHTML = '';
    getAllBooks().forEach(b => {
      adminKoleksiList.appendChild(createBookCardElement(b, { admin: true }));
    });
  }

  saveBtn.onclick = async () => {
    const id = idField.value ? parseInt(idField.value,10) : null;
    let coverData = (coverField.value || '').trim();
    const file = coverFileField.files[0];
    if (file) {
      try { coverData = await fileToBase64(file); } catch(e){ alert('Gagal membaca file cover'); return; }
    }

    const buku = {
      id: id,
      judul: (judulField.value || '').trim(),
      penulis: (penulisField.value || '').trim(),
      kategori: (kategoriField.value || '').trim(),
      cover: coverData || ''
    };

    if (!buku.judul || !buku.penulis || !buku.kategori) return alert('Judul, penulis, dan kategori wajib diisi.');

    if (id) updateBook(buku); else addBook(buku);
    clearForm();
    renderAdminBooks();
    refreshCategories();
  };

  clearBtn.onclick = clearForm;

  function clearForm(){
    idField.value = '';
    judulField.value = '';
    penulisField.value = '';
    kategoriField.value = '';
    coverField.value = '';
    coverFileField.value = '';
  }

  window.fillEditForm = function(book){
    idField.value = book.id;
    judulField.value = book.judul;
    penulisField.value = book.penulis;
    kategoriField.value = book.kategori;
    // if cover is base64, we don't set link input
    coverField.value = (book.cover && book.cover.startsWith('data:')) ? '' : (book.cover || '');
    coverFileField.value = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function renderActivity(){
    const logs = getActivity();
    activityLog.innerHTML = '';
    logs.forEach(l => {
      const li = document.createElement('li');
      li.textContent = `${new Date(l.time).toLocaleString()} — ${l.text}`;
      activityLog.appendChild(li);
    });
  }

  // initial render
  refreshCategories();
  renderAdminBooks();
  renderActivity();
}

/* ---------- small helpers exposed for debugging ---------- */
window._getAllBooks = getAllBooks;
window._getCategories = getCategories;
window._getActivity = getActivity;
window._getCart = getCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;

/* ---------- attach global button events (if present on page) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const confirmBtn = document.getElementById('confirm-btn');
  if (confirmBtn) confirmBtn.addEventListener('click', confirmCartAction);

  const clearCartBtn = document.getElementById('clear-cart-btn');
  if (clearCartBtn) clearCartBtn.addEventListener('click', ()=>{ if(confirm('Kosongkan keranjang?')){ clearCart(); renderCartPage(); } });
});
