/* ============================================
   STRETKAT — App Logic + Supabase Integration
   ============================================

   SETUP INSTRUCTIONS:
   1. Create a free Supabase project at https://supabase.com
   2. Replace SUPABASE_URL and SUPABASE_ANON_KEY below
   3. Run the SQL schema at the bottom of this file in Supabase SQL editor
   4. Your site is live!
   ============================================ */

// ── SUPABASE CONFIG ──────────────────────────────
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

let supabase = null;
let useSupabase = false;

try {
  if (SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co') {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    useSupabase = true;
    console.log('✅ Supabase connected');
  } else {
    console.info('ℹ️ Using demo data. Add your Supabase keys to enable live database.');
  }
} catch (e) {
  console.warn('Supabase init failed, using demo data:', e);
}

// ── DEMO DATA (used when Supabase is not configured) ──
const DEMO_PRODUCTS = [
  { id: 1, name: 'Phantom Hoodie', category: 'hoodies', price: 2499, original_price: 3200, emoji: '🧥', badge: 'NEW', description: 'Oversized fit, heavyweight cotton fleece. The stealth drop you didn\'t see coming.', sizes: ['S','M','L','XL','XXL'], color: '#1a1a2e' },
  { id: 2, name: 'Blacked Out Tee', category: 'tees', price: 999, original_price: null, emoji: '👕', badge: null, description: 'Ultra-soft 200gsm cotton. Minimal logo. Maximum drip.', sizes: ['S','M','L','XL'], color: '#0a0a0a' },
  { id: 3, name: 'Cargo Riot Pants', category: 'cargo', price: 3299, original_price: 4200, emoji: '👖', badge: 'HOT', description: '14-pocket tactical cargo. Street-ready. No excuses.', sizes: ['S','M','L','XL','XXL'], color: '#1a1a00' },
  { id: 4, name: 'Sovereign Cap', category: 'caps', price: 799, original_price: null, emoji: '🧢', badge: null, description: 'Six-panel structured cap. Embroidered logo. One size.', sizes: ['ONE SIZE'], color: '#1a0000' },
  { id: 5, name: 'Void Zip Hoodie', category: 'hoodies', price: 2899, original_price: 3500, emoji: '🥷', badge: 'SALE', description: 'Full-zip fleece hoodie. Drop-shoulder cut. All-black everything.', sizes: ['M','L','XL','XXL'], color: '#111' },
  { id: 6, name: 'Red Alert Tee', category: 'tees', price: 1099, original_price: null, emoji: '🔴', badge: 'NEW', description: 'Bold graphic tee. Statement piece. Runs slightly oversized.', sizes: ['S','M','L','XL'], color: '#1a0000' },
  { id: 7, name: 'Urban Windbreaker', category: 'cargo', price: 3999, original_price: 5200, emoji: '🫱', badge: 'HOT', description: 'Lightweight nylon shell. Essential for the streets.', sizes: ['M','L','XL'], color: '#001a1a' },
  { id: 8, name: 'Stealth Snapback', category: 'caps', price: 849, original_price: null, emoji: '🧢', badge: null, description: 'Snapback fit. Flat brim. No-logo blacked-out vibe.', sizes: ['ONE SIZE'], color: '#0a0a0a' },
];

const DEMO_COLLECTIONS = [
  { id: 1, name: 'SHADOW\nSERIES', label: 'SS25 Collection', count: 12, color: '#111', emoji: '🖤' },
  { id: 2, name: 'RED\nRIOT', label: 'Limited Run', count: 8, color: '#1a0000', emoji: '🔴' },
  { id: 3, name: 'CARGO\nCULT', label: 'Tactical Fits', count: 15, color: '#001a00', emoji: '🪖' },
];

const DEMO_DROPS = [
  { id: 1, name: 'PHANTOM VOL.2', date: new Date(Date.now() + 5 * 24 * 3600000).toISOString(), description: 'The second chapter of our most sought-after hoodie collection. 50 units only.' },
  { id: 2, name: 'SOVEREIGN CAPS', date: new Date(Date.now() + 12 * 24 * 3600000).toISOString(), description: 'Limited edition embroidered caps. Exclusive colorways. No restock.' },
  { id: 3, name: 'RED RIOT TEE', date: new Date(Date.now() + 20 * 24 * 3600000).toISOString(), description: 'Big graphic, small run. SS25 drop. 30 pieces per size.' },
];

// ── STATE ─────────────────────────────────────────
let allProducts = [];
let cart = JSON.parse(localStorage.getItem('stretkat_cart') || '[]');
let currentFilter = 'all';
let displayedCount = 8;
let selectedProduct = null;
let selectedSize = null;

// ── UTILS ─────────────────────────────────────────
function fmt(price) {
  return '₹' + price.toLocaleString('en-IN');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function saveCart() {
  localStorage.setItem('stretkat_cart', JSON.stringify(cart));
  updateCartUI();
}

// ── LOADER ────────────────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
  }, 1800);
});

// ── NAV: hide on scroll down ──────────────────────
let lastScroll = 0;
window.addEventListener('scroll', () => {
  const curr = window.scrollY;
  const nav = document.getElementById('navbar');
  if (curr > lastScroll && curr > 80) nav.classList.add('hide');
  else nav.classList.remove('hide');
  lastScroll = curr;
});

// ── MOBILE MENU ───────────────────────────────────
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn.addEventListener('click', () => {
  menuBtn.classList.toggle('open');
  mobileMenu.classList.toggle('open');
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    menuBtn.classList.remove('open');
    mobileMenu.classList.remove('open');
  });
});

// ── CART ──────────────────────────────────────────
function updateCartUI() {
  const totalItems = cart.reduce((s, i) => s + i.qty, 0);
  const count = document.getElementById('cartCount');
  count.textContent = totalItems;
  count.classList.toggle('visible', totalItems > 0);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('cartTotal').textContent = fmt(total);

  const itemsEl = document.getElementById('cartItems');
  if (cart.length === 0) {
    itemsEl.innerHTML = `<div class="empty-state"><h3>Your cart is empty</h3><p>Go grab something 🔥</p></div>`;
    return;
  }
  itemsEl.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="ci-img">${item.emoji}</div>
      <div class="ci-info">
        <div class="ci-name">${item.name}</div>
        <div class="ci-size">Size: ${item.size}</div>
        <div class="ci-row">
          <div class="ci-qty">
            <button onclick="changeQty(${idx}, -1)">−</button>
            <span>${item.qty}</span>
            <button onclick="changeQty(${idx}, 1)">+</button>
          </div>
          <span class="ci-price">${fmt(item.price * item.qty)}</span>
          <button class="ci-remove" onclick="removeItem(${idx})">✕</button>
        </div>
      </div>
    </div>
  `).join('');
}

function changeQty(idx, delta) {
  cart[idx].qty = Math.max(1, cart[idx].qty + delta);
  saveCart();
}
function removeItem(idx) {
  cart.splice(idx, 1);
  saveCart();
  showToast('Item removed from cart');
}

document.getElementById('cartBtn').addEventListener('click', openCart);
document.getElementById('closeCart').addEventListener('click', closeCart);
document.getElementById('cartOverlay').addEventListener('click', closeCart);

function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('show');
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('show');
}

document.getElementById('checkoutBtn').addEventListener('click', () => {
  if (cart.length === 0) { showToast('Cart is empty!'); return; }
  showToast('🎉 Order placed! (Demo mode)');
  cart = [];
  saveCart();
  closeCart();
});

// ── PRODUCT MODAL ─────────────────────────────────
function openModal(product) {
  selectedProduct = product;
  selectedSize = null;
  document.getElementById('modalCategory').textContent = product.category.toUpperCase();
  document.getElementById('modalName').textContent = product.name;
  document.getElementById('modalPrice').textContent = fmt(product.price);
  document.getElementById('modalDesc').textContent = product.description || 'Premium streetwear. Built different.';
  document.getElementById('modalImg').innerHTML = `<span style="font-size:80px">${product.emoji}</span>`;
  document.getElementById('modalSizes').innerHTML = (product.sizes || ['S','M','L','XL']).map(s =>
    `<button class="size-btn" onclick="selectSize(this,'${s}')">${s}</button>`
  ).join('');
  document.getElementById('productModal').classList.add('open');
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() {
  document.getElementById('productModal').classList.remove('open');
  document.getElementById('modalOverlay').classList.remove('show');
}
function selectSize(btn, size) {
  document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedSize = size;
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', closeModal);
document.getElementById('modalAddCart').addEventListener('click', () => {
  if (!selectedSize) { showToast('Pick a size first!'); return; }
  const existing = cart.find(i => i.id === selectedProduct.id && i.size === selectedSize);
  if (existing) existing.qty++;
  else cart.push({ ...selectedProduct, size: selectedSize, qty: 1 });
  saveCart();
  closeModal();
  showToast(`${selectedProduct.name} added to cart 🛒`);
});

// ── PRODUCT CARD BUILDER ──────────────────────────
function buildProductCard(p, delay = 0) {
  const disc = p.original_price ? Math.round((1 - p.price / p.original_price) * 100) : null;
  return `
    <div class="product-card" style="animation-delay:${delay}s" onclick="openModal(${JSON.stringify(p).replace(/"/g,'&quot;')})">
      <div class="product-img">
        <div class="product-img-bg" style="background:${p.color || '#1a1a1a'}">
          <div class="product-img-placeholder">
            <span>${p.emoji || '👕'}</span>
          </div>
        </div>
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
        <div class="product-quick">Quick View</div>
      </div>
      <div class="product-info">
        <p class="product-category">${p.category}</p>
        <p class="product-name">${p.name}</p>
        <div class="product-price">
          <span class="price-now">${fmt(p.price)}</span>
          ${p.original_price ? `<span class="price-old">${fmt(p.original_price)}</span><span class="price-tag">-${disc}%</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ── RENDER PRODUCTS ───────────────────────────────
function renderProducts(filter = 'all') {
  const grid = document.getElementById('productsGrid');
  const filtered = filter === 'all' ? allProducts : allProducts.filter(p => p.category === filter);
  const toShow = filtered.slice(0, displayedCount);

  if (toShow.length === 0) {
    grid.innerHTML = `<div class="empty-state"><h3>No products found</h3><p>Check back soon for new drops 🔥</p></div>`;
    return;
  }
  grid.innerHTML = toShow.map((p, i) => buildProductCard(p, i * 0.05)).join('');

  const btn = document.getElementById('loadMoreBtn');
  btn.style.display = filtered.length > displayedCount ? 'inline-flex' : 'none';
}

document.getElementById('filterTabs').addEventListener('click', e => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  currentFilter = tab.dataset.filter;
  displayedCount = 8;
  renderProducts(currentFilter);
});

document.getElementById('loadMoreBtn').addEventListener('click', () => {
  displayedCount += 4;
  renderProducts(currentFilter);
});

// ── SOV PRODUCTS ──────────────────────────────────
function renderSovProducts() {
  const grid = document.getElementById('sovProducts');
  const picks = allProducts.slice(0, 3);
  grid.innerHTML = picks.map(p => `
    <div class="product-card" style="max-width:180px" onclick="openModal(${JSON.stringify(p).replace(/"/g,'&quot;')})">
      <div class="product-img">
        <div class="product-img-bg" style="background:${p.color || '#1a1a1a'}; height:200px">
          <span style="font-size:60px">${p.emoji}</span>
        </div>
        ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
      </div>
      <div class="product-info">
        <p class="product-name" style="font-size:14px">${p.name}</p>
        <span class="price-now" style="font-size:16px">${fmt(p.price)}</span>
      </div>
    </div>
  `).join('');
}

// ── COLLECTIONS ───────────────────────────────────
function renderCollections(data) {
  const grid = document.getElementById('collectionsGrid');
  grid.innerHTML = data.map((c, i) => `
    <div class="collection-card reveal" style="transition-delay:${i*0.1}s">
      <div class="coll-bg" style="background:${c.color || '#1a1a1a'}; ${i===0?'min-height:100%':''}">
        <span style="font-size:${i===0?'80px':'60px'}">${c.emoji || '🖤'}</span>
      </div>
      <div class="coll-overlay">
        <p class="coll-label">${c.label}</p>
        <p class="coll-name">${c.name}</p>
        <p class="coll-count">${c.count} Items</p>
      </div>
    </div>
  `).join('');
}

// ── DROPS ─────────────────────────────────────────
function renderDrops(data) {
  const grid = document.getElementById('dropsGrid');
  grid.innerHTML = data.map((d, i) => `
    <div class="drop-card reveal" style="transition-delay:${i*0.1}s">
      <p class="drop-date">${new Date(d.date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</p>
      <h3 class="drop-name">${d.name}</h3>
      <p class="drop-desc">${d.description}</p>
      <div class="drop-countdown" id="cd-${d.id}" data-date="${d.date}"></div>
      <button class="btn-primary drop-notify" onclick="showToast('You\\\'re on the list for ${d.name}! 🔥')">Notify Me</button>
    </div>
  `).join('');
  startCountdowns();
}

function startCountdowns() {
  const update = () => {
    document.querySelectorAll('.drop-countdown').forEach(el => {
      const target = new Date(el.dataset.date);
      const now = new Date();
      const diff = target - now;
      if (diff <= 0) { el.innerHTML = '<span style="color:var(--red);font-family:var(--font-display);font-weight:700">LIVE NOW 🔥</span>'; return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.innerHTML = ['d','h','m','s'].map((u,i) => `
        <div class="cd-unit">
          <span class="cd-num">${[d,h,m,s][i].toString().padStart(2,'0')}</span>
          <span class="cd-label">${u}</span>
        </div>
      `).join('');
    });
  };
  update();
  setInterval(update, 1000);
}

// ── STATS COUNTER ─────────────────────────────────
function animateStats() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target);
    let current = 0;
    const step = target / 60;
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = Math.round(current).toLocaleString('en-IN') + (target >= 100 ? '+' : '');
      if (current >= target) clearInterval(interval);
    }, 16);
  });
}

// ── SCROLL REVEAL ─────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); }
  });
}, { threshold: 0.1 });

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { animateStats(); statsObserver.disconnect(); }
  });
}, { threshold: 0.3 });

// ── SEARCH ────────────────────────────────────────
document.getElementById('searchBtn').addEventListener('click', () => {
  const overlay = document.getElementById('searchOverlay');
  overlay.classList.toggle('open');
  if (overlay.classList.contains('open')) document.getElementById('searchInput').focus();
});
document.getElementById('closeSearch').addEventListener('click', () => {
  document.getElementById('searchOverlay').classList.remove('open');
  document.getElementById('searchResults').innerHTML = '';
});

let searchTimeout;
document.getElementById('searchInput').addEventListener('input', e => {
  clearTimeout(searchTimeout);
  const q = e.target.value.trim().toLowerCase();
  if (!q) { document.getElementById('searchResults').innerHTML = ''; return; }
  searchTimeout = setTimeout(() => {
    const results = allProducts.filter(p =>
      p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    ).slice(0, 6);
    const el = document.getElementById('searchResults');
    if (results.length === 0) { el.innerHTML = '<p style="color:var(--gray);font-size:14px">No results found</p>'; return; }
    el.innerHTML = results.map(p => `
      <div class="search-result-card" onclick="openModal(${JSON.stringify(p).replace(/"/g,'&quot;')});document.getElementById('searchOverlay').classList.remove('open')">
        <div class="sr-emoji">${p.emoji}</div>
        <div class="sr-info">
          <div class="sr-name">${p.name}</div>
          <div class="sr-price">${fmt(p.price)}</div>
        </div>
      </div>
    `).join('');
  }, 300);
});

// ── NEWSLETTER ────────────────────────────────────
document.getElementById('subscribeBtn').addEventListener('click', async () => {
  const email = document.getElementById('emailInput').value.trim();
  const msg = document.getElementById('nlMsg');
  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    msg.textContent = 'Enter a valid email!'; return;
  }
  msg.textContent = 'Subscribing...';
  if (useSupabase) {
    try {
      const { error } = await supabase.from('subscribers').insert({ email });
      if (error && error.code !== '23505') throw error;
      msg.textContent = error ? 'You\'re already subscribed!' : '🔥 You\'re in! Early access confirmed.';
    } catch (e) {
      msg.textContent = '🔥 You\'re in! Early access confirmed.';
    }
  } else {
    setTimeout(() => { msg.textContent = '🔥 You\'re in! Early access confirmed. (Demo mode)'; }, 600);
  }
  document.getElementById('emailInput').value = '';
});

// ── SUPABASE FETCH ────────────────────────────────
async function fetchFromSupabase() {
  try {
    const [{ data: products }, { data: collections }, { data: drops }] = await Promise.all([
      supabase.from('products').select('*').eq('active', true).order('created_at', { ascending: false }),
      supabase.from('collections').select('*').order('created_at'),
      supabase.from('drops').select('*').gt('date', new Date().toISOString()).order('date'),
    ]);
    return { products: products || [], collections: collections || [], drops: drops || [] };
  } catch (e) {
    console.warn('Supabase fetch failed, using demo data:', e);
    return null;
  }
}

// ── INIT ──────────────────────────────────────────
async function init() {
  let products = DEMO_PRODUCTS;
  let collections = DEMO_COLLECTIONS;
  let drops = DEMO_DROPS;

  if (useSupabase) {
    const data = await fetchFromSupabase();
    if (data && data.products.length) {
      products = data.products;
      if (data.collections.length) collections = data.collections;
      if (data.drops.length) drops = data.drops;
    }
  }

  allProducts = products;
  renderProducts('all');
  renderSovProducts();
  renderCollections(collections);
  renderDrops(drops);
  updateCartUI();

  setTimeout(() => {
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    statsObserver.observe(document.querySelector('.stats-bar'));
  }, 100);
}

document.addEventListener('DOMContentLoaded', init);

/* ============================================================
   SUPABASE SCHEMA — Run this in your Supabase SQL Editor
   ============================================================

-- Products table
create table products (
  id bigserial primary key,
  name text not null,
  category text not null check (category in ('hoodies','tees','cargo','caps')),
  price integer not null,
  original_price integer,
  emoji text default '👕',
  badge text,
  description text,
  sizes text[] default array['S','M','L','XL'],
  color text default '#1a1a1a',
  active boolean default true,
  created_at timestamptz default now()
);

-- Collections table
create table collections (
  id bigserial primary key,
  name text not null,
  label text,
  count integer default 0,
  color text default '#1a1a1a',
  emoji text default '🖤',
  created_at timestamptz default now()
);

-- Drops table
create table drops (
  id bigserial primary key,
  name text not null,
  date timestamptz not null,
  description text,
  created_at timestamptz default now()
);

-- Subscribers table
create table subscribers (
  id bigserial primary key,
  email text unique not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table products enable row level security;
alter table collections enable row level security;
alter table drops enable row level security;
alter table subscribers enable row level security;

-- Public read access
create policy "Public read products" on products for select using (true);
create policy "Public read collections" on collections for select using (true);
create policy "Public read drops" on drops for select using (true);
create policy "Public insert subscribers" on subscribers for insert with check (true);

-- Sample data
insert into products (name, category, price, original_price, emoji, badge, description, sizes, color) values
  ('Phantom Hoodie', 'hoodies', 2499, 3200, '🧥', 'NEW', 'Oversized fit, heavyweight cotton fleece.', array['S','M','L','XL','XXL'], '#1a1a2e'),
  ('Blacked Out Tee', 'tees', 999, null, '👕', null, 'Ultra-soft 200gsm cotton. Minimal logo.', array['S','M','L','XL'], '#0a0a0a'),
  ('Cargo Riot Pants', 'cargo', 3299, 4200, '👖', 'HOT', '14-pocket tactical cargo. Street-ready.', array['S','M','L','XL','XXL'], '#1a1a00'),
  ('Sovereign Cap', 'caps', 799, null, '🧢', null, 'Six-panel structured cap. Embroidered logo.', array['ONE SIZE'], '#1a0000'),
  ('Void Zip Hoodie', 'hoodies', 2899, 3500, '🥷', 'SALE', 'Full-zip fleece hoodie. Drop-shoulder cut.', array['M','L','XL','XXL'], '#111');

insert into collections (name, label, count, color, emoji) values
  ('SHADOW SERIES', 'SS25 Collection', 12, '#111', '🖤'),
  ('RED RIOT', 'Limited Run', 8, '#1a0000', '🔴'),
  ('CARGO CULT', 'Tactical Fits', 15, '#001a00', '🪖');

insert into drops (name, date, description) values
  ('PHANTOM VOL.2', now() + interval '5 days', 'The second chapter of our most sought-after hoodie collection. 50 units only.'),
  ('SOVEREIGN CAPS', now() + interval '12 days', 'Limited edition embroidered caps. No restock.'),
  ('RED RIOT TEE', now() + interval '20 days', 'Big graphic, small run. 30 pieces per size.');

============================================================ */
