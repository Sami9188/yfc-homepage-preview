(function () {
  var header = document.querySelector('.header');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Reveal-on-scroll: only when motion is allowed and the browser can observe */
  if (!reduce && 'IntersectionObserver' in window) {
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

  /* Header: transparent over the hero, solid once scrolled */
  function onScroll() { header.classList.toggle('is-top', window.scrollY < 24); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Keep the hero and mobile drawer measured against the real header height */
  function setHeaderHeight() {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  setHeaderHeight();
  window.addEventListener('resize', setHeaderHeight);

  /* Mobile menu */
  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    nav.classList.toggle('is-open', !open);
    header.classList.toggle('is-menu-open', !open);
    document.body.style.overflow = open ? '' : 'hidden';
  });
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { if (nav.classList.contains('is-open')) toggle.click(); });
  });

  /* Dropdowns */
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

  /* Process loop: hovering a step lights its node on the ring, and vice versa */
  var steps = document.querySelectorAll('.step'), nodes = document.querySelectorAll('.loop__node');
  function setActive(n) {
    steps.forEach(function (s) { s.classList.toggle('is-active', s.dataset.step === n); });
    nodes.forEach(function (s) { s.classList.toggle('is-active', s.dataset.step === n); });
  }
  steps.forEach(function (s) { s.addEventListener('mouseenter', function () { setActive(s.dataset.step); }); });
  nodes.forEach(function (s) { s.addEventListener('mouseenter', function () { setActive(s.dataset.step); }); });
  setActive('1');

  /* ESG: gauge draws in and numbers count up the first time they scroll into view */
  var gauge = document.getElementById('gauge');
  var counters = document.querySelectorAll('.count');
  if (!reduce && 'IntersectionObserver' in window && gauge) {
    gauge.classList.add('is-armed');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.disconnect();
        requestAnimationFrame(function () { gauge.classList.add('is-live'); });
        counters.forEach(function (el) {
          var target = parseInt(el.dataset.count, 10), start = performance.now(), dur = 1600;
          function tick(now) {
            var t = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(target * eased).toLocaleString('en-US');
            if (t < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        });
      });
    }, { threshold: 0.35 });
    io.observe(gauge);
  }

  /* Contact form: preview only. The live build posts to the client's mail handler or CRM. */
  var form = document.getElementById('contact-form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;
    form.querySelectorAll('[required]').forEach(function (f) {
      var valid = f.checkValidity();
      f.style.borderColor = valid ? '' : '#D9534F';
      if (!valid) ok = false;
    });
    if (!ok) { form.querySelector('[required]:invalid').focus(); return; }
    form.classList.add('is-sent');
  });
})();
