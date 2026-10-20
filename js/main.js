(function () {
  var header = document.querySelector('.header');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canObserve = 'IntersectionObserver' in window;

  /* ---------- Reveal on scroll (content is visible without JS) ---------- */
  if (!reduce && canObserve) {
    document.documentElement.classList.add('js-motion');
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); revealIO.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 60 + 'ms';
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in'); else revealIO.observe(el);
    });
  }

  /* ---------- Header: transparent over the hero, compact and solid once scrolling ---------- */
  function setHeaderHeight() {
    // Measured only in the full-size state so the hero offset never shifts mid-scroll.
    if (!header.classList.contains('is-compact')) document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  function onScroll() {
    var scrolled = window.scrollY >= 24;
    header.classList.toggle('is-top', !scrolled);
    header.classList.toggle('is-compact', scrolled);
  }
  setHeaderHeight();
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  window.addEventListener('resize', setHeaderHeight);

  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    nav.classList.toggle('is-open', !open);
    header.classList.toggle('is-menu-open', !open);
    document.documentElement.style.setProperty('--drawer-top', Math.round(header.getBoundingClientRect().bottom) + 'px');
    // Lock scrolling on <html>, not <body>: body overflow would break the sticky header.
    document.documentElement.classList.toggle('menu-locked', !open);
  });
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { if (nav.classList.contains('is-open')) toggle.click(); });
  });

  var items = nav.querySelectorAll('.nav > li');
  function closeAll() {
    items.forEach(function (i) {
      i.classList.remove('is-open');
      var b = i.querySelector(':scope > button');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  nav.querySelectorAll('.nav > li > button').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var li = btn.parentElement, open = li.classList.contains('is-open');
      closeAll();
      if (!open) { li.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });
  document.addEventListener('click', closeAll);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeAll(); if (nav.classList.contains('is-open')) toggle.click(); }
  });

  /* ---------- Links to inner pages that are part of phase two ---------- */
  var toast = document.getElementById('toast'), toastTimer;
  document.querySelectorAll('[data-soon]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      toast.innerHTML = '<b>' + a.dataset.soon + '</b> is an inner page planned for the next phase. This preview covers the homepage.';
      toast.hidden = false;
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toast.hidden = true; }, 3600);
    });
  });

  /* ---------- 4. Doing Good / To Do Good split circle ---------- */
  var halves = document.querySelectorAll('.split__half');
  function setHalf(name) {
    halves.forEach(function (h) {
      var on = h.dataset.half === name;
      h.classList.toggle('is-active', on);
      h.setAttribute('aria-pressed', String(on));
    });
    document.querySelectorAll('.split__panel [data-panel]').forEach(function (ul) { ul.hidden = ul.dataset.panel !== name; });
  }
  halves.forEach(function (h) {
    h.addEventListener('click', function () { setHalf(h.dataset.half); });
    h.addEventListener('mouseenter', function () { setHalf(h.dataset.half); });
  });

  /* ---------- 6. Journey: list and loop stay in sync ---------- */
  var jsteps = document.querySelectorAll('.jstep'), jnodes = document.querySelectorAll('.loop__node');
  function setStep(n) {
    jsteps.forEach(function (s) {
      var on = s.dataset.step === n;
      s.classList.toggle('is-active', on);
      s.querySelector('button').setAttribute('aria-expanded', String(on));
    });
    jnodes.forEach(function (s) { s.classList.toggle('is-active', s.dataset.step === n); });
  }
  jsteps.forEach(function (s) { s.querySelector('button').addEventListener('click', function () { setStep(s.dataset.step); }); });
  jnodes.forEach(function (s) {
    s.addEventListener('click', function () { setStep(s.dataset.step); });
    s.addEventListener('mouseenter', function () { setStep(s.dataset.step); });
  });
  setStep('1');

  /* ---------- 5. Materials explorer ---------- */
  var MATS = {
    paper: ['Paper & cardboard', ['Secure shredding where documents are confidential', 'Separation from mixed waste and other materials', 'Baling and recycling into new paper products']],
    plastics: ['Plastics', ['Sorting by plastic type', 'Shredding and baling into raw material', 'Upcycling into new products where suitable']],
    metals: ['Metals', ['Segregation of ferrous and non-ferrous metals', 'Debranding of branded metal products where needed', 'Return to the resource cycle through scrap recovery']],
    glass: ['Glass', ['Emptying and separation from contents and closures', 'Debranding where brand protection is required', 'Crushing for glass recycling']],
    wood: ['Wood', ['Reuse or repair of pallets and furniture where possible', 'Upcycling into new items', 'Recycling or another approved route']],
    textiles: ['Textiles', ['Debranding of branded garments and uniforms', 'Sorting for reuse or upcycling through YFC Re-Nu', 'Recycling or another approved route']],
    electronics: ['Electronics', ['Secure destruction of data-bearing devices', 'Dismantling and separation of components', 'Recovery of metals and other materials through certified processing']],
    perfumes: ['Perfumes', ['Debranding and secure destruction', 'Separation of liquid from packaging', 'Recovery of glass, metal and plastic packaging', 'Approved treatment of the liquid content']],
    batteries: ['Batteries', ['Safe handling and storage on collection', 'Sorting by battery type', 'Transfer to approved specialist recovery routes']],
    packaging: ['Packaging', ['Separation by material type', 'Debranding where packaging carries brand marks', 'Baling and recycling into raw material']],
    cosmetics: ['Cosmetics & personal care', ['Secure destruction of expired, recalled or unsellable stock', 'Separation of product from packaging', 'Recovery of packaging and approved treatment of contents']],
    automotive: ['Automotive components', ['Segregation of metals, plastics and other materials', 'Recovery of recyclable materials', 'Approved routes for anything that cannot be recovered']],
    food: ['Packaged food products', ['Secure destruction of expired or recalled stock', 'Depackaging to separate food from packaging', 'Organic content to composting or another approved route; packaging recovered']],
    mixed: ['Mixed commercial & industrial', ['Assessment of what the load contains', 'Segregation into individual material streams', 'The best available route for each stream']]
  };
  var matName = document.getElementById('mat-name'), matSteps = document.getElementById('mat-steps');
  var matTabs = document.querySelectorAll('.explorer__list [role="tab"]');
  function setMat(btn) {
    matTabs.forEach(function (t) { t.setAttribute('aria-selected', String(t === btn)); t.tabIndex = t === btn ? 0 : -1; });
    var m = MATS[btn.dataset.mat];
    matName.textContent = m[0];
    matSteps.innerHTML = '';
    m[1].forEach(function (s) { var li = document.createElement('li'); li.textContent = s; matSteps.appendChild(li); });
  }
  matTabs.forEach(function (t, i) {
    t.tabIndex = i === 0 ? 0 : -1;
    t.addEventListener('click', function () { setMat(t); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, idx = Array.prototype.indexOf.call(matTabs, t), next;
      if (k === 'ArrowRight' || k === 'ArrowDown') next = matTabs[(idx + 1) % matTabs.length];
      if (k === 'ArrowLeft' || k === 'ArrowUp') next = matTabs[(idx - 1 + matTabs.length) % matTabs.length];
      if (next) { e.preventDefault(); setMat(next); next.focus(); }
    });
  });

  /* ---------- 2. Impact indicators count up once in view ---------- */
  var indicators = document.querySelector('.indicators'), counters = document.querySelectorAll('.count');
  if (!reduce && canObserve && indicators) {
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      counters.forEach(function (el) {
        var target = parseInt(el.dataset.count, 10), start = performance.now(), dur = 1600;
        (function tick(now) {
          var t = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(target * eased).toLocaleString('en-US');
          if (t < 1) requestAnimationFrame(tick);
        })(start);
      });
    }, { threshold: 0.4 });
    io.observe(indicators);
  }

  /* ---------- Footer newsletter (preview only, not connected to a mailing list) ---------- */
  var nl = document.getElementById('newsletter');
  if (nl) nl.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = nl.querySelector('input');
    if (!input.checkValidity()) { input.focus(); input.style.borderColor = '#E07A6A'; return; }
    input.style.borderColor = '';
    nl.querySelector('.newsletter__row').hidden = true;
    nl.querySelector('.newsletter__done').hidden = false;
  });

  /* ---------- Contact form with enquiry routing (homepage and contact page) ---------- */
  var form = document.getElementById('contact-form');
  if (!form) return;
  var typeSel = document.getElementById('f-type');
  var ROUTES = ['solution', 'csr', 'partnership', 'media'];
  function setRoute(v) {
    if (ROUTES.indexOf(v) < 0) return;
    typeSel.value = v;
    form.querySelectorAll('.route').forEach(function (fs) { fs.hidden = fs.dataset.route !== v; });
    document.querySelectorAll('[data-route-pick]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.routePick === v)); });
  }
  typeSel.addEventListener('change', function () { setRoute(typeSel.value); });
  var qType = new URLSearchParams(location.search).get('type');
  if (qType) setRoute(qType);
  document.querySelectorAll('[data-enquiry]').forEach(function (a) {
    a.addEventListener('click', function () { setRoute(a.dataset.enquiry); });
  });
  function focusForm() {
    form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    setTimeout(function () { typeSel.focus({ preventScroll: true }); }, reduce ? 0 : 450);
  }
  document.querySelectorAll('[data-route-pick]').forEach(function (b) {
    b.addEventListener('click', function () { setRoute(b.dataset.routePick); focusForm(); });
  });
  document.querySelectorAll('[data-focus-form]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); focusForm(); });
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault(); // Preview only: the live build routes submissions by enquiry type.
    var ok = true;
    form.querySelectorAll('[required]').forEach(function (f) {
      var valid = f.checkValidity();
      f.style.borderColor = valid ? '' : '#C0392B';
      if (!valid) ok = false;
    });
    if (!ok) { form.querySelector('[required]:invalid').focus(); return; }
    form.classList.add('is-sent');
    form.querySelector('.form-success').focus();
  });
})();
