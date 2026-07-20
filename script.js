/* ==========================================================================
   سوق الكويت القديم - ملف الجافاسكربت الرئيسي
   Old Kuwait Market - Main JavaScript
   يحتوي على: التخزين المحلي، الوضع الليلي، تبديل اللغة، السلة، المفضلة،
   البحث الفوري، الإشعارات، القوائم المتحركة، وتوليد بطاقات المنتجات.
   ========================================================================== */

/* ---------------------------------------------------------------------- */
/* 1) إدارة الحالة العامة عبر التخزين المحلي (localStorage)                */
/* ---------------------------------------------------------------------- */
const Store = {
  get(key, fallback) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

let cart = Store.get('okm_cart', []);        // [{id, qty}]
let favorites = Store.get('okm_favorites', []); // [id, id, ...]
let currentLang = Store.get('okm_lang', 'ar');
let currentTheme = Store.get('okm_theme', 'light');
let currentUser = Store.get('okm_user', null); // {name, email, avatar} أو null

function saveCart() { Store.set('okm_cart', cart); updateHeaderCounters(); }
function saveFavorites() { Store.set('okm_favorites', favorites); updateHeaderCounters(); }

/* ---------------------------------------------------------------------- */
/* 2) الوضع الليلي / النهاري                                              */
/* ---------------------------------------------------------------------- */
function applyTheme() {
  document.body.classList.toggle('dark-mode', currentTheme === 'dark');
  const icon = document.querySelector('.theme-toggle i');
  if (icon) icon.className = currentTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  Store.set('okm_theme', currentTheme);
  applyTheme();
  showToast(currentTheme === 'dark' ? 'تم تفعيل الوضع الليلي' : 'تم تفعيل الوضع النهاري', 'success');
}

/* ---------------------------------------------------------------------- */
/* 3) تبديل اللغة (عربي / إنجليزي) - يبدل اتجاه الصفحة والنصوص الأساسية    */
/* ---------------------------------------------------------------------- */
const UI_STRINGS = {
  ar: {
    dir: 'rtl', langLabel: 'EN', addToCart: 'أضف للسلة', outOfStock: 'غير متوفر',
    addedToCart: 'تمت إضافة المنتج إلى السلة', removedFromCart: 'تمت إزالة المنتج من السلة',
    addedToFav: 'تمت الإضافة إلى المفضلة', removedFromFav: 'تمت الإزالة من المفضلة',
    loginRequired: 'يرجى تسجيل الدخول أولاً', welcomeBack: 'مرحبًا بعودتك',
    noResults: 'لا توجد نتائج مطابقة لبحثك',
  },
  en: {
    dir: 'ltr', langLabel: 'AR', addToCart: 'Add to Cart', outOfStock: 'Out of Stock',
    addedToCart: 'Item added to cart', removedFromCart: 'Item removed from cart',
    addedToFav: 'Added to favorites', removedFromFav: 'Removed from favorites',
    loginRequired: 'Please sign in first', welcomeBack: 'Welcome back',
    noResults: 'No results match your search',
  },
};
function t(key) { return (UI_STRINGS[currentLang] || UI_STRINGS.ar)[key] || key; }

function applyLanguage() {
  const strings = UI_STRINGS[currentLang];
  document.documentElement.setAttribute('lang', currentLang);
  document.documentElement.setAttribute('dir', strings.dir);
  const langBtn = document.querySelector('.lang-toggle');
  if (langBtn) langBtn.textContent = strings.langLabel;
  // ترجمة العناصر التي تحمل خاصية data-ar / data-en
  document.querySelectorAll('[data-ar][data-en]').forEach((el) => {
    el.textContent = currentLang === 'ar' ? el.getAttribute('data-ar') : el.getAttribute('data-en');
  });
}
function toggleLanguage() {
  currentLang = currentLang === 'ar' ? 'en' : 'ar';
  Store.set('okm_lang', currentLang);
  applyLanguage();
  renderDynamicContent(); // إعادة رسم أي محتوى ديناميكي بلغة جديدة (المنتجات مثلاً)
  showToast(currentLang === 'ar' ? 'تم التحويل إلى العربية' : 'Switched to English', 'success');
}

/* ---------------------------------------------------------------------- */
/* 4) نظام الإشعارات (Toast Notifications)                                */
/* ---------------------------------------------------------------------- */
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* ---------------------------------------------------------------------- */
/* 5) السلة والمفضلة                                                      */
/* ---------------------------------------------------------------------- */
function findProduct(id) {
  return (typeof PRODUCTS !== 'undefined') ? PRODUCTS.find((p) => p.id === Number(id)) : null;
}

function addToCart(id, qty = 1) {
  const existing = cart.find((c) => c.id === Number(id));
  if (existing) existing.qty += qty;
  else cart.push({ id: Number(id), qty });
  saveCart();
  showToast(t('addedToCart'), 'success');
}
function removeFromCart(id) {
  cart = cart.filter((c) => c.id !== Number(id));
  saveCart();
  showToast(t('removedFromCart'), 'info');
  if (typeof renderCartPage === 'function') renderCartPage();
}
function updateCartQty(id, qty) {
  const item = cart.find((c) => c.id === Number(id));
  if (item) item.qty = Math.max(1, qty);
  saveCart();
  if (typeof renderCartPage === 'function') renderCartPage();
}
function cartTotalItems() { return cart.reduce((sum, c) => sum + c.qty, 0); }
function cartSubtotal() {
  return cart.reduce((sum, c) => {
    const p = findProduct(c.id);
    return sum + (p ? p.price * c.qty : 0);
  }, 0);
}

function toggleFavorite(id) {
  id = Number(id);
  const idx = favorites.indexOf(id);
  if (idx > -1) {
    favorites.splice(idx, 1);
    showToast(t('removedFromFav'), 'info');
  } else {
    favorites.push(id);
    showToast(t('addedToFav'), 'success');
  }
  saveFavorites();
  document.querySelectorAll(`.wishlist-btn[data-id="${id}"]`).forEach((btn) => btn.classList.toggle('active'));
  if (typeof renderFavoritesPage === 'function') renderFavoritesPage();
}
function isFavorite(id) { return favorites.includes(Number(id)); }

/* ---------------------------------------------------------------------- */
/* 6) تحديث عدّادات الهيدر (السلة + المفضلة)                              */
/* ---------------------------------------------------------------------- */
function updateHeaderCounters() {
  document.querySelectorAll('.cart-count').forEach((el) => (el.textContent = cartTotalItems()));
  document.querySelectorAll('.fav-count').forEach((el) => (el.textContent = favorites.length));
}

/* ---------------------------------------------------------------------- */
/* 7) توليد بطاقة منتج (تُستخدم في كل صفحات العرض)                        */
/* ---------------------------------------------------------------------- */
function productCardHTML(p) {
  const title = currentLang === 'ar' ? p.title : p.titleEn;
  const catObj = CATEGORIES.find((c) => c.id === p.category);
  const catName = catObj ? (currentLang === 'ar' ? catObj.name : catObj.nameEn) : '';
  const fav = isFavorite(p.id) ? 'active' : '';
  const tagHTML = p.auction
    ? `<span class="product-tag auction"><i class="fa-solid fa-gavel"></i> ${currentLang === 'ar' ? 'مزاد' : 'Auction'}</span>`
    : (p.featured ? `<span class="product-tag">${currentLang === 'ar' ? 'مميز' : 'Featured'}</span>` : '');
  return `
  <div class="product-card reveal" data-id="${p.id}" data-category="${p.category}" data-price="${p.price}">
    <div class="product-thumb">
      <a href="product-details.html?id=${p.id}">
        <img src="${p.image}" alt="${title}" loading="lazy" width="400" height="400">
      </a>
      ${tagHTML}
      <button class="wishlist-btn ${fav}" data-id="${p.id}" onclick="toggleFavorite(${p.id})" aria-label="مفضلة">
        <i class="fa-solid fa-heart"></i>
      </button>
    </div>
    <div class="product-info">
      <span class="product-category">${catName}</span>
      <h3><a href="product-details.html?id=${p.id}">${title}</a></h3>
      <div class="product-rating">
        <span class="stars">${renderStars(p.rating)}</span>
        <span>(${p.reviews})</span>
      </div>
      <div class="product-footer">
        <div class="product-price">
          ${p.price} ${currentLang === 'ar' ? 'د.ك' : 'KWD'}
          ${p.oldPrice ? `<small>${p.oldPrice}</small>` : ''}
        </div>
        <button class="add-cart-btn" onclick="addToCart(${p.id})" aria-label="أضف للسلة">
          <i class="fa-solid fa-cart-plus"></i>
        </button>
      </div>
    </div>
  </div>`;
}

function renderStars(rating) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) html += '<i class="fa-solid fa-star"></i>';
    else if (rating >= i - 0.5) html += '<i class="fa-solid fa-star-half-stroke"></i>';
    else html += '<i class="fa-regular fa-star"></i>';
  }
  return html;
}

/* دالة عامة لإعادة رسم أي شبكة منتجات موجودة في الصفحة الحالية (تُستدعى عند تبديل اللغة) */
function renderDynamicContent() {
  if (typeof renderHomeProducts === 'function') renderHomeProducts();
  if (typeof renderShopPage === 'function') renderShopPage();
  if (typeof renderCartPage === 'function') renderCartPage();
  if (typeof renderFavoritesPage === 'function') renderFavoritesPage();
  if (typeof renderProductDetails === 'function') renderProductDetails();
  if (typeof renderSearchPage === 'function') renderSearchPage();
  if (typeof renderMyListings === 'function') renderMyListings();
}

/* ---------------------------------------------------------------------- */
/* 8) البحث الفوري (اقتراحات في الهيدر)                                   */
/* ---------------------------------------------------------------------- */
function initInstantSearch() {
  const input = document.getElementById('headerSearchInput');
  const box = document.getElementById('searchSuggestions');
  if (!input || !box || typeof PRODUCTS === 'undefined') return;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { box.classList.remove('active'); box.innerHTML = ''; return; }
    const results = PRODUCTS.filter((p) =>
      p.title.toLowerCase().includes(q) || p.titleEn.toLowerCase().includes(q)
    ).slice(0, 5);

    if (results.length === 0) {
      box.innerHTML = `<div class="search-suggestion-item"><div class="info"><strong>${t('noResults')}</strong></div></div>`;
    } else {
      box.innerHTML = results.map((p) => `
        <a class="search-suggestion-item" href="product-details.html?id=${p.id}">
          <img src="${p.image}" alt="${p.title}" loading="lazy">
          <div class="info">
            <strong>${currentLang === 'ar' ? p.title : p.titleEn}</strong>
            <span>${p.price} ${currentLang === 'ar' ? 'د.ك' : 'KWD'}</span>
          </div>
        </a>`).join('');
    }
    box.classList.add('active');
  });

  document.addEventListener('click', (e) => {
    if (!box.contains(e.target) && e.target !== input) box.classList.remove('active');
  });

  input.closest('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value.trim()) window.location.href = `search.html?q=${encodeURIComponent(input.value.trim())}`;
  });
}

/* ---------------------------------------------------------------------- */
/* 9) القائمة الجانبية للجوال + زر الرجوع للأعلى + Reveal on scroll        */
/* ---------------------------------------------------------------------- */
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const menu = document.querySelector('.mobile-menu');
  const closeBtn = document.querySelector('.mobile-menu-close');
  const overlay = document.querySelector('.overlay');
  if (!hamburger || !menu) return;
  const open = () => { menu.classList.add('active'); overlay.classList.add('active'); };
  const close = () => { menu.classList.remove('active'); overlay.classList.remove('active'); };
  hamburger.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
}

function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 400));
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

function initRevealOnScroll() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}
// إعادة تفعيل المراقبة عند إضافة عناصر جديدة ديناميكيًا
function refreshReveal() {
  document.querySelectorAll('.reveal:not(.visible)').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) el.classList.add('visible');
    else initRevealOnScroll();
  });
}

/* ---------------------------------------------------------------------- */
/* 10) نافذة الدردشة (واجهة فقط - بدون اتصال فعلي بالخادم)                */
/* ---------------------------------------------------------------------- */
function initChatWidget() {
  const toggleBtn = document.querySelector('.chat-toggle-btn');
  const win = document.querySelector('.chat-window');
  const form = document.querySelector('.chat-footer');
  if (!toggleBtn || !win) return;
  toggleBtn.addEventListener('click', () => win.classList.toggle('active'));
  form?.addEventListener('submit', (e) => e.preventDefault());
  const sendBtn = document.querySelector('.chat-send');
  const input = document.querySelector('.chat-footer input');
  const body = document.querySelector('.chat-body');
  sendBtn?.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) return;
    const msg = document.createElement('div');
    msg.className = 'chat-msg sent';
    msg.textContent = val;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
    input.value = '';
    // رد تلقائي تجريبي لمحاكاة الواجهة فقط
    setTimeout(() => {
      const reply = document.createElement('div');
      reply.className = 'chat-msg received';
      reply.textContent = currentLang === 'ar' ? 'شكرًا لتواصلك! سأرد عليك في أقرب وقت.' : 'Thanks for reaching out! I will reply soon.';
      body.appendChild(reply);
      body.scrollTop = body.scrollHeight;
    }, 900);
  });
}

/* ---------------------------------------------------------------------- */
/* 11) حالة تسجيل الدخول في الهيدر                                        */
/* ---------------------------------------------------------------------- */
function updateAuthUI() {
  document.querySelectorAll('.auth-guest').forEach((el) => (el.style.display = currentUser ? 'none' : ''));
  document.querySelectorAll('.auth-user').forEach((el) => (el.style.display = currentUser ? '' : 'none'));
  document.querySelectorAll('.auth-user-name').forEach((el) => { if (currentUser) el.textContent = currentUser.name; });
}
function logoutUser() {
  currentUser = null;
  Store.set('okm_user', null);
  showToast('تم تسجيل الخروج بنجاح', 'success');
  setTimeout(() => (window.location.href = 'index.html'), 800);
}

/* ---------------------------------------------------------------------- */
/* 12) التهيئة العامة عند تحميل أي صفحة                                    */
/* ---------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  applyLanguage();
  updateHeaderCounters();
  updateAuthUI();
  initInstantSearch();
  initMobileMenu();
  initBackToTop();
  initChatWidget();
  initRevealOnScroll();

  document.querySelector('.theme-toggle')?.addEventListener('click', toggleTheme);
  document.querySelector('.lang-toggle')?.addEventListener('click', toggleLanguage);
  document.querySelector('.logout-btn')?.addEventListener('click', (e) => { e.preventDefault(); logoutUser(); });

  // تفعيل رابط الصفحة الحالية في القائمة
  const current = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a, .mobile-menu a').forEach((a) => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });

  // استدعاء دوال رسم المحتوى الخاصة بكل صفحة (إن وُجدت)
  renderDynamicContent();
  refreshReveal();
});

/* ---------------------------------------------------------------------- */
/* 13) رسم محتوى الصفحة الرئيسية (الأقسام + المنتجات المميزة + الأحدث)     */
/* ---------------------------------------------------------------------- */
function renderHomeProducts() {
  const catGrid = document.getElementById('homeCategoriesGrid');
  if (catGrid && typeof CATEGORIES !== 'undefined') {
    catGrid.innerHTML = CATEGORIES.map((c) => `
      <a href="products.html?category=${c.id}" class="category-card reveal">
        <div class="cat-icon" style="background:linear-gradient(135deg, ${c.color}CC, ${c.color})"><i class="fa-solid ${c.icon}"></i></div>
        <h3>${currentLang === 'ar' ? c.name : c.nameEn}</h3>
        <p>${PRODUCTS.filter((p) => p.category === c.id).length} ${currentLang === 'ar' ? 'قطعة' : 'items'}</p>
      </a>`).join('');
  }

  const featuredGrid = document.getElementById('featuredProductsGrid');
  if (featuredGrid && typeof PRODUCTS !== 'undefined') {
    featuredGrid.innerHTML = PRODUCTS.filter((p) => p.featured).slice(0, 8).map(productCardHTML).join('');
  }

  const latestGrid = document.getElementById('latestProductsGrid');
  if (latestGrid && typeof PRODUCTS !== 'undefined') {
    latestGrid.innerHTML = [...PRODUCTS].slice(-8).reverse().map(productCardHTML).join('');
  }

  refreshReveal();

  // ربط نموذج بحث الهيرو بصفحة البحث
  const heroForm = document.getElementById('heroSearchForm');
  if (heroForm && !heroForm.dataset.bound) {
    heroForm.dataset.bound = '1';
    heroForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = document.getElementById('heroSearchInput').value.trim();
      if (val) window.location.href = `search.html?q=${encodeURIComponent(val)}`;
    });
  }
}

/* ---------------------------------------------------------------------- */
/* 14) صفحة جميع المنتجات: فلاتر + فرز + ترقيم صفحات                       */
/* ---------------------------------------------------------------------- */
let shopState = { page: 1, perPage: 9 };

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function renderShopPage() {
  const grid = document.getElementById('shopProductsGrid');
  if (!grid || typeof PRODUCTS === 'undefined') return;

  // بناء قائمة الأقسام في الفلاتر (مرة واحدة فقط)
  const catList = document.getElementById('categoryFilterList');
  if (catList && !catList.dataset.built) {
    catList.dataset.built = '1';
    const urlCat = getQueryParam('category');
    catList.innerHTML = CATEGORIES.map((c) => `
      <label class="filter-option">
        <input type="checkbox" class="cat-filter-checkbox" value="${c.id}" ${urlCat === c.id ? 'checked' : ''}>
        <span>${currentLang === 'ar' ? c.name : c.nameEn}</span>
      </label>`).join('');
  }
  const auctionCheckbox = document.getElementById('auctionOnlyFilter');
  if (auctionCheckbox && getQueryParam('auction') === '1') auctionCheckbox.checked = true;

  // قراءة الفلاتر الحالية
  const searchVal = (document.getElementById('filterSearchInput')?.value || '').toLowerCase();
  const checkedCats = Array.from(document.querySelectorAll('.cat-filter-checkbox:checked')).map((el) => el.value);
  const minPrice = Number(document.getElementById('minPriceInput')?.value) || 0;
  const maxPrice = Number(document.getElementById('maxPriceInput')?.value) || Infinity;
  const minRating = Number(document.querySelector('input[name="ratingFilter"]:checked')?.value) || 0;
  const auctionOnly = document.getElementById('auctionOnlyFilter')?.checked;
  const sortVal = document.getElementById('sortSelect')?.value || 'newest';

  let list = PRODUCTS.filter((p) => {
    if (searchVal && !p.title.toLowerCase().includes(searchVal) && !p.titleEn.toLowerCase().includes(searchVal)) return false;
    if (checkedCats.length && !checkedCats.includes(p.category)) return false;
    if (p.price < minPrice || p.price > maxPrice) return false;
    if (p.rating < minRating) return false;
    if (auctionOnly && !p.auction) return false;
    return true;
  });

  if (sortVal === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (sortVal === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (sortVal === 'rating') list.sort((a, b) => b.rating - a.rating);
  else list.sort((a, b) => b.id - a.id);

  // ترقيم الصفحات
  const totalPages = Math.max(1, Math.ceil(list.length / shopState.perPage));
  if (shopState.page > totalPages) shopState.page = 1;
  const start = (shopState.page - 1) * shopState.perPage;
  const pageItems = list.slice(start, start + shopState.perPage);

  const countEl = document.getElementById('resultsCount');
  if (countEl) countEl.textContent = currentLang === 'ar' ? `عرض ${list.length} نتيجة` : `Showing ${list.length} results`;

  grid.innerHTML = pageItems.length
    ? pageItems.map(productCardHTML).join('')
    : `<p style="grid-column:1/-1; text-align:center; color:var(--color-text-muted); padding:40px 0;">${t('noResults')}</p>`;

  // رسم أزرار الترقيم
  const pag = document.getElementById('shopPagination');
  if (pag) {
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === shopState.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    pag.innerHTML = html;
    pag.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
      shopState.page = Number(btn.dataset.page);
      renderShopPage();
      window.scrollTo({ top: 300, behavior: 'smooth' });
    }));
  }
  refreshReveal();
}

function initShopFilters() {
  if (!document.getElementById('shopProductsGrid')) return;
  const inputs = ['filterSearchInput', 'minPriceInput', 'maxPriceInput', 'sortSelect', 'auctionOnlyFilter'];
  inputs.forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => { shopState.page = 1; renderShopPage(); });
    document.getElementById(id)?.addEventListener('change', () => { shopState.page = 1; renderShopPage(); });
  });
  document.getElementById('priceRangeSlider')?.addEventListener('input', (e) => {
    document.getElementById('maxPriceInput').value = e.target.value;
    shopState.page = 1; renderShopPage();
  });
  document.body.addEventListener('change', (e) => {
    if (e.target.classList.contains('cat-filter-checkbox')) { shopState.page = 1; renderShopPage(); }
    if (e.target.name === 'ratingFilter') { shopState.page = 1; renderShopPage(); }
  });
  document.getElementById('resetFiltersBtn')?.addEventListener('click', () => {
    document.querySelectorAll('.cat-filter-checkbox').forEach((el) => (el.checked = false));
    document.getElementById('filterSearchInput').value = '';
    document.getElementById('minPriceInput').value = '';
    document.getElementById('maxPriceInput').value = '';
    document.getElementById('auctionOnlyFilter').checked = false;
    document.querySelector('input[name="ratingFilter"][value="0"]').checked = true;
    shopState.page = 1;
    renderShopPage();
  });
}
document.addEventListener('DOMContentLoaded', initShopFilters);

/* ---------------------------------------------------------------------- */
/* 15) صفحة تفاصيل المنتج                                                 */
/* ---------------------------------------------------------------------- */
let pdActiveImageIndex = 0;

function renderProductDetails() {
  const root = document.getElementById('productDetailsRoot');
  if (!root || typeof PRODUCTS === 'undefined') return;

  const id = Number(getQueryParam('id')) || PRODUCTS[0].id;
  const p = findProduct(id);
  if (!p) { root.innerHTML = `<p>${t('noResults')}</p>`; return; }

  const title = currentLang === 'ar' ? p.title : p.titleEn;
  document.title = `${title} | سوق الكويت القديم`;
  const breadCurrent = document.getElementById('pdBreadCurrent');
  if (breadCurrent) breadCurrent.textContent = title;

  const fav = isFavorite(p.id) ? 'active' : '';
  root.innerHTML = `
    <div>
      <div class="gallery-main" id="galleryMain">
        <img src="${p.images[pdActiveImageIndex] || p.image}" alt="${title}" id="galleryMainImg" loading="lazy">
      </div>
      <div class="gallery-thumbs" id="galleryThumbs">
        ${p.images.map((img, i) => `<img src="${img}" alt="${title} ${i + 1}" loading="lazy" class="${i === pdActiveImageIndex ? 'active' : ''}" data-index="${i}">`).join('')}
      </div>
    </div>
    <div>
      <span class="pd-category">${CATEGORIES.find((c) => c.id === p.category)?.[currentLang === 'ar' ? 'name' : 'nameEn']}</span>
      <h1 class="pd-title">${title}</h1>
      <div class="pd-rating">
        <span class="stars">${renderStars(p.rating)}</span>
        <span>${p.rating} (${p.reviews} <span data-ar="تقييم" data-en="reviews">تقييم</span>)</span>
      </div>
      <div class="pd-price">${p.price} ${currentLang === 'ar' ? 'د.ك' : 'KWD'} ${p.oldPrice ? `<small>${p.oldPrice} ${currentLang === 'ar' ? 'د.ك' : 'KWD'}</small>` : ''}</div>
      <p class="pd-desc">${p.desc}</p>
      <div class="pd-meta">
        <div><span data-ar="الحالة" data-en="Condition">الحالة</span><strong>${p.condition}</strong></div>
        <div><span data-ar="العمر التقريبي" data-en="Approx. Age">العمر التقريبي</span><strong>${p.age}</strong></div>
        <div><span data-ar="الخامة" data-en="Material">الخامة</span><strong>${p.material}</strong></div>
        <div><span data-ar="المنشأ" data-en="Origin">المنشأ</span><strong>${p.origin}</strong></div>
      </div>

      ${p.auction ? `
      <div class="auction-box">
        <h4 style="text-align:center;"><i class="fa-solid fa-gavel"></i> <span data-ar="مزاد مباشر" data-en="Live Auction">مزاد مباشر</span></h4>
        <div class="auction-timer">
          <div><span id="auctH">12</span><small data-ar="ساعة" data-en="Hrs">ساعة</small></div>
          <div><span id="auctM">45</span><small data-ar="دقيقة" data-en="Min">دقيقة</small></div>
          <div><span id="auctS">30</span><small data-ar="ثانية" data-en="Sec">ثانية</small></div>
        </div>
        <div class="auction-bid-row">
          <input type="number" id="bidInput" placeholder="أدخل مبلغ المزايدة (أعلى من ${p.price + 5} د.ك)">
          <button class="btn btn-secondary" id="placeBidBtn"><span data-ar="زايد الآن" data-en="Place Bid">زايد الآن</span></button>
        </div>
      </div>` : ''}

      <div class="pd-actions">
        <div class="qty-selector">
          <button id="pdQtyMinus">−</button>
          <input type="text" id="pdQty" value="1" readonly>
          <button id="pdQtyPlus">+</button>
        </div>
        <button class="btn btn-primary" id="pdAddCart" ${p.stock === 0 ? 'disabled' : ''}><i class="fa-solid fa-cart-plus"></i> <span data-ar="أضف للسلة" data-en="Add to Cart">أضف للسلة</span></button>
        <button class="wishlist-btn ${fav}" data-id="${p.id}" style="position:static; width:50px; height:50px; background:var(--color-surface-alt);" onclick="toggleFavorite(${p.id})"><i class="fa-solid fa-heart"></i></button>
      </div>

      <div class="pd-trust">
        <div><i class="fa-solid fa-shield-halved"></i> <span data-ar="قطعة موثقة الأصالة" data-en="Authenticity Verified">قطعة موثقة الأصالة</span></div>
        <div><i class="fa-solid fa-truck"></i> <span data-ar="توصيل لجميع مناطق الكويت" data-en="Delivery across Kuwait">توصيل لجميع مناطق الكويت</span></div>
        <div><i class="fa-solid fa-rotate-left"></i> <span data-ar="إمكانية الإرجاع خلال 3 أيام" data-en="3-day return policy">إمكانية الإرجاع خلال 3 أيام</span></div>
      </div>

      <div class="seller-card">
        <img src="${p.sellerAvatar}" alt="${p.seller}">
        <div class="info">
          <strong>${p.seller}</strong>
          <span><i class="fa-solid fa-badge-check"></i> <span data-ar="بائع موثّق" data-en="Verified Seller">بائع موثّق</span></span>
        </div>
        <button class="chat-btn" onclick="document.querySelector('.chat-window').classList.add('active')"><i class="fa-solid fa-comment-dots"></i></button>
      </div>
    </div>`;

  document.getElementById('fullDescription').textContent = p.desc + ' ' + (currentLang === 'ar'
    ? 'هذه القطعة جزء من مجموعة مختارة بعناية من التراث الكويتي الأصيل، وتخضع للفحص والتوثيق قبل عرضها على المنصة لضمان أعلى مستويات الجودة والثقة لعملائنا الكرام.'
    : 'This item is part of a carefully curated selection of authentic Kuwaiti heritage, verified before listing to ensure the highest quality and trust for our valued customers.');

  // التقييمات
  document.getElementById('reviewAvg').textContent = p.rating;
  document.getElementById('reviewStars').innerHTML = renderStars(p.rating);
  document.getElementById('reviewCount').textContent = `${p.reviews} ${currentLang === 'ar' ? 'تقييم' : 'reviews'}`;
  const reviewsList = document.getElementById('reviewsList');
  reviewsList.innerHTML = REVIEWS_POOL.slice(0, 4).map((r) => `
    <div class="review-item">
      <img src="https://placehold.co/100x100/6B4423/FDF8EE?text=${encodeURIComponent(r.name.split(' ')[0])}&font=tajawal" alt="${r.name}" loading="lazy">
      <div style="flex:1;">
        <div class="head"><strong>${r.name}</strong><span class="date">2024</span></div>
        <div class="stars">${renderStars(r.stars)}</div>
        <p style="font-size:.87rem; color:var(--color-text-muted); margin-top:6px;">${r.text}</p>
      </div>
    </div>`).join('');

  // منتجات مشابهة
  const related = PRODUCTS.filter((rp) => rp.category === p.category && rp.id !== p.id).slice(0, 4);
  document.getElementById('relatedProductsGrid').innerHTML = related.map(productCardHTML).join('');

  bindProductDetailsEvents(p);
  refreshReveal();
}

function bindProductDetailsEvents(p) {
  // معرض الصور + التكبير
  document.querySelectorAll('#galleryThumbs img').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      pdActiveImageIndex = Number(thumb.dataset.index);
      document.getElementById('galleryMainImg').src = thumb.src;
      document.querySelectorAll('#galleryThumbs img').forEach((t) => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });
  document.getElementById('galleryMain')?.addEventListener('click', () => {
    const lightbox = document.getElementById('lightbox');
    document.getElementById('lightboxImg').src = document.getElementById('galleryMainImg').src;
    lightbox.style.display = 'flex';
  });
  document.getElementById('lightboxClose')?.addEventListener('click', () => (document.getElementById('lightbox').style.display = 'none'));

  // الكمية
  const qtyInput = document.getElementById('pdQty');
  document.getElementById('pdQtyMinus')?.addEventListener('click', () => (qtyInput.value = Math.max(1, Number(qtyInput.value) - 1)));
  document.getElementById('pdQtyPlus')?.addEventListener('click', () => (qtyInput.value = Number(qtyInput.value) + 1));
  document.getElementById('pdAddCart')?.addEventListener('click', () => addToCart(p.id, Number(qtyInput.value)));

  // التبويبات
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  // تقييم بالنجوم
  let selectedStars = 5;
  document.querySelectorAll('#starInput i').forEach((star) => {
    star.addEventListener('click', () => {
      selectedStars = Number(star.dataset.val);
      document.querySelectorAll('#starInput i').forEach((s) => s.classList.toggle('active', Number(s.dataset.val) <= selectedStars));
    });
  });
  document.querySelectorAll('#starInput i').forEach((s) => s.classList.add('active')); // افتراضي 5 نجوم

  document.getElementById('reviewForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast(currentLang === 'ar' ? 'شكرًا لك! تم إرسال تقييمك بنجاح' : 'Thank you! Your review was submitted', 'success');
    e.target.reset();
  });

  // نظام المزاد (واجهة فقط)
  if (p.auction) {
    let seconds = 12 * 3600 + 45 * 60 + 30;
    const timerInterval = setInterval(() => {
      seconds--;
      if (seconds < 0) { clearInterval(timerInterval); return; }
      const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
      const hEl = document.getElementById('auctH'), mEl = document.getElementById('auctM'), sEl = document.getElementById('auctS');
      if (hEl) hEl.textContent = String(h).padStart(2, '0');
      if (mEl) mEl.textContent = String(m).padStart(2, '0');
      if (sEl) sEl.textContent = String(s).padStart(2, '0');
    }, 1000);

    document.getElementById('placeBidBtn')?.addEventListener('click', () => {
      const bidInput = document.getElementById('bidInput');
      const val = Number(bidInput.value);
      if (!val || val <= p.price + 5) {
        showToast(currentLang === 'ar' ? 'يجب أن تكون المزايدة أعلى من السعر الحالي' : 'Bid must be higher than the current price', 'error');
        return;
      }
      showToast(currentLang === 'ar' ? 'تم تسجيل مزايدتك بنجاح!' : 'Your bid has been placed!', 'success');
      bidInput.value = '';
    });
  }
}

/* ---------------------------------------------------------------------- */
/* 16) صفحة الأقسام الكاملة                                               */
/* ---------------------------------------------------------------------- */
function renderCategoriesPage() {
  const grid = document.getElementById('allCategoriesGrid');
  if (!grid || typeof CATEGORIES === 'undefined') return;
  grid.innerHTML = CATEGORIES.map((c) => `
    <a href="products.html?category=${c.id}" class="category-card reveal">
      <div class="cat-icon" style="background:linear-gradient(135deg, ${c.color}CC, ${c.color})"><i class="fa-solid ${c.icon}"></i></div>
      <h3>${currentLang === 'ar' ? c.name : c.nameEn}</h3>
      <p>${PRODUCTS.filter((p) => p.category === c.id).length} ${currentLang === 'ar' ? 'قطعة' : 'items'}</p>
    </a>`).join('');
  refreshReveal();
}

/* ---------------------------------------------------------------------- */
/* 17) صفحة البحث                                                        */
/* ---------------------------------------------------------------------- */
function renderSearchPage() {
  const grid = document.getElementById('searchResultsGrid');
  if (!grid || typeof PRODUCTS === 'undefined') return;

  const input = document.getElementById('searchPageInput');
  const q = (getQueryParam('q') || '').trim();
  if (input && !input.dataset.bound) {
    input.value = q;
    input.dataset.bound = '1';
    document.getElementById('searchPageForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      window.location.href = `search.html?q=${encodeURIComponent(input.value.trim())}`;
    });
  }

  const results = q
    ? PRODUCTS.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()) || p.titleEn.toLowerCase().includes(q.toLowerCase()) || p.desc.includes(q))
    : [];

  const countEl = document.getElementById('searchResultsCount');
  if (countEl) {
    countEl.textContent = q
      ? (currentLang === 'ar' ? `${results.length} نتيجة عن "${q}"` : `${results.length} results for "${q}"`)
      : (currentLang === 'ar' ? 'اكتب كلمة للبحث عن القطع التراثية' : 'Type a keyword to search heritage items');
  }

  grid.innerHTML = results.length
    ? results.map(productCardHTML).join('')
    : (q ? `<p style="grid-column:1/-1; text-align:center; color:var(--color-text-muted); padding:40px 0;">${t('noResults')}</p>` : '');
  refreshReveal();
}

/* ---------------------------------------------------------------------- */
/* 18) صفحة المفضلة                                                      */
/* ---------------------------------------------------------------------- */
function renderFavoritesPage() {
  const grid = document.getElementById('favoritesGrid');
  if (!grid || typeof PRODUCTS === 'undefined') return;
  const items = PRODUCTS.filter((p) => favorites.includes(p.id));
  grid.style.display = items.length ? 'grid' : 'none';
  document.getElementById('favoritesEmptyState').style.display = items.length ? 'none' : 'block';
  grid.innerHTML = items.map(productCardHTML).join('');
  refreshReveal();
}

/* ---------------------------------------------------------------------- */
/* 19) صفحة سلة التسوق                                                    */
/* ---------------------------------------------------------------------- */
function renderCartPage() {
  const list = document.getElementById('cartItemsList');
  if (!list || typeof PRODUCTS === 'undefined') return;

  const layoutRoot = document.getElementById('cartLayoutRoot');
  const emptyState = document.getElementById('cartEmptyState');
  if (cart.length === 0) {
    layoutRoot.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  layoutRoot.style.display = 'grid';
  emptyState.style.display = 'none';

  list.innerHTML = cart.map((c) => {
    const p = findProduct(c.id);
    if (!p) return '';
    const title = currentLang === 'ar' ? p.title : p.titleEn;
    return `
    <div class="cart-item">
      <img src="${p.image}" alt="${title}" loading="lazy">
      <div>
        <h4>${title}</h4>
        <span class="cat">${p.condition}</span>
      </div>
      <div class="qty-selector">
        <button onclick="updateCartQty(${p.id}, ${c.qty - 1})">−</button>
        <input type="text" value="${c.qty}" readonly>
        <button onclick="updateCartQty(${p.id}, ${c.qty + 1})">+</button>
      </div>
      <div class="price">${p.price * c.qty} ${currentLang === 'ar' ? 'د.ك' : 'KWD'}</div>
      <button class="remove-btn" onclick="removeFromCart(${p.id})" aria-label="حذف"><i class="fa-solid fa-trash"></i></button>
    </div>`;
  }).join('');

  const subtotal = cartSubtotal();
  const shipping = subtotal > 0 ? 2 : 0;
  const currency = currentLang === 'ar' ? 'د.ك' : 'KWD';
  document.getElementById('cartSubtotal').textContent = `${subtotal} ${currency}`;
  document.getElementById('cartShipping').textContent = `${shipping} ${currency}`;
  document.getElementById('cartTotal').textContent = `${subtotal + shipping} ${currency}`;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('applyPromoBtn')?.addEventListener('click', () => {
    const val = document.getElementById('promoInput').value.trim();
    if (val) showToast(currentLang === 'ar' ? 'كود الخصم غير صالح أو منتهي' : 'Promo code invalid or expired', 'error');
  });
});

/* ---------------------------------------------------------------------- */
/* 20) صفحة الدفع (Checkout)                                              */
/* ---------------------------------------------------------------------- */
function renderCheckoutPage() {
  const list = document.getElementById('checkoutItemsList');
  if (!list || typeof PRODUCTS === 'undefined') return;
  const currency = currentLang === 'ar' ? 'د.ك' : 'KWD';

  list.innerHTML = cart.map((c) => {
    const p = findProduct(c.id);
    if (!p) return '';
    const title = currentLang === 'ar' ? p.title : p.titleEn;
    return `<div class="summary-row"><span>${title} × ${c.qty}</span><span>${p.price * c.qty} ${currency}</span></div>`;
  }).join('') || `<p style="color:var(--color-text-muted); font-size:.85rem;">${t('noResults')}</p>`;

  const subtotal = cartSubtotal();
  const shipping = subtotal > 0 ? 2 : 0;
  document.getElementById('checkoutSubtotal').textContent = `${subtotal} ${currency}`;
  document.getElementById('checkoutShipping').textContent = `${shipping} ${currency}`;
  document.getElementById('checkoutTotal').textContent = `${subtotal + shipping} ${currency}`;
}

function initCheckoutForm() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;
  renderCheckoutPage();

  // اختيار طريقة الدفع
  document.querySelectorAll('.payment-method').forEach((method) => {
    method.addEventListener('click', () => {
      document.querySelectorAll('.payment-method').forEach((m) => m.classList.remove('selected'));
      method.classList.add('selected');
      method.querySelector('input').checked = true;
      const isCard = method.querySelector('span').textContent.includes('بطاقة') || method.querySelector('span').textContent.includes('Card');
      document.getElementById('cardFieldsBlock').style.display = isCard ? 'block' : 'none';
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      showToast(currentLang === 'ar' ? 'سلتك فارغة، أضف منتجات أولاً' : 'Your cart is empty', 'error');
      return;
    }
    showToast(currentLang === 'ar' ? 'تم تأكيد طلبك بنجاح! سيتم التواصل معك قريبًا' : 'Order confirmed! We will contact you soon', 'success');
    cart = [];
    saveCart();
    setTimeout(() => (window.location.href = 'index.html'), 1600);
  });
}
document.addEventListener('DOMContentLoaded', initCheckoutForm);

/* ---------------------------------------------------------------------- */
/* 21) تسجيل الدخول وإنشاء حساب (محاكاة - بدون خادم فعلي)                  */
/* ---------------------------------------------------------------------- */
function initAuthForms() {
  document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    currentUser = { name: email.split('@')[0] || 'مستخدم', email };
    Store.set('okm_user', currentUser);
    showToast(t('welcomeBack'), 'success');
    setTimeout(() => (window.location.href = 'profile.html'), 900);
  });

  document.getElementById('registerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const inputs = e.target.querySelectorAll('input[type="text"]');
    const firstName = inputs[0]?.value || 'مستخدم';
    const email = e.target.querySelector('input[type="email"]').value;
    currentUser = { name: firstName, email };
    Store.set('okm_user', currentUser);
    showToast(currentLang === 'ar' ? 'تم إنشاء حسابك بنجاح!' : 'Account created successfully!', 'success');
    setTimeout(() => (window.location.href = 'profile.html'), 900);
  });
}
document.addEventListener('DOMContentLoaded', initAuthForms);

/* ---------------------------------------------------------------------- */
/* 22) الملف الشخصي                                                       */
/* ---------------------------------------------------------------------- */
function renderProfilePage() {
  const nameEls = [document.getElementById('sidebarUserName'), document.getElementById('sidebarUserName2')];
  nameEls.forEach((el) => { if (el && currentUser) el.textContent = currentUser.name; });
  const nameInput = document.getElementById('profileNameInput');
  if (nameInput && currentUser) nameInput.value = currentUser.name;

  document.getElementById('profileForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast(currentLang === 'ar' ? 'تم حفظ بياناتك بنجاح' : 'Your info was saved', 'success');
  });
}
document.addEventListener('DOMContentLoaded', renderProfilePage);

/* ---------------------------------------------------------------------- */
/* 23) صفحة إضافة إعلان جديد                                              */
/* ---------------------------------------------------------------------- */
function initAddListingPage() {
  const form = document.getElementById('addListingForm');
  if (!form) return;

  const catSelect = document.getElementById('listingCategorySelect');
  if (catSelect && typeof CATEGORIES !== 'undefined') {
    catSelect.innerHTML = CATEGORIES.map((c) => `<option value="${c.id}">${currentLang === 'ar' ? c.name : c.nameEn}</option>`).join('');
  }

  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const preview = document.getElementById('uploadPreview');
  let uploadedFiles = [];

  uploadZone?.addEventListener('click', () => fileInput.click());
  uploadZone?.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
  uploadZone?.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  fileInput?.addEventListener('change', () => handleFiles(fileInput.files));

  function handleFiles(fileList) {
    Array.from(fileList).slice(0, 5 - uploadedFiles.length).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        uploadedFiles.push(ev.target.result);
        renderPreview();
      };
      reader.readAsDataURL(file);
    });
  }
  function renderPreview() {
    preview.innerHTML = uploadedFiles.map((src, i) => `
      <div class="preview-item">
        <img src="${src}" alt="صورة ${i + 1}">
        <button type="button" data-index="${i}"><i class="fa-solid fa-xmark"></i></button>
      </div>`).join('');
    preview.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => {
      uploadedFiles.splice(Number(btn.dataset.index), 1);
      renderPreview();
    }));
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast(currentLang === 'ar' ? 'تم نشر إعلانك بنجاح! سيظهر بعد المراجعة' : 'Your ad was published! It will appear after review', 'success');
    setTimeout(() => (window.location.href = 'my-listings.html'), 1400);
  });
}
document.addEventListener('DOMContentLoaded', initAddListingPage);

/* ---------------------------------------------------------------------- */
/* 24) إدارة إعلانات المستخدم                                             */
/* ---------------------------------------------------------------------- */
function renderMyListings() {
  const tbody = document.getElementById('myListingsBody');
  if (!tbody || typeof PRODUCTS === 'undefined') return;

  const nameEl = document.getElementById('sidebarUserName2');
  if (nameEl && currentUser) nameEl.textContent = currentUser.name;

  // نعرض 6 منتجات تجريبية كـ "إعلاناتي"
  const myItems = PRODUCTS.slice(0, 6);
  const statuses = ['active', 'active', 'pending', 'active', 'sold', 'pending'];
  const currency = currentLang === 'ar' ? 'د.ك' : 'KWD';
  const statusLabels = {
    active: currentLang === 'ar' ? 'نشط' : 'Active',
    pending: currentLang === 'ar' ? 'قيد المراجعة' : 'Pending',
    sold: currentLang === 'ar' ? 'مباع' : 'Sold',
  };

  tbody.innerHTML = myItems.map((p, i) => `
    <tr>
      <td><img src="${p.image}" alt="${p.title}" loading="lazy"></td>
      <td>${currentLang === 'ar' ? p.title : p.titleEn}</td>
      <td>${p.price} ${currency}</td>
      <td><span class="status-pill ${statuses[i]}">${statusLabels[statuses[i]]}</span></td>
      <td>${20 + i * 13}</td>
      <td class="table-actions">
        <button title="تعديل"><i class="fa-solid fa-pen"></i></button>
        <button title="حذف" onclick="deleteMyListing(this)"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('');
}
function deleteMyListing(btn) {
  const row = btn.closest('tr');
  row.style.opacity = '0';
  setTimeout(() => row.remove(), 250);
  showToast(currentLang === 'ar' ? 'تم حذف الإعلان' : 'Listing deleted', 'success');
}

/* ---------------------------------------------------------------------- */
/* 25) نموذج صفحة تواصل معنا                                              */
/* ---------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('contactForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast(currentLang === 'ar' ? 'تم إرسال رسالتك بنجاح! سنرد عليك قريبًا' : 'Your message was sent! We will reply soon', 'success');
    e.target.reset();
  });
});
