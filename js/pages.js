/* Inner-page interactions. Every block checks its elements exist, so this file
   can load on every page. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  /* On the live site only some pages are published (body data-live-pages);
     links built in script follow the same rules as build.py. */
  var LIVE_PAGES = document.body.dataset.livePages ? document.body.dataset.livePages.split(' ') : null;
  function enquiryHref(query) {
    if (LIVE_PAGES && LIVE_PAGES.indexOf('contact') < 0) return 'index.html?' + query + '#contact';
    return 'contact.html?' + query + '#enquiry';
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- Open a <details> panel when the URL points at it ---------- */
  function openFromHash() {
    if (!location.hash) return;
    var el = document.getElementById(location.hash.slice(1));
    if (!el) return;
    var d = el.tagName === 'DETAILS' ? el : el.querySelector('details');
    if (d) d.open = true;
    if (el.dataset && el.dataset.pick) el.click();
  }
  window.addEventListener('hashchange', openFromHash);

  /* ---------- Our Story: horizontal timeline ---------- */
  var tl = $('#timeline');
  if (tl) {
    var prev = $('[data-tl="prev"]'), next = $('[data-tl="next"]');
    function step(dir) {
      var item = tl.querySelector('.tl-item');
      var w = item ? item.getBoundingClientRect().width + 16 : 320;
      tl.scrollBy({ left: dir * w, behavior: reduce ? 'auto' : 'smooth' });
    }
    function sync() {
      prev.disabled = tl.scrollLeft < 8;
      next.disabled = tl.scrollLeft + tl.clientWidth > tl.scrollWidth - 8;
    }
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });
    tl.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* ---------- Home: draw the One Earth circle when it comes into view ---------- */
  $$('.lifeline').forEach(function (life) {
    if (reduce || !('IntersectionObserver' in window)) { life.classList.add('is-in'); return; }
    var lio = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { life.classList.add('is-in'); lio.disconnect(); }
    }, { threshold: 0.35 });
    lio.observe(life);
  });

  /* ---------- Count-up numbers outside the homepage indicators ---------- */
  var countWrap = $$('[data-countup]');
  if (countWrap.length && !reduce && 'IntersectionObserver' in window) {
    countWrap.forEach(function (wrap) {
      var io = new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting) return;
        io.disconnect();
        $$('.count', wrap).forEach(function (el) {
          var target = parseInt(el.dataset.count, 10), start = performance.now(), dur = 1500;
          (function tick(now) {
            var t = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(target * e).toLocaleString('en-US');
            if (t < 1) requestAnimationFrame(tick);
          })(start);
        });
      }, { threshold: 0.3 });
      io.observe(wrap);
    });
  }

  /* ---------- Filter chips (stories, insights, partners) ---------- */
  $$('[data-filter-group]').forEach(function (group) {
    var target = document.getElementById(group.dataset.filterGroup);
    var chips = $$('[data-filter]', group);
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var f = c.dataset.filter;
        chips.forEach(function (o) { o.setAttribute('aria-pressed', String(o === c)); });
        $$('[data-theme]', target).forEach(function (card) {
          card.hidden = f !== 'all' && card.dataset.theme.split(' ').indexOf(f) < 0;
        });
      });
    });
  });

  /* ---------- Shared engine for the sorting activity and the quiz ---------- */
  function game(root, cfg) {
    var i = 0, score = 0, log = [];
    function bar() {
      return '<div class="game__top"><span>' + cfg.unit + ' ' + (i + 1) + ' of ' + cfg.items.length + '</span><span class="game__bar"><i style="width:' + Math.round((i / cfg.items.length) * 100) + '%"></i></span></div>';
    }
    function render() {
      var it = cfg.items[i];
      var html = bar() + cfg.head(it) + '<div class="choices' + (cfg.oneCol ? ' choices--one' : '') + '">';
      cfg.choices(it).forEach(function (c, k) {
        html += '<button class="choice" type="button" data-k="' + k + '">' + (c.icon ? '<svg aria-hidden="true"><use href="#' + c.icon + '"/></svg>' : '') + '<span>' + esc(c.label) + '</span></button>';
      });
      html += '</div><div class="feedback" hidden></div>';
      root.innerHTML = html;
      var first = root.querySelector('.choice');
      if (first) first.focus({ preventScroll: true });
      $$('.choice', root).forEach(function (b) { b.addEventListener('click', function () { answer(+b.dataset.k); }); });
    }
    function answer(k) {
      var it = cfg.items[i], res = cfg.judge(it, k);
      if (res.level === 'right') score++;
      log.push({ item: it, res: res, k: k });
      $$('.choice', root).forEach(function (b) {
        var bk = +b.dataset.k; b.disabled = true;
        var lv = cfg.judge(it, bk).level;
        if (bk === k) b.classList.add(res.level === 'right' ? 'is-right' : res.level === 'ok' ? 'is-ok' : 'is-wrong');
        else if (lv === 'right') b.classList.add('is-right');
        else b.classList.add('is-dim');
      });
      var fb = root.querySelector('.feedback');
      var last = i === cfg.items.length - 1;
      fb.innerHTML = '<strong>' + esc(res.title) + '</strong><p>' + esc(it.why) + '</p><button class="btn btn--sm" type="button">' + (last ? 'See your results' : 'Next') + ' <svg><use href="#i-arrow"/></svg></button>';
      fb.hidden = false;
      var nb = fb.querySelector('button');
      nb.addEventListener('click', function () { i++; if (i < cfg.items.length) render(); else done(); });
      nb.focus({ preventScroll: true });
    }
    function done() {
      var html = '<div class="results"><p class="kicker">' + esc(cfg.doneKicker) + '</p><h3>' + esc(cfg.doneTitle(score, cfg.items.length)) + '</h3><ol>';
      log.forEach(function (l) { html += '<li class="' + (l.res.level === 'right' ? 'ok' : '') + '"><strong>' + esc(cfg.recap(l.item)) + '</strong>' + esc(l.item.why) + '</li>'; });
      html += '</ol><p class="note">' + esc(cfg.closing) + '</p><div class="btn-row"><button class="btn btn--sm btn--outline" type="button" data-again><svg><use href="#i-refresh"/></svg> Try again</button><a class="btn btn--sm" href="' + cfg.ctaHref + '">' + esc(cfg.ctaLabel) + ' <svg><use href="#i-arrow"/></svg></a></div></div>';
      root.innerHTML = html;
      root.querySelector('[data-again]').addEventListener('click', start);
      root.querySelector('h3').setAttribute('tabindex', '-1');
      root.querySelector('h3').focus({ preventScroll: true });
    }
    function start() { i = 0; score = 0; log = []; render(); }
    return start;
  }

  var ROUTES = [
    { label: 'Recycling', icon: 'i-recycle' },
    { label: 'Secure destruction first', icon: 'i-shield' },
    { label: 'Reuse or upcycling', icon: 'i-spark' },
    { label: 'Specialist recovery', icon: 'i-hazard' },
    { label: 'Composting', icon: 'i-leaf' }
  ];
  var SORT_ITEMS = [
    { name: 'Clean cardboard boxes', note: 'Dry, flattened and free of tape-heavy labels', icon: 'i-box', right: [0], ok: [2],
      why: 'Clean, dry cardboard is usually baled and recycled into new paper products. Boxes in good condition can also be reused. Wet or greasy cardboard may need a different route.' },
    { name: 'Expired branded perfume', note: 'Full bottles that can no longer be sold', icon: 'i-spray', right: [1], ok: [],
      why: 'Branded stock is debranded and destroyed securely so it cannot be resold. The liquid is separated for approved treatment and the glass, metal and plastic packaging is recovered.' },
    { name: 'Company laptops', note: 'Old devices that still hold data', icon: 'i-chip', right: [1], ok: [3],
      why: 'Data-bearing devices need secure data destruction first. They are then dismantled so metals and components can be recovered through certified processing.' },
    { name: 'Used batteries', note: 'Mixed household and device batteries', icon: 'i-hazard', right: [3], ok: [],
      why: 'Batteries can leak or catch fire, so they are stored safely, sorted by type and sent to approved specialist recovery routes rather than mixed recycling.' },
    { name: 'Wooden pallets', note: 'Mostly sound, a few broken boards', icon: 'i-layers', right: [2], ok: [0],
      why: 'Pallets in good condition can often be repaired and reused. Damaged wood can be upcycled into new items or recycled through another approved route.' },
    { name: 'Expired packaged food', note: 'Sealed products past their date', icon: 'i-cup', right: [4], ok: [1],
      why: 'Food is separated from its packaging. The organic content can go to composting or another approved route, and the packaging is recovered. Recalled branded products may also need secure destruction.' },
    { name: 'Branded staff uniforms', note: 'Garments carrying a company logo', icon: 'i-shirt', right: [2], ok: [1],
      why: 'Uniforms are debranded first so logos cannot be misused. Suitable textiles can then be reused or upcycled through YFC Re-Nu, and the rest recycled.' }
  ];
  var sortRoot = $('#sort-game');
  if (sortRoot) {
    var startSort = game(sortRoot, {
      unit: 'Item', items: SORT_ITEMS,
      head: function (it) { return '<div class="item"><span class="item__ic"><svg aria-hidden="true"><use href="#' + it.icon + '"/></svg></span><div><h3>' + esc(it.name) + '</h3><p>' + esc(it.note) + '</p></div></div><p class="kicker" style="margin-bottom:10px">Where should it go?</p>'; },
      choices: function () { return ROUTES; },
      judge: function (it, k) {
        if (it.right.indexOf(k) > -1) return { level: 'right', title: 'Good call.' };
        if (it.ok.indexOf(k) > -1) return { level: 'ok', title: 'Partly right. It depends on condition.' };
        return { level: 'wrong', title: 'Not quite. Here is what usually happens.' };
      },
      recap: function (it) { return it.name + ': ' + it.right.map(function (r) { return ROUTES[r].label; }).join(' or '); },
      doneKicker: 'Activity complete',
      doneTitle: function (s, n) { return 'You matched ' + s + ' of ' + n + ' items to their usual route.'; },
      closing: 'The final route always depends on composition, condition and local requirements. That is why YFC assesses every load before deciding where it goes.',
      ctaHref: enquiryHref('type=solution'), ctaLabel: 'Ask about your materials'
    });
    $('[data-start="sort"]').addEventListener('click', function () { startSort(); sortRoot.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); });
  }

  var QUIZ = [
    { q: 'Roughly how much municipal solid waste does the world generate each year?', a: ['About 200 million tonnes', 'About 2 billion tonnes', 'About 20 billion tonnes'], right: 1,
      why: 'The World Bank estimates around 2 billion tonnes a year, rising to about 3.4 billion tonnes by 2050 without action.' },
    { q: 'Which option sits higher in the waste hierarchy?', a: ['Recycling', 'Reuse', 'Energy recovery'], right: 1,
      why: 'Reuse keeps a product working in its current form, so it saves more resources than recycling it into raw material. Prevention comes first, then reuse, then recycling and recovery.' },
    { q: 'Why are some branded products debranded before recycling?', a: ['To make them lighter to transport', 'To prevent unauthorised reuse or resale', 'Because logos cannot be recycled'], right: 1,
      why: 'Debranding and secure destruction protect brand integrity. They stop expired, recalled or unsellable products from reappearing on the market.' },
    { q: 'What does a mass balance report show?', a: ['The weight of the collection vehicle', 'How much of what was received went to each route', 'The carbon footprint of one product'], right: 1,
      why: 'A mass balance accounts for what was received and where each part went: recycled, recovered or sent to another approved route. It is part of how outcomes are documented.' },
    { q: 'Can all plastics be recycled together?', a: ['Yes, plastic is plastic', 'No, they need sorting by type and condition'], right: 1,
      why: 'Different plastics melt and behave differently, and contamination matters. Sorting by type is what makes good-quality recycled material possible.' },
    { q: 'What should happen first to an old phone that held company data?', a: ['Recycle it straight away', 'Secure data destruction', 'Put it in general waste'], right: 1,
      why: 'Data must be destroyed securely first. The device can then be dismantled so metals and components are recovered responsibly.' }
  ];
  var quizRoot = $('#quiz-game');
  if (quizRoot) {
    var startQuiz = game(quizRoot, {
      unit: 'Question', items: QUIZ, oneCol: true,
      head: function (it) { return '<h3 class="q-title">' + esc(it.q) + '</h3>'; },
      choices: function (it) { return it.a.map(function (t) { return { label: t }; }); },
      judge: function (it, k) { return k === it.right ? { level: 'right', title: 'That is right.' } : { level: 'wrong', title: 'Not quite.' }; },
      recap: function (it) { return it.a[it.right]; },
      doneKicker: 'Your results',
      doneTitle: function (s, n) { return s + ' of ' + n + '. Here is what each answer means.'; },
      closing: 'Every product and material has a next step. Small decisions, made well, add up to a wider circle of good.',
      ctaHref: '#pledge', ctaLabel: 'Make your pledge'
    });
    $('[data-start="quiz"]').addEventListener('click', function () { startQuiz(); quizRoot.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }); });
  }

  /* ---------- Impact Pledge ---------- */
  var pf = $('#pledge-form');
  if (pf) {
    var card = $('#pledge-card'), pcText = $('#pc-text'), pcName = $('#pc-name'), share = $('#pledge-share');
    function current() {
      var who = pf.querySelector('[name="for"]:checked').value;
      var act = pf.querySelector('[name="action"]:checked').value;
      var name = pf.querySelector('[name="name"]').value.trim();
      return { who: who, act: act, name: name, text: 'For my ' + who + ', I pledge to ' + act + '.' };
    }
    function preview() { var c = current(); pcText.textContent = c.text; pcName.textContent = c.name || ' '; }
    pf.addEventListener('change', preview);
    pf.addEventListener('input', preview);
    pf.addEventListener('submit', function (e) {
      e.preventDefault(); preview();
      card.classList.remove('is-made'); void card.offsetWidth; card.classList.add('is-made');
      share.hidden = false;
      share.querySelector('button').focus({ preventScroll: true });
      if (window.matchMedia('(max-width: 900px)').matches) card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    });
    function wrapLines(ctx, text, max) {
      var words = text.split(' '), lines = [], line = '';
      words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > max && line) { lines.push(line); line = w; } else line = t; });
      if (line) lines.push(line); return lines;
    }
    $('#pl-download').addEventListener('click', function () {
      var c = current(), W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var x = cv.getContext('2d');
      var g = x.createRadialGradient(W, H, 50, W, H, 900); g.addColorStop(0, '#478C5C'); g.addColorStop(1, '#013A20');
      x.fillStyle = '#013A20'; x.fillRect(0, 0, W, H); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(205,209,147,.5)'; x.lineWidth = 8; x.beginPath(); x.arc(W - 40, H - 40, 470, 0, Math.PI * 2); x.stroke();
      var font = '"Inter Tight", system-ui, sans-serif';
      function finish(logo) {
        if (logo) x.drawImage(logo, 90, 90, 300, 300 * logo.naturalHeight / logo.naturalWidth);
        x.fillStyle = '#CDD193'; x.font = '800 34px ' + font; x.fillText('MY IMPACT PLEDGE', 90, 700);
        x.fillStyle = '#FFFFFF'; x.font = '800 70px ' + font;
        var lines = wrapLines(x, c.text.toUpperCase(), W - 180), y = 790;
        lines.forEach(function (l) { x.fillText(l, 90, y); y += 80; });
        if (c.name) { x.fillStyle = '#DCE7D9'; x.font = '700 40px ' + font; x.fillText(c.name, 90, y + 30); }
        x.fillStyle = '#CDD193'; x.font = 'italic 800 40px ' + font; x.fillText('#DoingGoodToDoGood', 90, H - 110);
        var a = document.createElement('a'); a.download = 'yfc-impact-pledge.png'; a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
      }
      var img = new Image(); img.onload = function () { finish(img); }; img.onerror = function () { finish(null); }; img.src = 'assets/yfc-logo-white.png';
    });
    $('#pl-share').addEventListener('click', function () {
      var c = current(), text = c.text + (c.name ? ' (' + c.name + ')' : '') + ' #DoingGoodToDoGood';
      var btn = this;
      if (navigator.share) { navigator.share({ title: 'My Impact Pledge', text: text, url: location.href.split('#')[0] + '#pledge' }).catch(function () {}); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { btn.lastChild.textContent = ' Copied to clipboard'; setTimeout(function () { btn.lastChild.textContent = ' Share'; }, 2200); });
    });
  }

  /* ---------- Technology: connected journey layers ---------- */
  var LAYERS = {
    simba: { name: 'One Simba', role: 'Internal ERP and reporting system', rows: [
      ['Purpose', 'Keeps one internal record of operations, from collection to reporting.'],
      ['Users', 'YFC operations, compliance and reporting teams.'],
      ['Inputs', 'Collection information, material movements and processing records.'],
      ['Outputs', 'Documentation, certificates and impact information.'],
      ['Business benefit', 'A consistent, paperless record of what happened to each load.']] },
    fct: { name: 'Full Circle Technology', role: 'Circular programme and ecosystem platform', rows: [
      ['Purpose', 'Connects the organisations and people taking part in a circular programme.'],
      ['Users', 'Clients, programme partners and participants.'],
      ['Inputs', 'Programme set-up, take-back or engagement activity and participation.'],
      ['Outputs', 'Programme management and data visibility for stakeholders.'],
      ['Business benefit', 'Programmes that are easier to run, join and report on.']] },
    gs: { name: 'Green Secure', role: 'Traceability and verification layer', rows: [
      ['Purpose', 'Adds checkpoints and an evidence trail to the journey.'],
      ['Users', 'Producers, brand owners and compliance teams.'],
      ['Inputs', 'Checkpoint records and documentation along the journey.'],
      ['Outputs', 'An evidence trail and support for certificates.'],
      ['Business benefit', 'Confidence that products were handled as agreed, supporting fraud prevention.']] }
  };
  var cjTabs = $$('.cj__row');
  if (cjTabs.length) {
    var cjName = $('#cj-name'), cjRole = $('#cj-role'), cjDl = $('#cj-dl'), cjPanel = $('#cj-panel');
    function setLayer(btn) {
      var L = LAYERS[btn.dataset.layer];
      cjTabs.forEach(function (t) { var on = t === btn; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
      cjName.textContent = L.name; cjRole.textContent = L.role;
      cjDl.innerHTML = L.rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
      cjPanel.setAttribute('aria-labelledby', btn.id);
    }
    cjTabs.forEach(function (t, i) {
      t.addEventListener('click', function () { setLayer(t); });
      t.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (!n) return; e.preventDefault();
        var nx = cjTabs[(i + n + cjTabs.length) % cjTabs.length]; setLayer(nx); nx.focus();
      });
    });
    setLayer($('.cj__row[aria-selected="true"]') || cjTabs[0]);
  }

  /* ---------- Industries: group cards drive one detail panel ---------- */
  var SOL = { 'brand-protection': 'Brand Protection', 'secure-destruction': 'Secure Destruction and Recycling', 'shredding': 'Shredding and Data Destruction', 'hazardous': 'Hazardous and Specialised Waste', 'scrap-metal': 'Scrap and Metal Waste Trading', 'upcycling': 'Upcycling', 'zero-waste': 'Zero Waste Solutions', 'csr': 'CSR and Engagement Initiatives' };
  var INDUSTRIES = {
    fashion: { form: 'Fashion & Lifestyle', icon: 'i-shirt',
      ctx: 'Seasonal collections, returns and unsold stock create volumes of branded goods that must not reappear on the market.',
      products: ['Apparel, footwear and accessories', 'Eyewear', 'Packaging and display materials'],
      risks: ['Grey-market resale of unsold stock', 'Brand damage from improper disposal', 'Proof of destruction for audits'],
      sols: ['brand-protection', 'secure-destruction', 'upcycling', 'csr'],
      recovery: 'Suitable textiles can be reused or upcycled through YFC Re-Nu; other materials are recycled.',
      engage: 'Customer take-back and employee recycling drives.', proof: 'Approved case study to be added.' },
    beauty: { form: 'Beauty & Homecare', icon: 'i-spray',
      ctx: 'Expired, recalled or unsellable products combine brand risk with liquids and pressurised packaging that need careful handling.',
      products: ['Cosmetics and personal care', 'Perfumes and aerosols', 'Homecare products', 'Glass, metal and plastic packaging'],
      risks: ['Resale of expired or recalled products', 'Liquids and aerosols needing specialist handling', 'Compliance documentation'],
      sols: ['brand-protection', 'secure-destruction', 'hazardous', 'csr'],
      recovery: 'Glass, metal and plastic packaging is recovered; liquids go through approved treatment routes.',
      engage: 'Customer and employee recycling programmes.', proof: 'A cosmetics recycling programme with KIKO Milano, 2025.' },
    consumer: { form: 'Consumer & Retail', icon: 'i-cart',
      ctx: 'Returns, damaged goods and packaging build up across stores, warehouses and online fulfilment.',
      products: ['FMCG products and returns', 'Packaging and cardboard', 'Point-of-sale and display materials', 'Electronics'],
      risks: ['Unsellable stock leaking to market', 'Mixed waste reducing recovery', 'Packaging obligations'],
      sols: ['secure-destruction', 'brand-protection', 'zero-waste', 'csr'],
      recovery: 'Packaging and cardboard are recycled; display materials can be upcycled where suitable.',
      engage: 'In-store collection drives and school programmes.', proof: 'Waste for Good with OMO Unilever and GEMS Education; a book collection drive with Sharaf DG.' },
    food: { form: 'Food & Hospitality', icon: 'i-cup',
      ctx: 'Expired or recalled packaged food, refurbishments and daily operations across kitchens, hotels and events.',
      products: ['Packaged food and beverages', 'Glass, cans and packaging', 'Furniture and textiles from refurbishments'],
      risks: ['Recalled products reaching consumers', 'Food and packaging mixed together', 'Guest expectations on sustainability'],
      sols: ['secure-destruction', 'zero-waste', 'upcycling', 'csr'],
      recovery: 'Depackaging separates food from packaging: organic content goes to composting or another approved route and packaging is recovered.',
      engage: 'Staff awareness and guest-facing campaigns.', proof: 'Approved case study to be added.' },
    mobility: { form: 'Mobility', icon: 'i-car',
      ctx: 'Automotive and aviation operations release parts and consumables where metals, plastics and fluids are combined.',
      products: ['Automotive components and heavy equipment parts', 'Aviation and airline items', 'Oils and batteries'],
      risks: ['Branded or serialised parts re-entering the market', 'Fluids and batteries needing specialist handling', 'Traceability for audits'],
      sols: ['brand-protection', 'scrap-metal', 'hazardous', 'secure-destruction'],
      recovery: 'Metals and plastics are segregated and recovered.',
      engage: 'Employee engagement programmes.', proof: 'Approved case study to be added.' },
    technology: { form: 'Technology', icon: 'i-chip',
      ctx: 'Devices and IT equipment carry both sensitive data and valuable materials.',
      products: ['Laptops, phones and servers', 'Storage media', 'Cables, accessories and batteries'],
      risks: ['Data exposure', 'Resale of branded devices', 'Batteries and hazardous components'],
      sols: ['shredding', 'secure-destruction', 'brand-protection', 'hazardous'],
      recovery: 'Metals and components are recovered through certified processing.',
      engage: 'E-waste collection drives.', proof: 'Three-time WEEE Recycling Company of the Year, Middle East Waste & Recycling Awards.' },
    healthcare: { form: 'Healthcare', icon: 'i-medical',
      ctx: 'Medical equipment, expired products and confidential records need secure, documented handling.',
      products: ['Medical equipment', 'Expired pharmaceutical products', 'Records and data-bearing devices', 'Packaging'],
      risks: ['Confidential patient information', 'Expired products re-entering circulation', 'Regulatory documentation'],
      sols: ['shredding', 'secure-destruction', 'hazardous'],
      recovery: 'Metals, plastics and packaging are recovered where suitable.',
      engage: 'Health and environment programmes for schools and staff.', proof: 'Approved case study to be added.' },
    industrial: { form: 'Industrial', icon: 'i-factory',
      ctx: 'Manufacturing and energy operations generate scrap, off-specification products and complex streams.',
      products: ['Ferrous and non-ferrous scrap', 'Industrial equipment', 'Oils and chemicals', 'Off-specification products'],
      risks: ['Mixed streams lowering recovery value', 'Hazardous components', 'Compliance obligations'],
      sols: ['scrap-metal', 'hazardous', 'secure-destruction', 'zero-waste'],
      recovery: 'Metals return to the resource cycle; refuse-derived fuel and other recovery routes where suitable.',
      engage: 'Workforce awareness programmes.', proof: 'Approved case study to be added.' },
    'supply-chain': { form: 'Supply Chain', icon: 'i-truck',
      ctx: 'Warehouses and distributors hold damaged, returned and expired stock on behalf of brands.',
      products: ['Damaged and returned goods', 'Expired inventory', 'Pallets, packaging and stretch film'],
      risks: ['Liability for clients’ branded stock', 'Space taken by unsellable inventory', 'Documentation for brand owners'],
      sols: ['secure-destruction', 'brand-protection', 'zero-waste'],
      recovery: 'Pallets can be repaired or reused; cardboard and plastics are recycled.',
      engage: 'Programmes for warehouse teams.', proof: 'Approved case study to be added.' },
    furniture: { form: 'Furniture & Interiors', icon: 'i-sofa',
      ctx: 'Refurbishments, fit-outs and showroom changes release furniture and materials that still have value.',
      products: ['Furniture and fixtures', 'Wood and metal frames', 'Textiles and upholstery', 'Display materials'],
      risks: ['Bulky items going to disposal', 'Branded fixtures', 'Mixed materials'],
      sols: ['upcycling', 'scrap-metal', 'zero-waste', 'secure-destruction'],
      recovery: 'Reuse, repair or upcycling through YFC Re-Nu; metals and wood are recycled.',
      engage: 'Upcycling workshops for teams.', proof: 'Approved case study to be added.' }
  };
  var indCards = $$('.ind-card');
  if (indCards.length) {
    var box = $('.idetail'), first = true;
    function li(t) { return '<li>' + esc(t) + '</li>'; }
    function pick(card) {
      var k = card.dataset.pick, d = INDUSTRIES[k];
      var name = card.querySelector('b').textContent, inc = card.querySelector('span:last-child').textContent;
      indCards.forEach(function (c) { c.setAttribute('aria-pressed', String(c === card)); });
      $('#id-name').textContent = name; $('#id-inc').textContent = inc; $('#id-ctx').textContent = d.ctx;
      $('#id-ic').innerHTML = '<svg><use href="#' + d.icon + '"/></svg>';
      $('#id-products').innerHTML = d.products.map(li).join('');
      $('#id-risks').innerHTML = d.risks.map(li).join('');
      $('#id-sols').innerHTML = d.sols.map(function (s) { return '<li><a href="solutions.html#' + s + '">' + esc(SOL[s]) + '<svg><use href="#i-arrow"/></svg></a></li>'; }).join('');
      $('#id-recovery').textContent = d.recovery; $('#id-engage').textContent = d.engage; $('#id-proof').textContent = d.proof;
      var cta = $('#id-cta');
      cta.href = enquiryHref('type=solution&industry=' + encodeURIComponent(d.form));
      cta.innerHTML = 'Talk to Our ' + esc(name) + ' Team <svg><use href="#i-arrow"/></svg>';
      box.classList.remove('is-swap'); void box.offsetWidth; box.classList.add('is-swap');
      if (!first) $('#detail').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      first = false;
    }
    indCards.forEach(function (c) { c.addEventListener('click', function () { pick(c); }); });
    pick(indCards[0]);
  }

  /* ---------- Contact: preselect industry from the link ---------- */
  var qInd = new URLSearchParams(location.search).get('industry'), indSel = $('#f-industry');
  if (qInd && indSel) { $$('option', indSel).forEach(function (o) { if (o.textContent === qInd) indSel.value = o.value || o.textContent; }); }

  openFromHash();
})();
