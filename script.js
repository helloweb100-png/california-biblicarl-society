/* =====================================================================
   California Biblical Society Church · Instituto de Formación Ministerial
   «El Códice Iluminado» — JavaScript vanilla (sin librerías ni CDN)

   Principios:
   - El contenido es visible por defecto. Las clases `anim` y `pin` se añaden
     aquí y solo entonces se aplican los estados ocultos y las secciones fijadas.
   - Si ocurre un error inesperado, se retiran `anim` y `pin` y la página
     queda estática pero completa.
   - Un solo bucle requestAnimationFrame lee scrollY y actualiza todo.
   ===================================================================== */

/* Único lugar donde vive el número de WhatsApp: 10 dígitos, sin el 52.
   Vacío = sin botón flotante y sin formulario (se muestra un aviso). */
const WHATSAPP_NUMBER = "";

(function () {
  'use strict';

  /* ---------- Utilidades ---------- */
  var D = document, root = D.documentElement, body = D.body;
  function $(s, c) { return (c || D).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || D).querySelectorAll(s)); }
  function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeIO(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function safe(fn, name) { try { fn(); } catch (e) { if (window.console) console.warn('[init:' + name + ']', e); } }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  function wide() { return window.innerWidth >= 1000; }

  var S = { y: 0, vh: window.innerHeight, vw: window.innerWidth, vel: 0, t: 0, maxScroll: 1 };
  var P = { x: -9999, y: -9999, nx: .5, ny: .5, seen: false };

  root.classList.add('js');
  if (!reduce) { root.classList.add('anim', 'pin'); }

  /* Red de seguridad: ante cualquier error de script se vuelve a modo estático (todo visible). */
  window.addEventListener('error', function () {
    setTimeout(function () {
      root.classList.remove('anim', 'pin', 'lock');
      var l = $('#loader'); if (l) l.style.display = 'none';
      body.classList.remove('loading');
    }, 0);
  });

  /* ---------- WhatsApp ---------- */
  var WA = String(WHATSAPP_NUMBER || '').replace(/\D/g, '');
  var hasWA = WA.length >= 10;
  var DEFAULT_MSG = 'Hola, me gustaría información sobre el Instituto de Formación Ministerial.';
  function waUrl(msg) { return 'https://wa.me/52' + WA.slice(-10) + '?text=' + encodeURIComponent(msg); }

  /* =====================================================================
     1. CARGADOR
     ===================================================================== */
  function initLoader() {
    var loader = $('#loader'), num = $('#loader-num');
    if (!loader) { startSite(); return; }
    var DUR = reduce ? 500 : 1350, t0 = null, finished = false;

    function finish() {
      if (finished) return; finished = true;
      loader.classList.add('is-flash');
      setTimeout(function () {
        loader.classList.add('is-done');
        body.classList.remove('loading');
        root.classList.remove('lock');
        startSite();
        setTimeout(function () { loader.style.display = 'none'; }, reduce ? 450 : 760);
      }, reduce ? 0 : 150);
    }
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = clamp((ts - t0) / DUR);
      if (num) num.textContent = String(Math.round(easeIO(p) * 100)).padStart(3, '0');
      if (p < 1) requestAnimationFrame(step); else finish();
    }
    requestAnimationFrame(step);
    setTimeout(finish, 2000); /* si rAF está pausado (pestaña oculta) */
  }
  function startSite() {
    body.classList.add('hero-go');
    setTimeout(function () { sweep(); }, 300);
  }
  setTimeout(function () { body.classList.add('hero-go'); body.classList.remove('loading'); }, 3000);

  /* =====================================================================
     2. REVELADOS (IntersectionObserver + respaldo por geometría)
     ===================================================================== */
  var pending = new Set($$('[data-reveal],[data-reveal-group]'));
  var io = null;
  function show(el) {
    if (!pending.has(el)) return;
    pending.delete(el);
    el.classList.add('is-in');
    if (io) io.unobserve(el);
  }
  function sweep(margin) {
    var lim = S.vh * (margin || .94);
    pending.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < lim && r.bottom > -40) show(el);
    });
  }
  function initReveal() {
    if (reduce) { pending.forEach(function (el) { el.classList.add('is-in'); }); pending.clear(); return; }
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) show(e.target); });
      }, { threshold: .1, rootMargin: '0px 0px -6% 0px' });
      pending.forEach(function (el) { io.observe(el); });
    }
    var ticking = false;
    function onMove() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { ticking = false; sweep(); });
    }
    window.addEventListener('scroll', onMove, { passive: true });
    window.addEventListener('resize', onMove);
    setTimeout(sweep, 2000);
    setTimeout(function () { sweep(1.5); }, 6000);
  }

  /* =====================================================================
     3. POLVO DE ORO (canvas)
     ===================================================================== */
  var dusts = [];
  function Dust(canvas, opt) {
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;
    var w = 0, h = 0, dpr = 1, parts = [], top = 0, left = 0;
    var d = { canvas: canvas, active: true, visible: true };
    function mk(bokeh) {
      return {
        x: Math.random() * w, y: Math.random() * h, bokeh: bokeh,
        r: bokeh ? 8 + Math.random() * 8 : .6 + Math.random() * 1.8,
        vy: .15 + Math.random() * .45, a: bokeh ? .1 : .45 + Math.random() * .55,
        ph: Math.random() * 6.283, sp: .4 + Math.random() * 1.2, amp: 6 + Math.random() * 18, ox: 0, oy: 0
      };
    }
    function resize() {
      var r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = opt.count || Math.round(clamp(w / 18, 28, 90));
      parts = [];
      for (var i = 0; i < n; i++) parts.push(mk(false));
      for (var j = 0; j < (opt.bokeh === undefined ? 6 : opt.bokeh); j++) parts.push(mk(true));
      if (reduce) draw(0);
    }
    function draw(t) {
      var r = canvas.getBoundingClientRect(); top = r.top; left = r.left;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        if (!reduce) {
          p.y -= p.vy;
          if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
          var px = P.x - left, py = P.y - top;
          var dx = p.x + p.ox - px, dy = p.y + p.oy - py, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > .1 && !p.bokeh) {
            var f = (120 - dist) / 120;
            p.ox += dx / dist * f * 3; p.oy += dy / dist * f * 3;
          }
          p.ox *= .93; p.oy *= .93;
        }
        var x = p.x + Math.sin(t * p.sp + p.ph) * p.amp * .4 + p.ox, y = p.y + p.oy;
        var tw = .55 + .45 * Math.sin(t * 2 * p.sp + p.ph);
        if (p.bokeh) {
          var g = ctx.createRadialGradient(x, y, 0, x, y, p.r);
          g.addColorStop(0, 'hsla(42,85%,62%,' + p.a + ')'); g.addColorStop(1, 'hsla(42,85%,62%,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = 'hsla(42,85%,62%,' + (p.a * tw).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.283); ctx.fill();
        }
      }
    }
    d.draw = draw; d.resize = resize;
    resize();
    window.addEventListener('resize', resize);
    var host = opt.host || canvas;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { d.visible = es[0].isIntersecting; }, { rootMargin: '80px' }).observe(host);
    }
    dusts.push(d);
    return d;
  }
  function initDust() {
    var c1 = $('#chispas'), c2 = $('#polvo');
    if (c1) Dust(c1, { host: $('#inicio') });
    if (c2) Dust(c2, { count: 28, bokeh: 3, host: $('#palabra') });
  }

  /* =====================================================================
     4. HÉROE: marcas del reloj, tilt 3D
     ===================================================================== */
  function initHeroSeal() {
    var ticks = $('#ticks');
    if (ticks) {
      var s = '';
      for (var i = 0; i < 72; i++) {
        var a = i * 5 * Math.PI / 180, long = i % 6 === 0, r1 = long ? 94 : 96.5, r2 = 100;
        s += '<line class="' + (long ? 'l' : '') + '" x1="' + (Math.cos(a) * r1).toFixed(2) + '" y1="' + (Math.sin(a) * r1).toFixed(2) +
          '" x2="' + (Math.cos(a) * r2).toFixed(2) + '" y2="' + (Math.sin(a) * r2).toFixed(2) + '"/>';
      }
      ticks.innerHTML = s;
    }
  }
  var tilt = { el: null, rx: 0, ry: 0 };
  function updateTilt(t) {
    if (!tilt.el || reduce || S.y > S.vh * 1.2) return;
    var trx, try_;
    if (fine && P.seen) { try_ = (P.nx - .5) * 18; trx = -(P.ny - .5) * 18; }
    else { trx = Math.sin(t * .7) * 8; try_ = Math.cos(t * .5) * 8; }
    tilt.rx = lerp(tilt.rx, trx, .06); tilt.ry = lerp(tilt.ry, try_, .06);
    tilt.el.style.setProperty('--rx', tilt.rx.toFixed(2) + 'deg');
    tilt.el.style.setProperty('--ry', tilt.ry.toFixed(2) + 'deg');
  }

  /* =====================================================================
     5. CURSOR PERSONALIZADO + EFECTO MAGNÉTICO
     ===================================================================== */
  var cursor = { dot: null, ring: null, x: 0, y: 0 };
  function initCursor() {
    if (!fine || reduce) return;
    cursor.dot = D.createElement('div'); cursor.dot.className = 'cursor-dot';
    cursor.ring = D.createElement('div'); cursor.ring.className = 'cursor-ring';
    cursor.dot.setAttribute('aria-hidden', 'true'); cursor.ring.setAttribute('aria-hidden', 'true');
    body.appendChild(cursor.ring); body.appendChild(cursor.dot);
    root.classList.add('has-cursor');
    D.addEventListener('mouseover', function (e) {
      var hot = e.target.closest && e.target.closest('a,button,summary,select,input,textarea,label,.panel__btn');
      cursor.ring.classList.toggle('is-hot', !!hot);
    });
    D.addEventListener('mouseleave', function () { body.classList.remove('cursor-on'); });
    D.addEventListener('mouseenter', function () { body.classList.add('cursor-on'); });
  }
  function updateCursor() {
    if (!cursor.dot) return;
    cursor.x = lerp(cursor.x, P.x, .18); cursor.y = lerp(cursor.y, P.y, .18);
    cursor.dot.style.transform = 'translate3d(' + P.x + 'px,' + P.y + 'px,0)';
    cursor.ring.style.transform = 'translate3d(' + cursor.x.toFixed(1) + 'px,' + cursor.y.toFixed(1) + 'px,0)';
  }
  var magnets = [];
  function initMagnetic() {
    if (!fine || reduce) return;
    magnets = $$('[data-magnetic]').map(function (el) { return { el: el, on: false }; });
    var raf = false;
    window.addEventListener('pointermove', function () {
      if (raf) return; raf = true;
      requestAnimationFrame(function () {
        raf = false;
        magnets.forEach(function (m) {
          var r = m.el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > S.vh) { if (m.on) { m.el.style.translate = ''; m.on = false; } return; }
          var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          var dx = P.x - cx, dy = P.y - cy, dist = Math.sqrt(dx * dx + dy * dy);
          var reach = Math.max(r.width, 140) / 2 + 40;
          if (dist < reach) {
            m.el.style.translate = clamp(dx * .22, -8, 8).toFixed(1) + 'px ' + clamp(dy * .3, -8, 8).toFixed(1) + 'px'; m.on = true;
          } else if (m.on) { m.el.style.translate = ''; m.on = false; }
        });
      });
    }, { passive: true });
  }

  /* =====================================================================
     6. ENCABEZADO, MENÚ, NAVEGACIÓN ACTIVA
     ===================================================================== */
  function initHeader() {
    var burger = $('#burger'), menu = $('#menu');
    function setMenu(open) {
      body.classList.toggle('menu-open', open);
      root.classList.toggle('lock', open);
      if (burger) { burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú'); }
      if (menu) menu.setAttribute('aria-hidden', String(!open));
    }
    if (burger) burger.addEventListener('click', function () { setMenu(!body.classList.contains('menu-open')); });
    $$('.menu a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    D.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1180) setMenu(false); });

    var links = $$('.nav a'), map = {};
    links.forEach(function (a) { map[a.getAttribute('href')] = a; });
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) { a.classList.remove('is-active'); });
          var a = map['#' + e.target.id]; if (a) a.classList.add('is-active');
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      ['sello', 'formacion', 'para-ti', 'principios', 'como-empezar', 'preguntas', 'contacto'].forEach(function (id) {
        var s = D.getElementById(id); if (s) obs.observe(s);
      });
    }
  }

  /* =====================================================================
     7. BANDAS (marquee reactivo al scroll)
     ===================================================================== */
  var bands = { tracks: [], els: [], anims: null, rate: 1 };
  function initBands() {
    bands.tracks = $$('.band__track'); bands.els = $$('.band');
  }
  function updateBands() {
    if (reduce || !bands.tracks.length) return;
    var band = $('.bands'); if (!band) return;
    var r = band.getBoundingClientRect();
    if (r.bottom < -200 || r.top > S.vh + 200) return;
    if (!bands.anims || !bands.anims.length) {
      bands.anims = [];
      bands.tracks.forEach(function (t) { if (t.getAnimations) t.getAnimations().forEach(function (a) { bands.anims.push(a); }); });
    }
    var rate = 1 + Math.min(Math.abs(S.vel) * .35, 7);
    if (Math.abs(rate - bands.rate) > .02) {
      bands.rate = rate;
      bands.anims.forEach(function (a) { a.playbackRate = rate; });
    }
    var sk = clamp(S.vel * .5, -8, 8);
    bands.els.forEach(function (b, i) { b.style.setProperty('--sk', (i ? -sk : sk).toFixed(2) + 'deg'); });
  }

  /* =====================================================================
     8. MANIFIESTO (lectura iluminada)
     ===================================================================== */
  var manif = { h: null, words: [], k: -1, ems: [], seal: null, sec: null };
  function initManifesto() {
    manif.sec = $('#manifiesto'); manif.seal = $('#manifesto-seal');
    var h = $('[data-split]'); if (!h) return;
    manif.h = h;
    function splitNode(node, inEm) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/), frag = D.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(D.createTextNode(p)); return; }
            var sp = D.createElement('span'); sp.className = 'w'; sp.textContent = p;
            frag.appendChild(sp); manif.words.push({ el: sp, em: inEm || null });
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName === 'EM') {
          manif.ems.push(n); splitNode(n, n);
        }
      });
    }
    try { splitNode(h, null); } catch (e) { manif.ems.forEach(function (em) { em.classList.add('is-lit'); }); manif.words = []; }
    if (reduce) { manif.words.forEach(function (w) { w.el.classList.add('on'); }); manif.ems.forEach(function (em) { em.classList.add('is-lit'); }); }
  }
  function updateManifesto() {
    if (reduce || !manif.h) return;
    var r = manif.h.getBoundingClientRect(), n = manif.words.length;
    if (r.bottom < -S.vh || r.top > S.vh * 1.2) {
      if (r.bottom < 0 && manif.k !== n + 1) { setWords(n + 1); }
    } else {
      var p = clamp((S.vh * .85 - r.top) / (S.vh * .5 + r.height));
      setWords(Math.floor(p * (n + 1)));
    }
    if (manif.seal && manif.sec) {
      var sr = manif.sec.getBoundingClientRect();
      if (sr.bottom > 0 && sr.top < S.vh) manif.seal.style.setProperty('--rot', (S.y * .04).toFixed(2) + 'deg');
    }
  }
  function setWords(k) {
    if (k === manif.k) return;
    manif.k = k;
    manif.words.forEach(function (w, i) { w.el.classList.toggle('on', i < k); });
    manif.ems.forEach(function (em) {
      var ws = manif.words.filter(function (w) { return w.em === em; });
      var last = ws.length ? manif.words.indexOf(ws[ws.length - 1]) : 0;
      em.classList.toggle('is-lit', k > last);
    });
  }

  /* =====================================================================
     9. LA PALABRA ILUMINA
     ===================================================================== */
  var pal = { sec: null, mask: null, wrap: null, lit: null, mx: 0, my: 0, init: false, d: null };
  function initPalabra() {
    pal.sec = $('#palabra'); pal.mask = $('#palabra-mask'); pal.wrap = $('#verse-wrap');
    pal.lit = $('.verse--lit'); pal.d = dusts.filter(function (d) { return d.canvas.id === 'polvo'; })[0] || null;
  }
  function updatePalabra(t) {
    if (!pal.sec || reduce || !root.classList.contains('pin')) return;
    var r = pal.sec.getBoundingClientRect(), total = r.height - S.vh;
    if (r.bottom < -50 || r.top > S.vh + 50) { if (pal.d) pal.d.active = false; return; }
    if (pal.d) pal.d.active = true;
    var p = clamp(-r.top / Math.max(1, total));
    var open = easeIO(clamp(p / .4));
    pal.mask.style.setProperty('--r', (open * 150).toFixed(1) + '%');
    var grow = clamp((p - .4) / .55);
    var rad = lerp(180, 1800, easeIO(grow));
    var lr = pal.lit.getBoundingClientRect(), tx, ty;
    if (fine && P.seen) { tx = P.x - lr.left; ty = P.y - lr.top; }
    else {
      tx = lr.width * (.5 + .34 * Math.sin(t * .7)); ty = lr.height * (.5 + .38 * Math.sin(t * 1.1 + 1));
    }
    var k = easeIO(clamp((p - .72) / .2));
    tx = lerp(tx, lr.width / 2, k); ty = lerp(ty, lr.height / 2, k);
    if (!pal.init) { pal.mx = tx; pal.my = ty; pal.init = true; }
    pal.mx = lerp(pal.mx, tx, .12); pal.my = lerp(pal.my, ty, .12);
    pal.wrap.style.setProperty('--mx', pal.mx.toFixed(1) + 'px');
    pal.wrap.style.setProperty('--my', pal.my.toFixed(1) + 'px');
    pal.wrap.style.setProperty('--rad', rad.toFixed(1) + 'px');
    pal.sec.classList.toggle('is-lit', p > .8);
  }

  /* =====================================================================
     10. EL SELLO: cámara que recorre el logo
     ===================================================================== */
  var SEL_TARGETS = [
    { fx: .5, fy: .5, s: 1 }, { fx: .5, fy: .56, s: 2.1 }, { fx: .5, fy: .384, s: 3.1 },
    { fx: .28, fy: .5, s: 2.3 }, { fx: .5, fy: .12, s: 1.9 }, { fx: .5, fy: .88, s: 1.9 }
  ];
  var sel = { sec: null, cam: null, fw: null, W: 0, c: { fx: .5, fy: .5, s: 1 }, idx: -1, steps: [], dots: [], hud: null, head: null, hudTxt: '' };
  function initSello() {
    sel.sec = $('#sello'); sel.cam = $('#sello-cam'); sel.fw = $('#sello-fw');
    sel.steps = $$('#sello-steps .step'); sel.dots = $$('#sello-dots li');
    sel.hud = $('#sello-hud'); sel.head = $('#sello-head');
    measureSello();
    if (!reduce) sel.steps.forEach(function (s, i) { s.setAttribute('aria-hidden', i === 0 ? 'false' : 'true'); });
  }
  function measureSello() { if (sel.fw) sel.W = sel.fw.clientWidth; }
  function updateSello() {
    if (!sel.sec || reduce || !root.classList.contains('pin')) return;
    var r = sel.sec.getBoundingClientRect(), total = r.height - S.vh;
    if (r.bottom < -100 || r.top > S.vh + 100) return;
    var p = clamp(-r.top / Math.max(1, total));
    var idx = Math.min(5, Math.floor(p * 6));
    var tg = SEL_TARGETS[idx];
    sel.c.fx += (tg.fx - sel.c.fx) * .09; sel.c.fy += (tg.fy - sel.c.fy) * .09; sel.c.s += (tg.s - sel.c.s) * .09;
    var W = sel.W || sel.fw.clientWidth, s = sel.c.s;
    var tx = W * (.5 - s * sel.c.fx), ty = W * (.5 - s * sel.c.fy);
    sel.cam.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + s.toFixed(4) + ')';
    var txt = 'ZOOM ' + s.toFixed(1) + '×';
    if (txt !== sel.hudTxt && sel.hud) { sel.hud.textContent = txt; sel.hudTxt = txt; }
    if (idx !== sel.idx) {
      sel.idx = idx;
      sel.steps.forEach(function (st, i) { st.classList.toggle('is-on', i === idx); st.setAttribute('aria-hidden', i === idx ? 'false' : 'true'); });
      sel.dots.forEach(function (d, i) { d.classList.toggle('is-on', i === idx); });
      if (sel.head) sel.head.classList.toggle('is-off', idx > 0);
    }
  }

  /* =====================================================================
     11. RUTA DE FORMACIÓN (scroll horizontal fijado / pilas en móvil)
     ===================================================================== */
  var forma = { sec: null, stage: null, track: null, cards: [], bar: null, fill: null, stick: [] };
  function initForma() {
    forma.sec = $('#formacion'); forma.stage = $('#forma-stage'); forma.track = $('#forma-track');
    forma.cards = $$('#forma-cards .card'); forma.fill = $('#forma-fill');
    sizeForma();
  }
  function sizeForma() {
    if (!forma.sec) return;
    if (wide() && root.classList.contains('pin') && !reduce) {
      var dist = Math.max(0, forma.track.scrollWidth - S.vw);
      forma.sec.style.height = Math.round(S.vh + dist * 1.05) + 'px';
    } else {
      forma.sec.style.height = '';
      if (forma.track) forma.track.style.transform = '';
    }
    forma.stick = forma.cards.map(function (c) { return parseFloat(getComputedStyle(c).top) || 0; });
  }
  function updateForma() {
    if (!forma.sec || reduce) return;
    var r = forma.sec.getBoundingClientRect();
    if (r.bottom < -100 || r.top > S.vh + 100) return;
    if (wide() && root.classList.contains('pin')) {
      var total = r.height - S.vh, p = clamp(-r.top / Math.max(1, total));
      var dist = Math.max(0, forma.track.scrollWidth - S.vw), x = -p * dist;
      forma.track.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      if (forma.fill) forma.fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      forma.cards.forEach(function (c) {
        var left = c.offsetLeft + x, nx = (left + c.offsetWidth / 2 - S.vw / 2) * -.12;
        c.style.setProperty('--nx', nx.toFixed(1) + 'px');
      });
    } else {
      forma.cards.forEach(function (c, i) {
        if (i >= forma.cards.length - 1) return;
        var nt = forma.cards[i + 1].getBoundingClientRect().top;
        var h = c.offsetHeight || 1;
        var pr = clamp(1 - (nt - forma.stick[i]) / h);
        c.style.setProperty('--sc', (1 - .06 * pr).toFixed(4));
        c.style.setProperty('--br', (1 - .4 * pr).toFixed(3));
      });
    }
  }

  /* =====================================================================
     12. ¿ES PARA TI? (paneles)
     ===================================================================== */
  function initPanels() {
    var wrap = $('#panels'); if (!wrap) return;
    var panels = $$('.panel', wrap), bar = $('#panels-bar'), cur = 0, hover = false, timer = null;
    function barRestart() {
      if (!bar) return;
      bar.classList.remove('is-run', 'is-paused'); void bar.offsetWidth;
      if (wide() && !reduce) bar.classList.add('is-run');
    }
    function open(i) {
      panels.forEach(function (p, j) {
        var on = i === j; p.classList.toggle('is-open', on);
        var b = $('.panel__btn', p); if (b) b.setAttribute('aria-expanded', String(on));
      });
      cur = i; barRestart();
    }
    panels.forEach(function (p, i) {
      var btn = $('.panel__btn', p);
      btn.addEventListener('click', function () {
        if (wide()) open(i); else open(p.classList.contains('is-open') ? -1 : i);
      });
      p.addEventListener('mouseenter', function () { hover = true; if (bar) bar.classList.add('is-paused'); if (wide() && fine && cur !== i) open(i); if (bar) bar.classList.add('is-paused'); });
      p.addEventListener('mouseleave', function () { hover = false; barRestart(); });
      p.addEventListener('focusin', function () { if (wide() && cur !== i) open(i); });
    });
    if (!reduce) {
      timer = setInterval(function () {
        if (hover || !wide()) return;
        var r = wrap.getBoundingClientRect();
        if (r.bottom < 0 || r.top > S.vh) return;
        open((cur + 1) % panels.length);
      }, 5000);
    }
    barRestart();
    window.addEventListener('resize', function () { if (!wide() && bar) bar.classList.remove('is-run'); });
    $$('[data-profile]').forEach(function (a) {
      a.addEventListener('click', function () {
        var sel2 = $('#f-perfil'); if (sel2) sel2.value = a.getAttribute('data-profile') || '';
      });
    });
  }

  /* =====================================================================
     13. PRINCIPIOS: foco, inclinación 3D y palabras rotativas
     ===================================================================== */
  function initBento() {
    $$('.cell__in').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'touch') return;
        var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); c.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        if (!reduce && fine) { c.style.setProperty('--rx', ((.5 - py) * 7).toFixed(2) + 'deg'); c.style.setProperty('--ry', ((px - .5) * 7).toFixed(2) + 'deg'); }
      });
      c.addEventListener('pointerleave', function () { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
    });
    var rot = $('#rot');
    if (rot && !reduce) {
      var items = $$('span', rot), i = 0;
      setInterval(function () {
        var rr = rot.getBoundingClientRect(); if (rr.bottom < 0 || rr.top > S.vh) return;
        var prev = items[i]; prev.classList.remove('is-on'); prev.classList.add('is-out');
        i = (i + 1) % items.length;
        var nx = items[i]; nx.classList.remove('is-out'); nx.classList.add('is-on');
        setTimeout(function () { prev.classList.remove('is-out'); }, 900);
      }, 3200);
    }
  }

  /* =====================================================================
     14. CÓMO EMPEZAR: vid que se dibuja con el scroll
     ===================================================================== */
  var vine = { tl: null, svg: null, base: null, draw: null, nodes: null, light: null, glow: null, len: 0, nodeLen: [], nodeEls: [], built: false };
  function initVine() {
    vine.tl = $('#tl'); vine.svg = $('#vine'); vine.base = $('#vine-base'); vine.draw = $('#vine-draw');
    vine.nodes = $('#vine-nodes'); vine.light = $('#vine-light'); vine.glow = $('#vine-glow');
    buildVine();
  }
  function buildVine() {
    if (!vine.tl || !vine.svg) return;
    var W = vine.svg.clientWidth || (wide() ? 120 : 48), H = vine.tl.offsetHeight;
    if (!H) return;
    vine.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var cards = $$('.tl__card', vine.tl);
    var ys = cards.map(function (c) { return c.offsetTop + c.offsetHeight / 2; });
    var xs = ys.map(function (_, i) { return wide() ? (i % 2 ? W * .74 : W * .26) : (i % 2 ? W * .7 : W * .3); });
    var pts = [{ x: W / 2, y: 0 }].concat(ys.map(function (y, i) { return { x: xs[i], y: y }; })).concat([{ x: W / 2, y: H }]);
    var d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], dy = (b.y - a.y) * .5;
      d += ' C' + a.x.toFixed(1) + ' ' + (a.y + dy).toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + (b.y - dy).toFixed(1) + ' ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
    }
    vine.base.setAttribute('d', d); vine.draw.setAttribute('d', d);
    vine.len = vine.draw.getTotalLength();
    vine.draw.style.strokeDasharray = vine.len; vine.draw.style.strokeDashoffset = vine.len;
    /* nodos */
    var html = '';
    ys.forEach(function (y, i) { html += '<circle class="vnode" cx="' + xs[i].toFixed(1) + '" cy="' + y.toFixed(1) + '" r="9"/>'; });
    vine.nodes.innerHTML = html;
    vine.nodeEls = $$('.vnode', vine.nodes);
    vine.nodeLen = ys.map(function (y) {
      var lo = 0, hi = vine.len;
      for (var k = 0; k < 18; k++) { var mid = (lo + hi) / 2; if (vine.draw.getPointAtLength(mid).y < y) lo = mid; else hi = mid; }
      return lo;
    });
    vine.built = true;
    if (reduce) { vine.draw.style.strokeDashoffset = 0; vine.nodeEls.forEach(function (n) { n.classList.add('on'); }); vine.light.style.display = 'none'; vine.glow.style.display = 'none'; }
  }
  function updateVine() {
    if (!vine.built || reduce) return;
    var r = vine.tl.getBoundingClientRect();
    if (r.bottom < -200 || r.top > S.vh + 200) return;
    var p = clamp((S.vh * .6 - r.top) / Math.max(1, r.height));
    var L = p * vine.len, pt = vine.draw.getPointAtLength(L);
    vine.draw.style.strokeDashoffset = (vine.len - L).toFixed(1);
    vine.light.setAttribute('cx', pt.x.toFixed(1)); vine.light.setAttribute('cy', pt.y.toFixed(1));
    vine.glow.setAttribute('cx', pt.x.toFixed(1)); vine.glow.setAttribute('cy', pt.y.toFixed(1));
    vine.nodeEls.forEach(function (n, i) { n.classList.toggle('on', L >= vine.nodeLen[i] - 2); });
  }

  /* =====================================================================
     15. PREGUNTAS (details animado)
     ===================================================================== */
  function initFaq() {
    var all = $$('.qa');
    function closeQ(d) {
      d.classList.remove('is-open');
      setTimeout(function () { if (!d.classList.contains('is-open')) d.open = false; }, reduce ? 0 : 600);
    }
    function openQ(d) {
      d.open = true;
      requestAnimationFrame(function () { requestAnimationFrame(function () { d.classList.add('is-open'); }); });
    }
    all.forEach(function (d) {
      var s = $('summary', d);
      s.addEventListener('click', function (e) {
        e.preventDefault();
        if (d.open && d.classList.contains('is-open')) closeQ(d);
        else { all.forEach(function (o) { if (o !== d && o.open) closeQ(o); }); openQ(d); }
      });
    });
  }

  /* =====================================================================
     16. CONTACTO / WHATSAPP
     ===================================================================== */
  var PERFIL = {
    'Siento un llamado': 'Siento un llamado al ministerio',
    'Ya sirvo y quiero más fundamento': 'Ya sirvo en la iglesia y quiero más fundamento bíblico',
    'Lidero un grupo o ministerio': 'Lidero un grupo o ministerio',
    'Quiero profundizar en la Biblia': 'Quiero profundizar en la Biblia',
    'Otra razón': 'Tengo otra razón para escribirles'
  };
  function initContact() {
    var form = $('#form-contacto'), pending = $('#contact-pending');
    if (!hasWA) {
      if (form) form.hidden = true;
      if (pending) pending.hidden = false;
      $$('[data-wa]').forEach(function (a) { a.setAttribute('href', '#contacto'); });
      return;
    }
    if (form) form.hidden = false;
    if (pending) pending.hidden = true;
    $$('[data-wa]').forEach(function (a) {
      a.setAttribute('href', waUrl(a.getAttribute('data-msg') || DEFAULT_MSG));
      a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener');
    });
    /* Botón flotante */
    var fl = D.createElement('a');
    fl.className = 'wa-float'; fl.href = waUrl(DEFAULT_MSG); fl.target = '_blank'; fl.rel = 'noopener';
    fl.setAttribute('aria-label', 'Escribirnos por WhatsApp');
    fl.innerHTML = '<span class="wa-float__label">¿Hablamos?</span><svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16.04 3C8.84 3 3 8.8 3 15.96c0 2.28.6 4.5 1.74 6.46L3 29l6.76-1.7a13.1 13.1 0 0 0 6.28 1.6C23.2 28.9 29 23.1 29 15.96 29 8.8 23.2 3 16.04 3zm0 23.7c-1.96 0-3.88-.52-5.56-1.5l-.4-.24-4.02 1.02 1.08-3.9-.26-.4a10.6 10.6 0 0 1-1.64-5.7c0-5.9 4.82-10.7 10.8-10.7 5.9 0 10.7 4.8 10.7 10.7 0 5.9-4.8 10.72-10.7 10.72zm5.9-8c-.32-.16-1.9-.94-2.2-1.04-.3-.1-.5-.16-.72.16-.2.32-.84 1.04-1.02 1.26-.2.2-.38.24-.7.08-.32-.16-1.36-.5-2.58-1.6-.96-.84-1.6-1.9-1.8-2.2-.18-.32 0-.5.14-.66.14-.14.32-.38.48-.56.16-.2.2-.32.32-.54.1-.2.06-.4-.02-.56-.08-.16-.72-1.74-1-2.38-.26-.62-.52-.54-.72-.54h-.6c-.2 0-.56.08-.84.4-.3.32-1.12 1.1-1.12 2.66 0 1.58 1.14 3.1 1.3 3.3.16.2 2.24 3.4 5.4 4.76.76.32 1.34.52 1.8.66.76.24 1.44.2 2 .12.6-.1 1.9-.78 2.16-1.52.28-.76.28-1.4.2-1.52-.08-.14-.3-.22-.62-.38z"/></svg>';
    body.appendChild(fl); body.classList.add('has-wa');
    function wf() { fl.classList.toggle('is-on', S.y > 300); }
    window.addEventListener('scroll', wf, { passive: true }); wf();

    /* Formulario */
    var nombre = $('#f-nombre'), perfil = $('#f-perfil'), msg = $('#f-mensaje'), err = $('#e-nombre');
    nombre.addEventListener('input', function () { nombre.removeAttribute('aria-invalid'); err.textContent = ''; });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = nombre.value.trim();
      if (!n) {
        nombre.setAttribute('aria-invalid', 'true'); err.textContent = 'Por favor escribe tu nombre para que sepamos cómo llamarte.'; nombre.focus(); return;
      }
      var txt = 'Hola, soy ' + n + '. ';
      if (perfil.value) txt += (PERFIL[perfil.value] || perfil.value) + '. ';
      txt += 'Me gustaría información sobre el Instituto de Formación Ministerial de California Biblical Society Church.';
      if (msg.value.trim()) txt += ' ' + msg.value.trim();
      window.open(waUrl(txt), '_blank', 'noopener');
    });
  }

  /* =====================================================================
     17. PIE, VOLVER ARRIBA, PROGRESO
     ===================================================================== */
  var misc = { bar: null, header: null, totop: null, arc: null, foot: null, giant: null };
  function initMisc() {
    misc.bar = $('#progress-bar'); misc.header = $('#site-header'); misc.totop = $('#totop'); misc.arc = $('#totop-arc');
    misc.foot = $('#foot'); misc.giant = $('#foot-giant');
    if (misc.totop) misc.totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
  }
  function updateMisc() {
    var p = clamp(S.y / S.maxScroll);
    if (misc.bar) misc.bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (misc.header) misc.header.classList.toggle('is-glass', S.y > 40);
    if (misc.totop) {
      misc.totop.classList.toggle('is-on', S.y > 600);
      if (misc.arc) misc.arc.style.strokeDashoffset = (132 * (1 - p)).toFixed(1);
    }
    if (misc.giant && !reduce) {
      var r = misc.foot.getBoundingClientRect();
      if (r.top < S.vh) misc.giant.style.setProperty('--fy', (clamp(1 - (S.vh - r.top) / (r.height + 200)) * 60).toFixed(1) + 'px');
    }
  }

  /* Parallax del héroe */
  var heroEl = { stage: null, text: null };
  function updateHero() {
    if (reduce || !heroEl.stage) return;
    if (S.y > S.vh * 1.3) return;
    var p = clamp(S.y / S.vh);
    heroEl.stage.style.transform = 'translate3d(0,' + (S.y * .2).toFixed(1) + 'px,0)';
    heroEl.text.style.opacity = String(clamp(1 - p * 1.25));
    heroEl.text.style.transform = 'translate3d(0,' + (S.y * .06).toFixed(1) + 'px,0) scale(' + (1 - .04 * p).toFixed(4) + ')';
  }

  /* =====================================================================
     18. BUCLE PRINCIPAL
     ===================================================================== */
  function measure() {
    S.vh = window.innerHeight; S.vw = window.innerWidth;
    S.maxScroll = Math.max(1, root.scrollHeight - S.vh);
  }
  function frame(ts) {
    var t = ts / 1000;
    var y = window.pageYOffset || root.scrollTop || 0;
    S.vel = S.vel * .85 + (y - S.y) * .15; S.y = y; S.t = t;
    if (Math.abs(S.vel) < .01) S.vel = 0;
    safe(function () { updateMisc(); }, 'misc');
    safe(function () { updateHero(); updateTilt(t); }, 'hero');
    safe(function () { updateBands(); }, 'bands');
    safe(function () { updateManifesto(); }, 'manifesto');
    safe(function () { updatePalabra(t); }, 'palabra');
    safe(function () { updateSello(); }, 'sello');
    safe(function () { updateForma(); }, 'forma');
    safe(function () { updateVine(); }, 'vine');
    safe(function () { updateCursor(); }, 'cursor');
    if (!reduce && !D.hidden) {
      for (var i = 0; i < dusts.length; i++) {
        var d = dusts[i];
        if (d.visible && d.active !== false) d.draw(t);
      }
    }
    requestAnimationFrame(frame);
  }

  /* =====================================================================
     ARRANQUE
     ===================================================================== */
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    P.x = e.clientX; P.y = e.clientY; P.nx = e.clientX / S.vw; P.ny = e.clientY / S.vh; P.seen = true;
    if (!body.classList.contains('cursor-on')) body.classList.add('cursor-on');
  }, { passive: true });

  var rt = null;
  function onResize() {
    measure(); measureSello(); sizeForma(); buildVine();
  }
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(onResize, 120); });
  window.addEventListener('load', function () { setTimeout(function () { measure(); measureSello(); sizeForma(); buildVine(); }, 100); });
  if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { onResize(); });

  safe(measure, 'measure');
  heroEl.stage = $('.hero__seal .seal-stage'); heroEl.text = $('#hero-text'); tilt.el = $('#seal-tilt');
  safe(initHeroSeal, 'heroSeal');
  safe(initReveal, 'reveal');
  safe(initDust, 'dust');
  safe(initCursor, 'cursor');
  safe(initMagnetic, 'magnetic');
  safe(initHeader, 'header');
  safe(initBands, 'bands');
  safe(initManifesto, 'manifesto');
  safe(initPalabra, 'palabra');
  safe(initSello, 'sello');
  safe(initForma, 'forma');
  safe(initPanels, 'panels');
  safe(initBento, 'bento');
  safe(initVine, 'vine');
  safe(initFaq, 'faq');
  safe(initContact, 'contact');
  safe(initMisc, 'misc');
  safe(initLoader, 'loader');
  requestAnimationFrame(frame);
})();
