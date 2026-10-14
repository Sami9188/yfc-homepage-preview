(function () {
  var header = document.querySelector('.header');
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');

  /* Header shadow once the page has scrolled */
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Keep the mobile drawer below the real header height */
  function setHeaderHeight() {
    var h = header.getBoundingClientRect().bottom;
    document.documentElement.style.setProperty('--header-h', h + 'px');
  }
  setHeaderHeight();
  window.addEventListener('resize', setHeaderHeight);
  window.addEventListener('scroll', setHeaderHeight, { passive: true });

  /* Mobile menu */
  toggle.addEventListener('click', function () {
    var open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    nav.classList.toggle('is-open', !open);
    document.body.style.overflow = open ? '' : 'hidden';
  });
  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (nav.classList.contains('is-open')) toggle.click();
    });
  });

  /* Dropdowns: click to open, click outside or Escape to close */
  var items = nav.querySelectorAll('.nav > li');
  nav.querySelectorAll('.nav > li > button').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var li = btn.parentElement;
      var open = li.classList.contains('is-open');
      items.forEach(function (i) {
        i.classList.remove('is-open');
        var b = i.querySelector(':scope > button');
        if (b) b.setAttribute('aria-expanded', 'false');
      });
      if (!open) {
        li.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
  document.addEventListener('click', function () {
    items.forEach(function (i) {
      i.classList.remove('is-open');
      var b = i.querySelector(':scope > button');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.dispatchEvent(new Event('click'));
      if (nav.classList.contains('is-open')) toggle.click();
    }
  });

  /* Contact form: preview only. On the live build this posts to the client's
     mail handler or CRM; here it shows the confirmation state. */
  var form = document.getElementById('contact-form');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var required = form.querySelectorAll('[required]');
    var ok = true;
    required.forEach(function (f) {
      var valid = f.checkValidity();
      f.style.borderColor = valid ? '' : '#D9534F';
      if (!valid) ok = false;
    });
    if (!ok) { form.querySelector('[required]:invalid').focus(); return; }
    form.classList.add('is-sent');
    form.querySelector('.form-success').focus && form.querySelector('.form-success').setAttribute('tabindex', '-1');
  });
})();
