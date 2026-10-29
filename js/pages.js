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

  /* ---------- Shared tab behaviour: click and arrow keys ---------- */
  function tabs(btns, set) {
    btns.forEach(function (t, i) {
      t.addEventListener('click', function () { set(t); });
      t.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (!n) return; e.preventDefault();
        var nx = btns[(i + n + btns.length) % btns.length]; set(nx); nx.focus();
      });
    });
  }
  function select(btns, btn) { btns.forEach(function (b) { var on = b === btn; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; }); }
  function swap(el) { el.classList.remove('is-swap'); void el.offsetWidth; el.classList.add('is-swap'); }
  function links(list) { return list.map(function (l) { return '<li><a href="' + l[0] + '">' + esc(l[1]) + '<svg><use href="#i-arrow"/></svg></a></li>'; }).join(''); }
  function solLinks(keys) { return keys.map(function (s) { return ['solutions.html#' + s, SOL[s]]; }); }
  var DOC_LINK = ['technology.html#receive', 'How We Document Outcomes'];

  /* ---------- Technology: questions the systems answer ---------- */
  var QA = {
    what: { sys: ['simba', 'gs'], a: 'Each job is recorded from collection to processing, so you can see when your products were collected, received and processed, and how.', rec: 'Collection and processing records, and a certificate where it applies.' },
    agreed: { sys: ['gs'], a: 'Checkpoints along the journey build an evidence trail showing that products were handled as agreed, supporting brand protection and fraud prevention.', rec: 'An evidence trail that supports your certificate.' },
    where: { sys: ['simba', 'gs'], a: 'Material movements are recorded, so the pathway each material followed (recycling, recovery, upcycling or another suitable route) can be documented.', rec: 'Material pathway and mass balance information.' },
    much: { sys: ['simba'], a: 'Quantities received and recovered are brought together, so outcomes are reported with a clear unit, period, boundary and method.', rec: 'Mass balance information and reporting.' },
    prog: { sys: ['fct'], a: 'Programme set-up, participation and activity sit in one place for clients, partners and participants, so a take-back or engagement programme is easier to run, join and report on.', rec: 'Programme and participation information.' },
    good: { sys: ['simba', 'fct'], a: 'Impact information connects responsible action to the environmental, educational and community initiatives it helps support.', rec: 'Impact information for your sustainability and ESG reporting.' }
  };
  var qaBtns = $$('.qa__q');
  if (qaBtns.length) {
    var qaPanel = $('#qa-panel'), qaSys = $$('.qa__sys li');
    var setQ = function (btn) {
      var d = QA[btn.dataset.q];
      select(qaBtns, btn);
      qaSys.forEach(function (li) { li.classList.toggle('is-on', d.sys.indexOf(li.dataset.sys) > -1); });
      $('#qa-a').textContent = d.a; $('#qa-rec').textContent = d.rec;
      qaPanel.setAttribute('aria-labelledby', btn.id); swap(qaPanel);
    };
    tabs(qaBtns, setQ); setQ(qaBtns[0]);
  }

  /* ---------- Technology: follow one consignment ---------- */
  var TRIP = [
    { h: 'Request and Assessment', p: 'You tell us what needs to be managed. We review the products, their condition and any requirements, then agree the route and the documentation you need.', rec: 'Job details, product information and agreed requirements.', sys: 'One Simba' },
    { h: 'Collection', p: 'The products are collected from your site and transported to a YFC facility.', rec: 'Collection details and what was collected.', sys: 'One Simba and Green Secure' },
    { h: 'Receiving', p: 'The consignment is received at the facility and checked against what was collected.', rec: 'Quantities received and a checkpoint on arrival.', sys: 'One Simba and Green Secure' },
    { h: 'Secure Processing', p: 'Products are debranded or destroyed as agreed, then segregated by material.', rec: 'Processing records and checkpoints that add to the evidence trail.', sys: 'Green Secure and One Simba' },
    { h: 'Recovery', p: 'Each material follows the most suitable available pathway: recycling, recovery, upcycling or another approved route.', rec: 'Material movements and the pathway each material followed.', sys: 'One Simba' },
    { h: 'Certificate and Reporting', p: 'Outcomes are documented and shared with you, ready for audits, leadership updates and sustainability reporting.', rec: 'Certificate, mass balance information and reporting.', sys: 'One Simba and Green Secure' }
  ];
  var tripBtns = $$('.trip__steps button');
  if (tripBtns.length) {
    var trip = $('.trip'), tPanel = $('#trip-panel'), playBtn = $('[data-trip-play]'), timer = null, cur = 0;
    var setStep = function (i) {
      cur = i; var d = TRIP[i];
      select(tripBtns, tripBtns[i]);
      tripBtns.forEach(function (b, j) { b.parentNode.classList.toggle('is-done', j <= i); });
      trip.style.setProperty('--p', i / (TRIP.length - 1));
      $('#trip-h').textContent = d.h; $('#trip-p').textContent = d.p; $('#trip-rec').textContent = d.rec; $('#trip-sys').textContent = d.sys;
      $('#trip-count').textContent = 'Step ' + (i + 1) + ' of ' + TRIP.length;
      tPanel.setAttribute('aria-labelledby', tripBtns[i].id); swap(tPanel);
    };
    var stop = function () {
      clearInterval(timer); timer = null; trip.classList.remove('is-playing');
      playBtn.setAttribute('aria-pressed', 'false'); playBtn.querySelector('span').textContent = cur === TRIP.length - 1 ? 'Play Again' : 'Play the Journey';
    };
    var play = function () {
      if (cur === TRIP.length - 1) setStep(0);
      trip.classList.add('is-playing'); playBtn.setAttribute('aria-pressed', 'true'); playBtn.querySelector('span').textContent = 'Pause';
      timer = setInterval(function () { setStep(cur + 1); if (cur === TRIP.length - 1) stop(); }, 2600);
    };
    playBtn.addEventListener('click', function () { if (timer) stop(); else play(); });
    tabs(tripBtns, function (b) { if (timer) stop(); setStep(+b.dataset.step); });
    setStep(0);
    // play once, the first time the journey scrolls into view
    if (!reduce && 'IntersectionObserver' in window) {
      var tio = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { tio.disconnect(); if (cur === 0 && !timer) play(); } }, { threshold: 0.6 });
      tio.observe(trip);
    }
  }

  /* ---------- Technology: sample documents ---------- */
  var docTabs = $$('.docs__tab');
  if (docTabs.length) {
    var papers = $$('.paper'), stage = $('#docs-stage'), order = docTabs.map(function (t) { return t.dataset.doc; });
    var setDoc = function (btn) {
      var i = order.indexOf(btn.dataset.doc), rot = order.slice(i).concat(order.slice(0, i));
      select(docTabs, btn);
      papers.forEach(function (p) { var pos = rot.indexOf(p.dataset.paper); p.dataset.pos = pos; p.setAttribute('aria-hidden', String(pos !== 0)); });
      stage.setAttribute('aria-labelledby', btn.id);
    };
    tabs(docTabs, setDoc);
    papers.forEach(function (p) { p.addEventListener('click', function () { if (p.dataset.pos !== '0') setDoc($('.docs__tab[data-doc="' + p.dataset.paper + '"]')); }); });
    setDoc(docTabs[0]);
  }

  /* ---------- Industries: shared challenges ---------- */
  var ALL_IND = ['fashion', 'beauty', 'consumer', 'food', 'mobility', 'technology', 'healthcare', 'industrial', 'supply-chain', 'furniture'];
  var CH = {
    stock: { h: 'Expired, Damaged or Recalled Stock', p: 'Products that can no longer be sold still carry your name. They need to leave the market for good, with proof that they did.', inds: ['fashion', 'beauty', 'consumer', 'food', 'healthcare', 'supply-chain'], sols: ['brand-protection', 'secure-destruction'] },
    resale: { h: 'Unauthorised Resale', p: 'Unsold, returned or obsolete branded goods can reappear in grey markets if they are not handled securely.', inds: ['fashion', 'beauty', 'consumer', 'mobility', 'technology', 'supply-chain'], sols: ['brand-protection', 'secure-destruction'] },
    data: { h: 'Confidential Data and Records', p: 'Devices, storage media and records can hold sensitive information that must be destroyed securely before materials are recovered.', inds: ['technology', 'healthcare', 'consumer'], sols: ['shredding', 'secure-destruction'] },
    mixed: { h: 'Mixed Packaging and Materials', p: 'Mixed materials lose recovery value unless they are separated and sent to the right pathway.', inds: ['consumer', 'food', 'beauty', 'industrial', 'supply-chain', 'furniture'], sols: ['zero-waste', 'secure-destruction', 'upcycling'] },
    special: { h: 'Liquids, Batteries and Specialist Items', p: 'Aerosols, fluids, batteries and hazardous components need specialist handling and approved routes.', inds: ['beauty', 'mobility', 'technology', 'healthcare', 'industrial'], sols: ['hazardous'] },
    report: { h: 'Reporting and Audit Expectations', p: 'Brand owners, auditors and sustainability teams increasingly expect documented outcomes, not just a collection receipt.', inds: ALL_IND, sols: ['secure-destruction', 'zero-waste'], doc: true }
  };
  var chBtns = $$('.chx__c');
  if (chBtns.length) {
    var chPanel = $('#chx-panel'), chInds = $$('#chx-inds button');
    var setCh = function (btn) {
      var d = CH[btn.dataset.ch], l = solLinks(d.sols);
      if (d.doc) l.push(DOC_LINK);
      select(chBtns, btn);
      $('#chx-h').textContent = d.h; $('#chx-p').textContent = d.p; $('#chx-sols').innerHTML = links(l);
      chInds.forEach(function (b) { b.classList.toggle('is-on', d.inds.indexOf(b.dataset.goto) > -1); });
      chPanel.setAttribute('aria-labelledby', btn.id); swap(chPanel);
    };
    tabs(chBtns, setCh); setCh(chBtns[0]);
  }
  // Buttons that open an industry in the detail panel
  $$('[data-goto]').forEach(function (b) {
    b.addEventListener('click', function () { var c = $('.ind-card[data-pick="' + b.dataset.goto + '"]'); if (c) c.click(); });
  });

  /* ---------- Industries: find your pathway ---------- */
  var PF_WHAT = {
    stock: { sols: ['brand-protection', 'secure-destruction'], p: 'Products that can no longer be sold are removed from the market for good, then segregated so materials can be recovered.' },
    unsold: { sols: ['brand-protection', 'secure-destruction', 'upcycling'], p: 'Unsold and returned goods are debranded or securely destroyed, and suitable items or materials can be upcycled.' },
    it: { sols: ['shredding', 'secure-destruction', 'hazardous'], p: 'Devices and storage media are destroyed securely to protect data, then metals and components are recovered.' },
    records: { sols: ['shredding'], p: 'Documents and records are shredded securely, then the paper is recycled.' },
    packaging: { sols: ['zero-waste', 'secure-destruction'], p: 'Mixed packaging is segregated by material so each stream can follow the most suitable pathway.' },
    scrap: { sols: ['scrap-metal', 'hazardous'], p: 'Ferrous and non-ferrous metals are collected, segregated and returned to the resource cycle.' },
    furniture: { sols: ['upcycling', 'scrap-metal', 'zero-waste'], p: 'Furniture and fixtures are reused, repaired or upcycled where suitable, and wood and metals are recycled.' },
    special: { sols: ['hazardous', 'secure-destruction'], p: 'Liquids, aerosols and batteries are handled through specialist, approved recovery or disposal routes.' }
  };
  var PF_WHY = {
    brand: 'Items can be debranded or securely destroyed so they cannot re-enter the market.',
    recovery: 'We look for the route that keeps the most value in use: reuse, recycling, upcycling or recovery.',
    proof: 'You receive a certificate, mass balance information and reporting where they apply.',
    people: 'An engagement programme can bring employees, customers or students into the journey.'
  };
  var pf = $('.pf__form');
  if (pf) {
    var pfVal = function (n) { var c = pf.querySelector('input[name="' + n + '"]:checked'); return c ? c.value : null; };
    var pathway = function () {
      var w = pfVal('pf-what'), y = pfVal('pf-why'), W = PF_WHAT[w], list = W.sols.slice(), note = PF_WHY[y];
      if (y === 'brand') {
        var lead = list.indexOf('brand-protection') > -1 ? 'brand-protection' : list.indexOf('shredding') > -1 ? 'shredding' : 'secure-destruction';
        list = [lead].concat(list.filter(function (s) { return s !== lead; }));
        if (w === 'records') note = 'Nothing readable is left, so the information cannot be recovered or misused.';
      }
      if (y === 'recovery' && list.indexOf('zero-waste') < 0) list.push('zero-waste');
      if (y === 'people') list.push('csr');
      list = list.slice(0, 4);
      var l = solLinks(list);
      if (y === 'proof') l.push(DOC_LINK);
      $('#pf-h').textContent = SOL[list[0]];
      $('#pf-p').textContent = W.p + ' ' + note;
      $('#pf-sols').innerHTML = links(l);
      $('#pf-cta').href = enquiryHref('type=solution');
      swap($('.pf__out'));
    };
    pf.addEventListener('change', pathway); pathway();
  }

  /* ---------- Contact: preselect industry from the link ---------- */
  var qInd = new URLSearchParams(location.search).get('industry'), indSel = $('#f-industry');
  if (qInd && indSel) { $$('option', indSel).forEach(function (o) { if (o.textContent === qInd) indSel.value = o.value || o.textContent; }); }

  openFromHash();
})();
