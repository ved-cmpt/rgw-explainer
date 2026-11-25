/* Ridge gap waveguides, explained.
   Plain JavaScript, no dependencies. Every diagram is drawn here with SVG or canvas.
   Numbers quoted from the thesis are kept in the data tables below so they are easy to audit. */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ helpers */
  var SVGNS = "http://www.w3.org/2000/svg";
  var MINUS = "−";
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmt(v, d) {
    var s = Number(v).toFixed(d === undefined ? 1 : d);
    return s.replace("-", MINUS);
  }
  function trim(v, d) { return String(parseFloat(Number(v).toFixed(d === undefined ? 2 : d))).replace("-", MINUS); }
  function svg(tag, attrs, parent) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]);
    });
    if (parent) parent.appendChild(el);
    return el;
  }
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") el.textContent = attrs[k];
      else if (k === "html") el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{6})/i.exec(hex || "");
    if (!m) return [128, 128, 128];
    var n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  var motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  function reducedMotion() { return !!motionQuery.matches; }
  var narrowQuery = window.matchMedia ? window.matchMedia("(max-width: 640px)") : { matches: false };
  function onNarrow(build) {       // (re)build a figure with a layout that suits the screen width
    build(!!narrowQuery.matches);
    var fn = function () { safe("rebuild", function () { build(!!narrowQuery.matches); }); };
    if (narrowQuery.addEventListener) narrowQuery.addEventListener("change", fn);
    else if (narrowQuery.addListener) narrowQuery.addListener(fn);
  }
  var themeListeners = [];
  function onTheme(fn) { themeListeners.push(fn); }
  function safe(name, fn) {
    try { fn(); } catch (err) { if (window.console) console.error("[" + name + "]", err); }
  }

  /* ------------------------------------------------------------------ theme toggle */
  function initTheme() {
    var btn = $("#theme-btn");
    var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    function current() {
      var t = document.documentElement.getAttribute("data-theme");
      if (t === "light" || t === "dark") return t;
      return mq && mq.matches ? "dark" : "light";
    }
    function announce() {
      var t = current();
      btn.setAttribute("aria-label", "Switch to " + (t === "dark" ? "light" : "dark") + " mode");
      themeListeners.forEach(function (fn) { safe("theme", fn); });
    }
    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("rgw-theme", next); } catch (e) {}
      announce();
    });
    if (mq) {
      var handler = function () { announce(); };
      if (mq.addEventListener) mq.addEventListener("change", handler); else if (mq.addListener) mq.addListener(handler);
    }
    announce();
  }

  /* ------------------------------------------------------------------ tooltip (glossary terms and chart bars) */
  var tip = { el: null, owner: null, timer: 0 };
  function showTip(owner, html) {
    var el = tip.el;
    clearTimeout(tip.timer);
    if (tip.owner && tip.owner !== owner) tip.owner.removeAttribute("aria-describedby");
    tip.owner = owner;
    el.innerHTML = html;
    el.hidden = false;
    owner.setAttribute("aria-describedby", "tip");
    var r = owner.getBoundingClientRect();
    var tw = el.offsetWidth, th = el.offsetHeight;
    var vw = document.documentElement.clientWidth;
    var left = clamp(r.left + r.width / 2 - tw / 2, 10, vw - tw - 10);
    var top = r.bottom + 8;
    if (top + th > window.innerHeight - 8 && r.top - th - 8 > 0) top = r.top - th - 8;
    el.style.left = (left + window.scrollX) + "px";
    el.style.top = (top + window.scrollY) + "px";
  }
  function hideTip(delay) {
    clearTimeout(tip.timer);
    function close() {
      if (tip.owner) tip.owner.removeAttribute("aria-describedby");
      tip.owner = null;
      tip.el.hidden = true;
    }
    if (delay) tip.timer = setTimeout(close, delay); else close();
  }
  function initTips() {
    tip.el = $("#tip");
    tip.el.addEventListener("mouseenter", function () { clearTimeout(tip.timer); });
    tip.el.addEventListener("mouseleave", function () { hideTip(120); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") hideTip(); });
    document.addEventListener("click", function (e) {
      if (tip.owner && !tip.el.contains(e.target) && !tip.owner.contains(e.target)) hideTip();
    });
    window.addEventListener("resize", function () { hideTip(); });

    $$(".term").forEach(function (a) {
      var id = (a.getAttribute("href") || "").slice(1);
      var entry = document.getElementById(id);
      if (!entry) return;
      var title = $("dt", entry).textContent;
      var body = $("dd", entry).innerHTML;
      var html = "<strong>" + title + "</strong>" + body +
        '<br><a href="#' + id + '">Open the glossary</a>';
      a.addEventListener("mouseenter", function () { showTip(a, html); });
      a.addEventListener("mouseleave", function () { hideTip(180); });
      a.addEventListener("focus", function () { showTip(a, html); });
      a.addEventListener("blur", function () { hideTip(180); });
      a.addEventListener("click", function (e) {
        // First tap/click shows the definition; the link inside the tooltip goes to the glossary.
        e.preventDefault();
        if (tip.owner === a && !tip.el.hidden && e.detail === 0) { hideTip(); return; }
        showTip(a, html);
      });
    });
  }

  /* ------------------------------------------------------------------ progress bar and current section */
  function initScroll() {
    var bar = $("#progress-bar");
    var navLinks = $$(".topnav a");
    var stations = $$(".journey a");
    var ids = ["start", "problem", "fence", "journey", "ch2", "ch3", "ch4", "ch5", "ch6", "results", "critique", "glossary", "quiz"];
    var sections = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var ticking = false;
    function update() {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? clamp(window.scrollY / max, 0, 1) * 100 : 0) + "%";
      var cur = "";
      sections.forEach(function (s) { if (s.getBoundingClientRect().top <= 140) cur = s.id; });
      var navId = /^ch\d$/.test(cur) ? "journey" : cur;
      navLinks.forEach(function (a) {
        var on = a.getAttribute("href") === "#" + navId;
        if (on !== a.classList.contains("is-current")) {
          a.classList.toggle("is-current", on);
          if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        }
      });
      stations.forEach(function (a) { a.classList.toggle("is-current", a.getAttribute("href") === "#" + cur); });
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ------------------------------------------------------------------ HERO: wave on the ridge (toy physics) */
  function initHero() {
    var canvas = $("#hero-canvas");
    var ctx = canvas.getContext("2d");
    var fIn = $("#hero-freq"), gIn = $("#hero-gap");
    var playBtn = $("#hero-play");
    var staticCv = document.createElement("canvas");
    var fieldCv = document.createElement("canvas");
    var fctx = fieldCv.getContext("2d");
    var img = null;
    var W = 0, H = 0, dpr = 1, scale = 1, cols = 0, rows = 0;
    var VIEW_MM = 50;            // picture height in millimetres
    var RIDGE_HALF = 2.5;        // ridge 5 mm wide (thesis Ch. 2)
    var PERIOD = 6.5, PIN = 3;   // pin spacing and width in mm (thesis Ch. 2)
    var FIRST_ROW = 7.5;         // centre of the first pin row: 2.5 + 3.5 + 1.5 mm
    var BAND_LO = 10;            // GHz, example stop band lower edge (thesis)
    var col = {};
    var phase = 0, last = 0, raf = 0, visible = true;
    var playing = !reducedMotion();

    function bandHi(gap) { return 138 / (5 + gap); } // toy: equals 23 GHz at the thesis's 1 mm gap
    function state() {
      var f = parseFloat(fIn.value), gap = parseFloat(gIn.value);
      var hi = bandHi(gap), hasBand = hi > BAND_LO + 0.5;
      var dist = 0, side = "in";
      if (!hasBand) { dist = 9; side = "none"; }
      else if (f < BAND_LO) { dist = BAND_LO - f; side = "below"; }
      else if (f > hi) { dist = f - hi; side = "above"; }
      var L = clamp(dist / 2.5, 0, 1);
      L = 1 - (1 - L) * (1 - L);
      return { f: f, gap: gap, hi: hi, hasBand: hasBand, side: side, L: L, lambda: 300 / f };
    }

    function readColors() {
      col.floor = cssVar("--cv-floor"); col.pin = cssVar("--cv-pin"); col.pinTop = cssVar("--cv-pin-top");
      col.ridge = cssVar("--cv-ridge"); col.ridgeTop = cssVar("--cv-ridge-top"); col.ink = cssVar("--cv-ink");
      col.crest = hexToRgb(cssVar("--crest")); col.trough = hexToRgb(cssVar("--trough"));
    }

    function resize() {
      var cssW = canvas.clientWidth || canvas.parentElement.clientWidth || 600;
      var cssH = Math.round(clamp(cssW * 0.44, 230, 430));
      canvas.style.height = cssH + "px";
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cssW; H = cssH; scale = H / VIEW_MM;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      staticCv.width = canvas.width; staticCv.height = canvas.height;
      cols = Math.max(40, Math.ceil(W / 2)); rows = Math.max(30, Math.ceil(H / 2));
      fieldCv.width = cols; fieldCv.height = rows;
      img = fctx.createImageData(cols, rows);
      drawStatic();
      draw();
    }

    function drawStatic() {
      var s = staticCv.getContext("2d");
      s.setTransform(dpr, 0, 0, dpr, 0, 0);
      s.fillStyle = col.floor; s.fillRect(0, 0, W, H);
      var wmm = W / scale, half = VIEW_MM / 2;
      for (var k = 0; FIRST_ROW + k * PERIOD - PIN / 2 < half; k++) {
        for (var sgn = -1; sgn <= 1; sgn += 2) {
          var yc = sgn * (FIRST_ROW + k * PERIOD);
          for (var x = PERIOD / 2; x < wmm + PIN; x += PERIOD) {
            var px = (x - PIN / 2) * scale, py = H / 2 + (yc - PIN / 2) * scale, sz = PIN * scale;
            s.fillStyle = col.pin; s.fillRect(px, py, sz, sz);
            s.fillStyle = col.pinTop; s.fillRect(px + 1.5, py + 1.5, sz - 3, sz - 3);
          }
        }
      }
      var ry = H / 2 - RIDGE_HALF * scale, rh = 2 * RIDGE_HALF * scale;
      s.fillStyle = col.ridge; s.fillRect(0, ry, W, rh);
      s.fillStyle = col.ridgeTop; s.fillRect(0, ry + 2, W, rh - 4);
    }

    function label(text, x, y, align) {
      ctx.font = "500 12px " + (cssVar("--sans") || "sans-serif");
      var w = ctx.measureText(text).width + 12;
      var bx = align === "right" ? x - w : x;
      ctx.globalAlpha = 0.86; ctx.fillStyle = col.floor;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, y - 10, w, 20, 6); ctx.fill(); } else ctx.fillRect(bx, y - 10, w, 20);
      ctx.globalAlpha = 1; ctx.fillStyle = col.ink; ctx.textBaseline = "middle"; ctx.textAlign = "left";
      ctx.fillText(text, bx + 6, y + 0.5);
      return w;
    }

    function draw() {
      if (!img) return;
      var st = state();
      var k = 2 * Math.PI / st.lambda, L = st.L;
      var data = img.data, cs = W / cols, rs = H / rows;
      var sig0 = 1.7, x0 = 14;
      var cr = col.crest, tr = col.trough;
      var p = 0;
      for (var j = 0; j < rows; j++) {
        var y = ((j + 0.5) * rs - H / 2) / scale, ay = Math.abs(y);
        var dyBase = Math.max(ay - RIDGE_HALF * (1 - L), 0);
        for (var i = 0; i < cols; i++) {
          var x = (i + 0.5) * cs / scale;
          var sig = sig0 + 0.5 * L * x;
          var amp = Math.sqrt(sig0 / sig) * Math.exp(-(dyBase * dyBase) / (2 * sig * sig) - 0.006 * L * x);
          var r = L > 0 ? Math.sqrt((x + x0) * (x + x0) + L * y * y) - x0 : x;
          var v = amp * Math.cos(k * r - phase);
          var a = Math.min(1, Math.pow(Math.abs(v), 0.85)) * 235;
          var c = v >= 0 ? cr : tr;
          data[p++] = c[0]; data[p++] = c[1]; data[p++] = c[2]; data[p++] = a;
        }
      }
      fctx.putImageData(img, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(staticCv, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(fieldCv, 0, 0, cols, rows, 0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // overlay labels
      var lpx = st.lambda * scale;
      var wlText = "one wavelength: " + trim(st.lambda, 1) + " mm";
      if (lpx < W - 30) {
        var bx = 12, by = 30;
        ctx.strokeStyle = col.ink; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(bx, by - 5); ctx.lineTo(bx, by + 5); ctx.moveTo(bx, by); ctx.lineTo(bx + lpx, by);
        ctx.moveTo(bx + lpx, by - 5); ctx.lineTo(bx + lpx, by + 5); ctx.stroke();
        label(wlText, 12, 14);
      } else {
        label(wlText + " (longer than this picture)", 12, 14);
      }
      label("signal in →", 10, H / 2 - RIDGE_HALF * scale - 14);
      label("ridge", W - 10, H / 2, "right");
      label("pins", W - 10, H - 16, "right");
    }

    function loop(ts) {
      raf = 0;
      if (!playing || !visible) { last = 0; return; }
      if (last) {
        var dt = Math.min(0.05, (ts - last) / 1000);
        var st = state();
        phase = (phase + dt * 2 * Math.PI * (30 / st.lambda)) % (2 * Math.PI * 1000);
      }
      last = ts;
      draw();
      raf = requestAnimationFrame(loop);
    }
    function kick() { if (playing && visible && !raf) { last = 0; raf = requestAnimationFrame(loop); } }

    function updateUI() {
      var st = state();
      $("#hero-freq-out").textContent = trim(st.f, 1) + " GHz";
      $("#hero-gap-out").textContent = trim(st.gap, 2) + " mm";
      // band strip sits on the same scale as the slider (2 to 35 GHz)
      var band = $("#hero-band"), bl = $("#hero-band-label");
      if (st.hasBand) {
        var a = (BAND_LO - 2) / 33 * 100, b = (Math.min(st.hi, 35) - 2) / 33 * 100;
        band.style.display = ""; band.style.left = a + "%"; band.style.width = (b - a) + "%";
        bl.textContent = "stop band"; bl.style.left = (a + b) / 2 + "%";
      } else {
        band.style.display = "none"; bl.textContent = "no stop band"; bl.style.left = "50%";
      }
      var box = $("#hero-status"), verdict = $("#hero-verdict"), text = $("#hero-text");
      var hiTxt = st.gap === 1 ? "23" : trim(st.hi, 0);
      var toy = st.gap === 1 ? "" : ", a toy estimate for this gap";
      var lam = trim(st.lambda, 1);
      var msg;
      if (st.side === "in") {
        verdict.textContent = "Trapped";
        msg = trim(st.f, 1) + " GHz is inside the fence’s stop band (about 10 to " + hiTxt + " GHz" + toy +
          "). The space between the lid and the pin-tops is too thin for the wave to enter, so it stays on the ridge.";
      } else if (st.side === "none") {
        verdict.textContent = "Leaking";
        msg = "With a gap this large there is no stop band left at any frequency. The fence never closes, and the wave spreads out between the plates.";
      } else if (st.side === "below") {
        verdict.textContent = st.L < 1 ? "Starting to leak" : "Leaking";
        msg = trim(st.f, 1) + " GHz is below the stop band, which starts near 10 GHz. One wave is " + lam +
          " mm long here, so the pins are far shorter than a quarter of it. To this wave they are just bumps on the floor, and it spreads out sideways.";
      } else if (st.f < 23) {
        verdict.textContent = st.L < 1 ? "Starting to leak" : "Leaking";
        msg = "With a " + trim(st.gap, 2) + " mm gap the fence only holds up to about " + hiTxt + " GHz (toy estimate), and " +
          trim(st.f, 1) + " GHz is beyond that. A bigger gap gives the wave room to slip between the lid and the pins. The thesis’s basic requirement is a gap smaller than a quarter wavelength, and in practice much smaller.";
      } else {
        verdict.textContent = st.L < 1 ? "Starting to leak" : "Leaking";
        msg = trim(st.f, 1) + " GHz is above the stop band, which ends near " + hiTxt + " GHz" + (st.gap === 1 ? "" : " for this gap (toy estimate)") +
          ". The wave is now short enough (" + lam + " mm) for new wave patterns to fit between the pins and the lid, and they carry energy away sideways.";
      }
      text.textContent = msg;
      box.classList.toggle("is-bad", st.side !== "in");
      box.classList.toggle("is-good", st.side === "in");
      var wmm = W / scale || 100;
      var power = (1.7 / (1.7 + 0.5 * st.L * wmm)) * Math.exp(-0.012 * st.L * wmm);
      var meter = $("#hero-meter");
      meter.style.width = clamp(Math.sqrt(power) * 100, 4, 100) + "%";
      meter.style.backgroundColor = st.side === "in" ? "var(--good)" : "var(--bad)";
      $$("[data-hero-preset]").forEach(function (b) {
        b.classList.toggle("is-on", parseFloat(b.getAttribute("data-hero-preset")) === st.f && st.gap === 1);
      });
      if (!playing || !visible) draw();
    }

    fIn.addEventListener("input", updateUI);
    gIn.addEventListener("input", updateUI);
    $$("[data-hero-preset]").forEach(function (b) {
      b.addEventListener("click", function () {
        fIn.value = b.getAttribute("data-hero-preset"); gIn.value = 1; updateUI();
      });
    });
    function setPlaying(on) {
      playing = on;
      playBtn.textContent = on ? "Pause" : "Play";
      playBtn.setAttribute("aria-pressed", on ? "true" : "false");
      playBtn.setAttribute("aria-label", on ? "Pause the animation" : "Play the animation");
      kick();
    }
    playBtn.addEventListener("click", function () { setPlaying(!playing); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting; kick();
      }, { threshold: 0.05 }).observe(canvas);
    }
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { resize(); updateUI(); }, 80); });
    onTheme(function () { readColors(); drawStatic(); draw(); });
    readColors(); resize(); setPlaying(playing); updateUI();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(); });
  }

  /* ------------------------------------------------------------------ START HERE: wavelength ruler */
  function initRuler() {
    var root = $("#ruler-svg"), input = $("#ruler-freq");
    var X0, PX_CM, BASE = 78, AMP = 30, wave, bracket, bl;
    function build(narrow) {
      root.textContent = "";
      X0 = narrow ? 18 : 30; PX_CM = narrow ? 32 : 58;
      root.setAttribute("viewBox", "0 0 " + (X0 * 2 + PX_CM * 10) + " 170");
      var gRuler = svg("g", {}, root);
      svg("rect", { x: X0 - 8, y: 118, width: PX_CM * 10 + 16, height: 34, rx: 5, class: "s-metal", opacity: 0.28 }, gRuler);
      for (var mm = 0; mm <= 100; mm++) {
        var x = X0 + mm * PX_CM / 10, big = mm % 10 === 0, mid = mm % 5 === 0;
        svg("line", { x1: x, x2: x, y1: 118, y2: 118 + (big ? 14 : mid ? 10 : 6), class: "s-axis", "stroke-width": big ? 1.4 : 0.8 }, gRuler);
        if (big) svg("text", { x: x, y: 146, "text-anchor": "middle", class: "s-num", text: String(mm / 10) }, gRuler);
      }
      svg("text", { x: X0 + PX_CM * 10 + 4, y: 166, "text-anchor": "end", class: "s-lbl", text: "centimetres" }, gRuler);
      wave = svg("path", { class: "s-wave" }, root);
      bracket = svg("path", { class: "s-dim" }, root);
      bl = svg("text", { class: "s-lbl-strong", y: 20 }, root);
      update();
    }
    function update() {
      var f = parseFloat(input.value);
      var cm = 30 / f, lpx = cm * PX_CM;
      var d = "", x1 = X0 + PX_CM * 10;
      for (var x = X0; x <= x1 + 0.5; x += 1) {
        var y = BASE - AMP * Math.sin((x - X0) / lpx * 2 * Math.PI);
        d += (d ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
      }
      wave.setAttribute("d", d);
      bracket.setAttribute("d", "M" + X0 + " 30v10M" + X0 + " 35h" + lpx.toFixed(1) + "M" + (X0 + lpx).toFixed(1) + " 30v10");
      bl.setAttribute("x", X0); bl.textContent = "one wave: " + trim(cm, 2) + " cm";
      $("#ruler-freq-out").textContent = trim(f, 1) + " GHz";
      $("#ruler-text").textContent = "At " + trim(f, 1) + " GHz one wave is " + trim(cm, 2) + " cm long. A quarter of that is " +
        trim(75 / f, 1) + " mm, which is the height a metal pin needs to act as part of a wave fence at this frequency.";
    }
    input.addEventListener("input", update);
    onNarrow(build);
  }

  /* ------------------------------------------------------------------ PROBLEM: imperfect joint toggle */
  function initProblem() {
    var fig = $("#problem-fig"), toggle = $("#crack-toggle");
    function update() {
      var on = toggle.checked;
      fig.classList.toggle("is-cracked", on);
      $("#hollow-verdict-text").textContent = on ? "Leaking through the seam" : "Low loss, if the seam is perfect";
      $("#rgw-verdict-text").textContent = on ? "Unaffected: there is no seam to fail" : "Low loss, no contact needed";
    }
    toggle.addEventListener("change", update);
    update();
  }

  /* ------------------------------------------------------------------ generic horizontal band chart (HTML bars) */
  var KIND_TEXT = { meas: "Measured on hardware", sim: "Computer simulation", rule: "Rule-of-thumb formula" };
  function bandChart(container, cfg) {
    container.textContent = "";
    var span = cfg.max - cfg.min;
    function pct(v) { return (clamp(v, cfg.min, cfg.max) - cfg.min) / span * 100; }
    var root = h("div", { class: "bc" + (cfg.tight ? " bc-tight" : "") });
    var axisTrack = h("div", { class: "bc-track" });
    cfg.ticks.forEach(function (t, i) {
      axisTrack.appendChild(h("span", { class: "bc-tick", style: "left:" + pct(t) + "%", text: t + (i === cfg.ticks.length - 1 ? " GHz" : "") }));
    });
    root.appendChild(h("div", { class: "bc-axis", "aria-hidden": "true" }, [h("div", { class: "bc-label bc-axis-title", text: cfg.axisTitle || "" }), axisTrack]));
    cfg.rows.forEach(function (row) {
      var track = h("div", { class: "bc-track" });
      cfg.ticks.forEach(function (t) { track.appendChild(h("span", { class: "bc-gl", style: "left:" + pct(t) + "%" })); });
      (cfg.refs || []).forEach(function (r) {
        track.appendChild(h("span", { class: "bc-ref", style: "left:" + pct(r[0]) + "%;width:" + (pct(r[1]) - pct(r[0])) + "%" }));
      });
      if (row.a !== null && row.b > row.a) {
        var a = pct(row.a), b = pct(row.b);
        var valText = trim(row.a, 2) + "–" + trim(row.b, 2);
        var bar = h("span", {
          class: "bc-bar is-" + row.kind, tabindex: "0", role: "img",
          style: "left:" + a + "%;width:" + (b - a) + "%",
          "aria-label": row.label + ": " + trim(row.a, 2) + " to " + trim(row.b, 2) + " gigahertz. " + KIND_TEXT[row.kind] + ". " + (row.note || "")
        });
        var tipHtml = "<strong>" + row.label + "</strong>" + valText + " GHz · " + KIND_TEXT[row.kind] +
          (row.note ? "<br>" + row.note : "") + (row.page ? "<br><em>Thesis " + row.page + "</em>" : "");
        bar.addEventListener("mouseenter", function () { showTip(bar, tipHtml); });
        bar.addEventListener("mouseleave", function () { hideTip(120); });
        bar.addEventListener("focus", function () { showTip(bar, tipHtml); });
        bar.addEventListener("blur", function () { hideTip(120); });
        bar.addEventListener("click", function (e) { e.stopPropagation(); showTip(bar, tipHtml); });
        track.appendChild(bar);
        var val = h("span", { class: "bc-val", "aria-hidden": "true", text: valText });
        if (b > 78) val.style.right = (100 - a) + "%"; else val.style.left = b + "%";
        track.appendChild(val);
      } else if (row.empty) {
        track.appendChild(h("span", { class: "bc-val", style: "left:0", text: row.empty }));
      }
      var lab = h("div", { class: "bc-label", text: row.label });
      if (row.sub) lab.appendChild(h("small", { text: row.sub }));
      root.appendChild(h("div", { class: "bc-row" }, [lab, track]));
    });
    container.appendChild(root);
  }

  /* ------------------------------------------------------------------ FENCE: band-gap rule-of-thumb calculator */
  // Pin fences used in the thesis: pin height d and gap h (mm), and the stop band its simulations report (GHz).
  // Note: "main" uses Table 3.2's dimensions; its 10-23 GHz band is Chapter 2's result for pins with the same
  // spacing, width and gap. The thesis does not state the Chapter 2 pin height, so the two are not called identical.
  var FENCES = {
    main:    { d: 5,   h: 1,     sim: [10, 23],   what: "Chapter 2\u2019s pins (same spacing, width and gap; height not stated)", sub: "Ch. 2 pins, same spacing and gap", page: "Ch. 2, p. 32",
               extra: " For exactly these dimensions (Table 3.2), Chapter 3 quotes a simulated ratio of 2.39 : 1 (p. 73).", tail: " Either way, the real band is far wider than the formula\u2019s 1.67 : 1." },
    test:    { d: 3,   h: 0.5,   sim: [17, 39],   what: "a waveguide built from these pins", page: "Ch. 3, pp. 63, 70" },
    coupler: { d: 4.7, h: 1,     sim: [11, 25],   what: "pins alone", page: "Ch. 4, pp. 100–102" },
    divider: { d: 6,   h: 0.625, sim: [10, 20.5], what: "pins with the ridge", page: "Ch. 4, pp. 92–93" }
  };
  function initFence() {
    var root = $("#fence-svg"), dIn = $("#fence-d"), hIn = $("#fence-h");
    var active = "main";
    var S = 11, FLOOR = 226, CX = 150;
    svg("rect", { x: 20, y: FLOOR, width: 260, height: 12, rx: 2, class: "s-metal-dark" }, root);
    var pins = [-1, 0, 1].map(function (i) {
      return svg("rect", { x: CX + i * 6.5 * S - 1.5 * S, width: 3 * S, class: "s-metal", opacity: i === 0 ? 1 : 0.45 }, root);
    });
    var lid = svg("rect", { x: 20, width: 260, height: 10, rx: 2, class: "s-metal-dark" }, root);
    var gapGlow = svg("rect", { x: 20, width: 260, class: "s-band", "stroke-width": 0 }, root);
    var dimD = svg("path", { class: "s-dim" }, root), dimH = svg("path", { class: "s-dim" }, root);
    var txtD = svg("text", { class: "s-lbl-strong", "text-anchor": "end" }, root);
    var txtH = svg("text", { class: "s-lbl-strong" }, root);
    svg("text", { x: 24, y: 248, class: "s-lbl", text: "floor" }, root);
    var txtLid = svg("text", { x: 24, class: "s-lbl", text: "lid" }, root);

    function update() {
      var d = parseFloat(dIn.value), g = parseFloat(hIn.value);
      var top = FLOOR - d * S, lidY = top - g * S;
      pins.forEach(function (p) { p.setAttribute("y", top); p.setAttribute("height", d * S); });
      lid.setAttribute("y", lidY - 10);
      gapGlow.setAttribute("y", lidY); gapGlow.setAttribute("height", Math.max(g * S, 0.5));
      txtLid.setAttribute("y", lidY - 14);
      var xd = CX - 1.5 * S - 9, xh = CX + 1.5 * S + 10;
      dimD.setAttribute("d", "M" + (xd - 4) + " " + top + "h8M" + xd + " " + top + "V" + FLOOR + "M" + (xd - 4) + " " + FLOOR + "h8");
      dimH.setAttribute("d", "M" + (xh - 4) + " " + lidY + "h8M" + xh + " " + lidY + "V" + top + "M" + (xh - 4) + " " + top + "h8");
      txtD.setAttribute("x", xd - 7); txtD.setAttribute("y", (top + FLOOR) / 2 + 4); txtD.textContent = "d";
      txtH.setAttribute("x", xh + 7); txtH.setAttribute("y", (top + lidY) / 2 + 4); txtH.textContent = "h";

      var f1 = 75 / d, f2 = 150 / (d + g), ratio = f2 / f1, ok = ratio > 1.001;
      $("#fence-d-out").textContent = fmt(d, 1) + " mm";
      $("#fence-h-out").textContent = trim(g, 3) + " mm";
      $("#fence-f1").textContent = fmt(f1, 1) + " GHz";
      $("#fence-f2").textContent = fmt(f2, 1) + " GHz";
      $("#fence-ratio").textContent = ok ? fmt(ratio, 2) + " : 1" : "no band";
      $("#fence-ratio").parentNode.classList.toggle("is-bad", !ok);

      var preset = active ? FENCES[active] : null;
      var rows = [{ label: "Rule of thumb", a: ok ? f1 : null, b: f2, kind: "rule", empty: "no stop band",
        note: "From the two quick formulas: c/(4d) to c/(2(d+h)).", page: "Ch. 3, Sec. 3.2.2" }];
      if (preset) rows.push({ label: "Full simulation", sub: preset.sub || preset.what, a: preset.sim[0], b: preset.sim[1], kind: "sim",
        note: "Stop band reported by the thesis for " + preset.what + ".", page: preset.page });
      bandChart($("#fence-axis"), { min: 0, max: 75, ticks: [0, 15, 30, 45, 60, 75], rows: rows, tight: true });

      var msg;
      if (!ok) {
        msg = "No stop band. When the gap is as tall as the pin or taller, the frequency where the fence fails drops to or below the frequency where it starts working. Shrink the gap or lengthen the pin.";
      } else {
        msg = "Rule of thumb: these pins block sideways travel from about " + fmt(f1, 1) + " to " + fmt(f2, 1) + " GHz.";
        if (preset) msg += " The thesis’s full simulation for " + preset.what + " gives about " + trim(preset.sim[0], 1) + " to " +
          trim(preset.sim[1], 1) + " GHz (" + preset.page + ")." + (preset.extra || "") + (preset.tail || " The real band starts much lower than the formula suggests.");
        else if (g > d * 0.5) msg += " The gap is more than half the pin height, so the band is narrow. The thesis’s fences all use a gap of roughly a fifth of the pin height or less.";
        else msg += " Taller pins move the whole band down. A smaller gap pushes the top edge up and widens it.";
      }
      $("#fence-text").textContent = msg;
      $$("[data-fence-preset]").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-fence-preset") === active); });
    }
    function manual() { active = null; update(); }
    dIn.addEventListener("input", manual); hIn.addEventListener("input", manual);
    $$("[data-fence-preset]").forEach(function (b) {
      b.addEventListener("click", function () {
        active = b.getAttribute("data-fence-preset");
        dIn.value = FENCES[active].d; hIn.value = FENCES[active].h; update();
      });
    });
    update();
  }

  /* ------------------------------------------------------------------ CH 2: band chart and decibel slider */
  var RADAR = [[13.25, 14.2], [15.5, 17.5]]; // airborne radar bands, Ch. 2 p. 16
  function initCh2() {
    bandChart($("#ch2-chart"), {
      min: 8, max: 27, ticks: [10, 15, 20, 25], refs: RADAR,
      rows: [
        { label: "What the pin fence allows", sub: "the band on offer", a: 10, b: 23, kind: "sim", note: "Stop band of the pins, about 2.3 : 1.", page: "Ch. 2, p. 32" },
        { label: "Old connector, open end", sub: "judged at −10 dB", a: 12.5, b: 17, kind: "sim", note: "The classic probe-in-a-hole design. About a third of the band.", page: "Ch. 2, p. 17" },
        { label: "Old connector, shorted end", sub: "judged at −10 dB", a: 11.5, b: 19, kind: "sim", note: "An improved version. About half of the band.", page: "Ch. 2, p. 18" },
        { label: "New five-step connector", sub: "design target, −15 dB", a: 10, b: 25, kind: "meas", note: "Two connectors back to back measured better than −18 dB across the band.", page: "Ch. 2, pp. 23, 33" },
        { label: "Finished waveguide with new connectors", sub: "limited by the pins, not the connector", a: 12.5, b: 23, kind: "meas", note: "Measured and simulated curves agree closely.", page: "Ch. 2, pp. 33–35" }
      ]
    });
    var db = $("#db-in");
    function update() {
      var v = parseFloat(db.value), frac = Math.pow(10, v / 10), pc = frac * 100;
      var pcTxt = pc >= 10 ? fmt(pc, 0) : pc >= 1 ? fmt(pc, 1) : fmt(pc, 2);
      var rest = 100 - pc;
      $("#db-out").textContent = MINUS + Math.abs(v) + " dB";
      $("#db-refl").style.width = pc + "%";
      $("#db-text").textContent = "At " + MINUS + Math.abs(v) + " dB, about " + pcTxt + "% of the power bounces back (orange) and " +
        (rest >= 99 ? fmt(rest, 1) : fmt(rest, 0)) + "% carries on (blue).";
    }
    db.addEventListener("input", update);
    update();
  }

  /* ------------------------------------------------------------------ CH 3a: counting ripples (toy test piece) */
  function initRipple() {
    var root = $("#ripple-svg"), input = $("#ripple-f");
    var U0 = 0.06, U1 = 0.40, U2 = 0.60, NA = 5.5, NB = 6.5, G = 0.5;
    var TA = 34, BA = 150;          // transmission plot top / bottom
    var SY = 190, SH = 44;          // strip (inside the test piece)
    var TB = 278, BB = 398;         // dispersion plot
    var X0, X1, SX, SW, update = function () {};
    function ux(u) { return X0 + (X1 - X0) * u; }
    function halves(u) {            // how many half-waves fit along the piece (toy dispersion)
      if (u < U0) return null;
      if (u <= U1) return NA * (2 / Math.PI) * Math.asin(clamp((u - U0) / (U1 - U0), 0, 1));
      if (u < U2) return null;
      return NB * Math.sqrt(1 - (U2 / u) * (U2 / u)) / Math.sqrt(1 - U2 * U2);
    }
    function edge(u) {              // soft band edges
      var w = 0.014;
      function ss(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
      if (u < U0 || (u > U1 && u < U2)) return 0;
      if (u <= U1) return Math.min(ss((u - U0) / w), ss((U1 - u) / w));
      return ss((u - U2) / w);
    }
    function trans(u) {
      var n = halves(u);
      if (n === null) return 0;
      return (1 - G * G) / Math.sqrt(1 + Math.pow(G, 4) - 2 * G * G * Math.cos(2 * Math.PI * n)) * edge(u);
    }
    var peaks = [], n;
    for (n = 1; n <= 5; n++) peaks.push({ u: U0 + (U1 - U0) * Math.sin(n * Math.PI / (2 * NA)), n: n, band: "A" });
    for (n = 1; n <= 6; n++) peaks.push({ u: U2 / Math.sqrt(1 - Math.pow(n / NB, 2) * (1 - U2 * U2)), n: n, band: "B" });
    function ny(nv) { return BB - nv * (BB - TB) / 7; }

    function build(narrow) {
      root.textContent = "";
      var VW = narrow ? 390 : 720;
      root.setAttribute("viewBox", "0 0 " + VW + " 430");
      X0 = narrow ? 40 : 70; X1 = VW - (narrow ? 10 : 20);
      SX = narrow ? X0 : 170; SW = narrow ? X1 - X0 : 430;
      var mid = (ux(U1) + ux(U2)) / 2, k;
      // scenery
      [[TA - 8, BA], [TB - 4, BB]].forEach(function (yy) {
        svg("rect", { x: ux(U1), y: yy[0], width: ux(U2) - ux(U1), height: yy[1] - yy[0], class: "s-band" }, root);
        svg("rect", { x: ux(0), y: yy[0], width: ux(U0) - ux(0), height: yy[1] - yy[0], class: "s-dead" }, root);
      });
      svg("text", { x: mid, y: TA + 8, "text-anchor": "middle", class: "s-lbl-strong", text: narrow ? "band" : "band gap" }, root);
      svg("text", { x: mid, y: TA + 24, "text-anchor": "middle", class: narrow ? "s-lbl-strong" : "s-lbl", text: narrow ? "gap" : "nothing gets through" }, root);
      svg("text", { x: mid, y: (TB + BB) / 2 + 4, "text-anchor": "middle", class: "s-lbl", text: narrow ? "no dots" : "no dots here" }, root);
      svg("text", { x: X0, y: 14, class: "s-lbl-strong", text: "1. Signal that gets through the test piece" }, root);
      svg("path", { d: "M" + X0 + " " + TA + "V" + BA + "H" + X1, class: "s-axis" }, root);
      svg("text", { x: X0 - 6, y: TA + 4, "text-anchor": "end", class: "s-num", text: "all" }, root);
      svg("text", { x: X0 - 6, y: BA + 4, "text-anchor": "end", class: "s-num", text: "none" }, root);
      var d = "";
      for (k = 0; k <= 900; k++) { var u = k / 900; d += (k ? "L" : "M") + ux(u).toFixed(1) + " " + (BA - (BA - TA - 6) * trans(u)).toFixed(1); }
      svg("path", { d: d, class: "s-wave", "stroke-width": narrow ? 2 : 2.6 }, root);

      svg("text", { x: X0, y: SY - 10, class: "s-lbl-strong", text: narrow ? "2. Wave inside the piece" : "2. Wave pattern inside the test piece right now" }, root);
      svg("rect", { x: SX, y: SY, width: SW, height: SH, rx: 6, class: "s-metal", opacity: 0.25 }, root);
      var strip = svg("path", { class: "s-fill-crest", opacity: 0.8 }, root);
      var stripTxt = narrow
        ? svg("text", { x: X1, y: SY - 10, "text-anchor": "end", class: "s-lbl" }, root)
        : svg("text", { x: SX + SW + 10, y: SY + SH / 2 + 4, class: "s-lbl" }, root);
      if (!narrow) svg("text", { x: SX - 10, y: SY + SH / 2 + 4, "text-anchor": "end", class: "s-lbl", text: "signal in →" }, root);

      svg("text", { x: X0, y: TB - 14, class: "s-lbl-strong", text: "3. The dispersion curve, one dot per peak" }, root);
      svg("path", { d: "M" + X0 + " " + TB + "V" + BB + "H" + X1, class: "s-axis" }, root);
      for (k = 1; k <= 6; k++) {
        svg("line", { x1: X0, x2: X1, y1: ny(k), y2: ny(k), class: "s-grid" }, root);
        svg("text", { x: X0 - 6, y: ny(k) + 4, "text-anchor": "end", class: "s-num", text: String(k) }, root);
      }
      svg("text", { class: "s-lbl", "text-anchor": "middle", transform: "translate(" + (narrow ? 11 : 18) + " " + (TB + BB) / 2 + ") rotate(-90)", text: "half-waves that fit" }, root);
      svg("text", { x: X1, y: BB + 22, "text-anchor": "end", class: "s-lbl", text: "frequency →" }, root);
      var lineA = svg("path", { class: "s-mode" }, root), lineB = svg("path", { class: "s-mode" }, root);
      var dots = peaks.map(function (p) { return svg("circle", { cx: ux(p.u), cy: ny(p.n), r: narrow ? 4.5 : 5.5, class: "s-dot-pending" }, root); });
      var marker = svg("line", { y1: TA - 8, y2: BA, class: "s-marker" }, root);
      var marker2 = svg("line", { y1: TB - 4, y2: BB, class: "s-marker" }, root);
      var knob = svg("circle", { r: 6, class: "s-fill-accent" }, root);

      update = function () {
        var u = parseFloat(input.value) / 1000;
        var x = ux(u), nNow = halves(u);
        marker.setAttribute("x1", x); marker.setAttribute("x2", x);
        marker2.setAttribute("x1", x); marker2.setAttribute("x2", x);
        knob.setAttribute("cx", x); knob.setAttribute("cy", BA - (BA - TA - 6) * trans(u));
        var da = "", dbp = "", countA = 0, countB = 0, onPeak = null;
        peaks.forEach(function (p, idx) {
          var seen = u >= p.u - 0.0005;
          dots[idx].setAttribute("class", seen ? "s-dot" : "s-dot-pending");
          dots[idx].setAttribute("opacity", seen ? 1 : 0.35);
          if (seen) {
            if (p.band === "A") { da += (da ? "L" : "M") + ux(p.u).toFixed(1) + " " + ny(p.n).toFixed(1); countA++; }
            else { dbp += (dbp ? "L" : "M") + ux(p.u).toFixed(1) + " " + ny(p.n).toFixed(1); countB++; }
          }
          if (Math.abs(u - p.u) < 0.004) onPeak = p;
        });
        lineA.setAttribute("d", da); lineB.setAttribute("d", dbp);
        // pattern inside the piece
        var sd = "M" + SX + " " + (SY + SH), steps = 160, j;
        for (j = 0; j <= steps; j++) {
          var s = j / steps, amp;
          if (nNow === null) amp = u < U0 ? 0 : Math.exp(-7 * s);
          else amp = Math.abs(Math.sin(Math.PI * Math.max(nNow, 0.15) * s)) * 0.92 + 0.04;
          sd += "L" + (SX + SW * s).toFixed(1) + " " + (SY + SH - amp * (SH - 4)).toFixed(1);
        }
        strip.setAttribute("d", sd + "L" + (SX + SW) + " " + (SY + SH) + "Z");
        var msg, out;
        if (u < U0) {
          out = "below the setup’s limit";
          stripTxt.textContent = "no signal";
          msg = "The test setup itself does not work this low, so nothing can be learned here. Real measurements have the same kind of limit: the thesis’s lab could only measure from 12.4 to 18 GHz.";
        } else if (nNow === null) {
          out = "inside the band gap";
          stripTxt.textContent = "dies away";
          msg = "Nothing gets through. The wave fades out a short way into the piece because no wave can travel among the pins at this frequency. This empty stretch is the band gap. The dot count starts again on the far side.";
        } else {
          var inA = u <= U1, c = inA ? countA : countB;
          out = inA ? "lower pass band" : "upper pass band";
          stripTxt.textContent = fmt(nNow, 1) + " half-waves";
          if (onPeak) msg = "Peak number " + onPeak.n + ". Exactly " + onPeak.n + " half-wave" + (onPeak.n > 1 ? "s fit" : " fits") + " along the piece, the echoes line up, and a new dot lands on the curve below.";
          else msg = "The signal gets through, more at some frequencies than others. You have passed " + c + " peak" + (c === 1 ? "" : "s") +
            " in this band so far. Each one says: one more half-wave now fits inside the piece.";
        }
        $("#ripple-out").textContent = out;
        $("#ripple-text").textContent = msg;
      };
      update();
    }
    input.addEventListener("input", function () { update(); });
    onNarrow(build);
  }

  /* ------------------------------------------------------------------ CH 3b: schematic dispersion diagram */
  function initDispersion() {
    var root = $("#disp-svg");
    var mode = "cell", gCell, gRidge;
    function build(narrow) {
      root.textContent = "";
      var VW = narrow ? 390 : 720, VH = narrow ? 452 : 380;
      root.setAttribute("viewBox", "0 0 " + VW + " " + VH);
      var X0 = narrow ? 44 : 78, X1 = narrow ? 378 : 470, Y0 = narrow ? 312 : 336, PX = narrow ? 9.2 : 10; // px per GHz, 0 to 30 GHz
      function fx(p) { return X0 + (X1 - X0) * p; }
      function fy(f) { return Y0 - f * PX; }
      function curve(fn, cls, parent) {
        var d = "";
        for (var i = 0; i <= 60; i++) { var p = i / 60; d += (i ? "L" : "M") + fx(p).toFixed(1) + " " + fy(fn(p)).toFixed(1); }
        return svg("path", { d: d, class: cls }, parent);
      }
      [0, 10, 20, 30].forEach(function (f) {
        svg("line", { x1: X0, x2: X1, y1: fy(f), y2: fy(f), class: "s-grid" }, root);
        svg("text", { x: X0 - 8, y: fy(f) + 4, "text-anchor": "end", class: "s-num", text: String(f) }, root);
      });
      svg("path", { d: "M" + X0 + " " + fy(30) + "V" + Y0 + "H" + X1, class: "s-axis" }, root);
      svg("text", { class: "s-lbl", "text-anchor": "middle", transform: "translate(" + (narrow ? 12 : 22) + " " + fy(15) + ") rotate(-90)", text: "Frequency (GHz)" }, root);
      svg("text", { x: X0, y: Y0 + 18, class: "s-num", text: "0°" }, root);
      svg("text", { x: X1, y: Y0 + 18, "text-anchor": "end", class: "s-num", text: "180°" }, root);
      svg("text", { x: (X0 + X1) / 2, y: Y0 + (narrow ? 20 : 34), "text-anchor": "middle", class: "s-lbl",
        text: narrow ? "Phase turn from one pin to the next" : "How far the wave’s phase turns from one pin to the next" }, root);

      gCell = svg("g", {}, root); gRidge = svg("g", {}, root);
      // pins alone: stop band about 10 to 23 GHz
      svg("rect", { x: X0, y: fy(23), width: X1 - X0, height: 13 * PX, class: "s-band" }, gCell);
      // with ridge: usable band 10.7 to 19.5 GHz, and the two slices lost
      svg("rect", { x: X0, y: fy(23), width: X1 - X0, height: 3.5 * PX, class: "s-band-lost" }, gRidge);
      svg("rect", { x: X0, y: fy(10.7), width: X1 - X0, height: 0.7 * PX, class: "s-band-lost" }, gRidge);
      svg("rect", { x: X0, y: fy(19.5), width: X1 - X0, height: 8.8 * PX, class: "s-band" }, gRidge);
      // waves among the pins (always there)
      curve(function (p) { return 9.8 * Math.sin(p * Math.PI / 2); }, "s-mode", root);
      curve(function (p) { return 23.1 + 4.4 * p * p; }, "s-mode", root);
      curve(function (p) { return 23.8 + 5.4 * Math.pow(p, 1.5); }, "s-mode", root);
      // extra waves once the ridge is added
      curve(function (p) { return 10.7 * Math.pow(Math.sin(p * Math.PI / 2), 0.7); }, "s-mode-extra", gRidge);
      curve(function (p) { return 19.5 + 3.2 * Math.pow(p, 1.4); }, "s-mode-extra", gRidge);
      // the wanted wave rides the ridge: close to a straight line
      svg("line", { x1: fx(0), y1: fy(0), x2: fx(1), y2: fy(23), class: "s-ghost" }, gRidge);
      svg("line", { x1: fx(10.7 / 23), y1: fy(10.7), x2: fx(19.5 / 23), y2: fy(19.5), class: "s-wave", "stroke-width": 4 }, gRidge);

      // annotations: to the right on wide screens, underneath on narrow ones
      var AX = narrow ? X0 : X1 + 18;
      function note(parent, y, strong, lines) {
        svg("text", { x: AX, y: y, class: "s-lbl-strong", text: strong }, parent);
        lines.forEach(function (t, i) { svg("text", { x: AX, y: y + 17 * (i + 1), class: "s-lbl", text: t }, parent); });
      }
      if (narrow) {
        note(gCell, Y0 + 58, "Stop band of the pins alone", ["about 10 to 23 GHz, about 2.3 : 1 (Chapter 2 pins)", "no curve crosses it: nothing can travel"]);
        note(gRidge, Y0 + 58, "Usable band with the ridge", ["10.7 to 19.5 GHz, ratio 1.82 : 1 (Chapter 3 square pin)", "the red-tinted slices are lost to unwanted waves"]);
      } else {
        note(gCell, fy(18), "Stop band of the pins alone", ["about 10 to 23 GHz", "about 2.3 : 1 (Chapter 2 pins)", "no curve crosses it:", "nothing can travel"]);
        note(gRidge, fy(17), "Usable band with the ridge", ["10.7 to 19.5 GHz", "ratio 1.82 : 1", "(Chapter 3 square pin)"]);
        svg("text", { x: AX, y: fy(21), class: "s-lbl", text: "lost to new unwanted waves" }, gRidge);
        svg("text", { x: AX, y: fy(9.2), class: "s-lbl", text: "lost here too" }, gRidge);
      }
      svg("text", { x: fx(0.50), y: fy(15.6), class: "s-lbl-strong s-halo-soft", "text-anchor": "end", text: "the wanted wave" }, gRidge);
      svg("text", { x: fx(0.50), y: fy(15.6) + 15, class: "s-lbl", "text-anchor": "end", text: "riding the ridge" }, gRidge);
      svg("text", { x: fx(0.98), y: fy(7.4), class: "s-lbl", "text-anchor": "end", text: "waves among the pins" }, root);
      svg("text", { x: fx(0.02), y: fy(27.6), class: "s-lbl", text: "more waves among the pins" }, root);
      set(mode);
    }
    function set(m) {
      mode = m;
      gCell.style.display = mode === "cell" ? "" : "none";
      gRidge.style.display = mode === "ridge" ? "" : "none";
      $$("[data-disp]").forEach(function (b) {
        var on = b.getAttribute("data-disp") === mode;
        b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
      });
      $("#disp-text").textContent = mode === "cell"
        ? "Pins alone: between about 10 and 23 GHz no curve exists, so no wave can travel through the pins. That is the stop band, and it looks generous."
        : "With the ridge: the wanted wave appears as a nearly straight line through the gap. But extra unwanted waves (dashed) creep in at both edges. The waveguide is only usable where the wanted wave is alone. For Chapter 3\u2019s square pin that is 10.7 to 19.5 GHz, and its ratio drops from 2.39 for the pins alone to 1.82.";
    }
    $$("[data-disp]").forEach(function (b) { b.addEventListener("click", function () { set(b.getAttribute("data-disp")); }); });
    onNarrow(build);
  }

  /* ------------------------------------------------------------------ CH 3c: pin shapes */
  // Bandwidth ratios from thesis Ch. 3, pp. 73-74 (simulated): pins alone, then with the ridge.
  var SHAPES = [
    { id: "square", name: "Square pin", sub: "the standard choice", alone: 2.39, ridge: 1.82,
      text: "Square pin: the standard, easy to machine. Adding the ridge cuts its ratio from 2.39 to 1.82, so it keeps only 76.2% of what the pins alone promised." },
    { id: "cone", name: "Cone", sub: "narrower at the base", alone: 2.63, ridge: 2.04,
      text: "Cone: 3 mm wide at the top and half that at the base. Better than the square pin on both counts (2.63, then 2.04 with the ridge, keeping 77.6%), but much harder to machine." },
    { id: "zcone", name: "Cone on its point", sub: "base shrunk to nothing", alone: 2.75, ridge: 2.68,
      text: "Cone on its point: the best of all. It barely notices the ridge (2.75 to 2.68, keeping 97.5%). The thesis studies it as an extreme case and calls it almost impossible to manufacture." },
    { id: "printed", name: "Printed cone", sub: "copper on circuit board", alone: 2.12, ridge: 2.04,
      text: "Printed cone: the same outline printed flat in copper on a thin circuit board that stands on edge. Lower ratio alone (2.12) but it loses little to the ridge (2.04). The catch is making sure its tip really connects to the floor." },
    { id: "gprinted", name: "Grounded printed cone", sub: "the thesis’s proposal", alone: 2.2, ridge: 2.02,
      text: "Grounded printed cone: the printed cone plus a 1 mm copper strip along the bottom that guarantees the connection. 2.2 alone and 2.02 with the ridge: nearly as good as the solid cone, and cheap to make." }
  ];
  function shapeIcon(id) {
    var s = svg("svg", { viewBox: "0 0 44 44", "aria-hidden": "true" });
    svg("rect", { x: 4, y: 3, width: 36, height: 3.5, rx: 1, class: "ic-plate" }, s);
    svg("rect", { x: 4, y: 38, width: 36, height: 3.5, rx: 1, class: "ic-plate" }, s);
    if (id === "square") svg("rect", { x: 15, y: 11, width: 14, height: 27, class: "ic-metal" }, s);
    if (id === "cone") svg("path", { d: "M14 11h16l-4 27h-8z", class: "ic-metal" }, s);
    if (id === "zcone") svg("path", { d: "M14 11h16l-8 27z", class: "ic-metal" }, s);
    if (id === "printed" || id === "gprinted") {
      svg("rect", { x: 9, y: 11, width: 26, height: 27, class: "ic-board" }, s);
      svg("path", { d: id === "printed" ? "M11 11h22l-11 27z" : "M11 11h22l-11 21z", class: "ic-copper" }, s);
      if (id === "gprinted") svg("rect", { x: 9, y: 32, width: 26, height: 6, class: "ic-copper" }, s);
    }
    return s;
  }
  function initShapes() {
    var box = $("#shapes-chart");
    function w(v) { return (v - 1) / 2 * 100; }
    var axisBars = h("span", { class: "sc-bars" });
    [1, 1.5, 2, 2.5, 3].forEach(function (t) {
      axisBars.appendChild(h("span", { class: "sc-tick", style: "left:" + w(t) + "%", text: t === 1 ? "1 : 1" : t === 3 ? "3 : 1" : String(t) }));
    });
    box.appendChild(h("div", { class: "sc-axis", "aria-hidden": "true" }, [h("span", { class: "sc-icon" }), h("span", { class: "sc-name" }), axisBars]));
    var rows = SHAPES.map(function (sp) {
      var icon = h("span", { class: "sc-icon" }); icon.appendChild(shapeIcon(sp.id));
      var name = h("span", { class: "sc-name", text: sp.name }); name.appendChild(h("small", { text: sp.sub }));
      function line(cls, v) {
        return h("span", { class: "sc-line" }, [
          h("span", { class: "sc-bar " + cls, style: "width:" + w(v) + "%" }),
          h("span", { class: "sc-num", style: "left:" + w(v) + "%", text: fmt(v, 2) })
        ]);
      }
      var btn = h("button", { type: "button", class: "sc-row", "aria-pressed": "false",
        "aria-label": sp.name + ": bandwidth ratio " + sp.alone + " for the pins alone, " + sp.ridge + " with the ridge" },
        [icon, name, h("span", { class: "sc-bars" }, [line("sc-alone", sp.alone), line("sc-ridge", sp.ridge)])]);
      btn.addEventListener("click", function () { select(sp.id); });
      box.appendChild(btn);
      return btn;
    });
    function select(id) {
      SHAPES.forEach(function (sp, i) {
        var on = sp.id === id;
        rows[i].classList.toggle("is-on", on); rows[i].setAttribute("aria-pressed", on ? "true" : "false");
        if (on) $("#shapes-text").textContent = sp.text;
      });
    }
    select("gprinted");
  }

  /* ------------------------------------------------------------------ CH 4: background pins for the device sketches */
  function initDevices() {
    ["divider-pins", "coupler-pins"].forEach(function (id) {
      var g = document.getElementById(id);
      if (!g) return;
      for (var y = 9; y < 190; y += 18) for (var x = 9; x < 320; x += 18) svg("rect", { x: x - 4, y: y - 4, width: 8, height: 8, rx: 1 }, g);
    });
  }

  /* ------------------------------------------------------------------ CH 5: circulator */
  function initCirculator() {
    var root = $("#circ-svg");
    var C = { x: 210, y: 196 }, R = 40, ARM = 128;
    var ANG = { 1: -90, 2: 30, 3: 150 };
    var ROLE = { 1: "transmitter", 2: "antenna", 3: "receiver" };
    function pt(deg, r) { var a = deg * Math.PI / 180; return { x: C.x + r * Math.cos(a), y: C.y + r * Math.sin(a) }; }
    function distToArm(x, y) {
      var best = 1e9;
      [1, 2, 3].forEach(function (p) {
        var e = pt(ANG[p], ARM + 30), dx = e.x - C.x, dy = e.y - C.y;
        var t = clamp(((x - C.x) * dx + (y - C.y) * dy) / (dx * dx + dy * dy), 0, 1);
        best = Math.min(best, Math.hypot(x - (C.x + t * dx), y - (C.y + t * dy)));
      });
      return best;
    }
    var gp = svg("g", {}, root);
    for (var y = 20; y < 350; y += 20) for (var x = 20; x < 410; x += 20) {
      if (Math.hypot(x - C.x, y - C.y) < 168 && distToArm(x, y) > 24) svg("rect", { x: x - 5, y: y - 5, width: 10, height: 10, rx: 1.5, class: "s-metal", opacity: 0.5 }, gp);
    }
    [1, 2, 3].forEach(function (p) {
      var e = pt(ANG[p], ARM);
      svg("line", { x1: C.x, y1: C.y, x2: e.x, y2: e.y, stroke: "var(--metal-dark)", "stroke-width": 24, "stroke-linecap": "butt" }, root);
    });
    var trails = svg("g", {}, root);
    svg("circle", { cx: C.x, cy: C.y, r: R, class: "s-ferrite" }, root);
    var spin = svg("g", { fill: "none", stroke: "#fff", "stroke-width": 2.5, "stroke-linecap": "round", opacity: 0.9 }, root);
    var spinArc = svg("path", {}, spin), spinHead = svg("path", { fill: "#fff", stroke: "none" }, spin);
    svg("text", { x: C.x, y: C.y + 4, "text-anchor": "middle", fill: "#fff", "font-size": 11, "font-weight": 600, text: "ferrite" }, root);
    var ports = {};
    [1, 2, 3].forEach(function (p) {
      var e = pt(ANG[p], ARM + 14);
      var g = svg("g", { class: "s-port", role: "button", tabindex: "0", "aria-label": "Send a signal into port " + p + " (" + ROLE[p] + ")" }, root);
      svg("circle", { cx: e.x, cy: e.y, r: 19 }, g);
      svg("text", { x: e.x, y: e.y + 5, text: String(p) }, g);
      var lx = p === 1 ? e.x + 28 : e.x, ly = p === 1 ? e.y + 5 : e.y + 38;
      svg("text", { x: lx, y: ly, class: "s-lbl s-halo", "text-anchor": p === 1 ? "start" : "middle", text: "e.g. " + ROLE[p] }, root);
      g.addEventListener("click", function () { send(p); });
      g.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); send(p); } });
      ports[p] = g;
    });
    var pulseLayer = svg("g", {}, root);
    var mag = 1, anim = 0, lastPort = 0;

    function drawSpin() {
      if (mag === 0) { spin.style.display = "none"; return; }
      spin.style.display = "";
      var r = R - 11, a0 = mag > 0 ? -150 : -30, a1 = mag > 0 ? -30 : -150;
      var s = pt(a0, r), e = pt(a1, r);
      spinArc.setAttribute("d", "M" + s.x + " " + s.y + "A" + r + " " + r + " 0 0 " + (mag > 0 ? 1 : 0) + " " + e.x + " " + e.y);
      var dir = mag > 0 ? 1 : -1, ar = a1 * Math.PI / 180;
      var tx = -Math.sin(ar) * dir, ty = Math.cos(ar) * dir, nx = Math.cos(ar), nyv = Math.sin(ar);
      spinHead.setAttribute("d", "M" + (e.x + tx * 8) + " " + (e.y + ty * 8) + "L" + (e.x - tx * 2 + nx * 6) + " " + (e.y - ty * 2 + nyv * 6) +
        "L" + (e.x - tx * 2 - nx * 6) + " " + (e.y - ty * 2 - nyv * 6) + "Z");
    }
    function route(from, to) {
      var a = pt(ANG[from], ARM - 4), ea = pt(ANG[from], R + 5), eb = pt(ANG[to], R + 5), b = pt(ANG[to], ARM - 4);
      var delta = ((ANG[to] - ANG[from]) % 360 + 360) % 360;      // 120 = next port clockwise on screen
      var sweep = delta === 120 ? 1 : 0;
      return "M" + a.x + " " + a.y + "L" + ea.x + " " + ea.y + "A" + (R + 5) + " " + (R + 5) + " 0 0 " + sweep + " " + eb.x + " " + eb.y + "L" + b.x + " " + b.y;
    }
    function next(p, dir) { return ((p - 1 + dir + 3) % 3) + 1; }
    function clearState() {
      cancelAnimationFrame(anim);
      trails.textContent = ""; pulseLayer.textContent = "";
      [1, 2, 3].forEach(function (p) { ports[p].setAttribute("class", "s-port"); });
    }
    function send(p) {
      clearState();
      lastPort = p;
      ports[p].classList.add("is-in");
      var outs = mag === 0 ? [next(p, 1), next(p, -1)] : [next(p, mag)];
      var quiet = mag === 0 ? [] : [next(p, -mag)];
      var paths = outs.map(function (o) {
        var pe = svg("path", { d: route(p, o), class: "s-trail" }, trails);
        if (mag === 0) { pe.setAttribute("stroke-width", 3); pe.setAttribute("opacity", 0.6); }
        var len = pe.getTotalLength();
        pe.setAttribute("stroke-dasharray", "0 " + (len + 10));
        return { el: pe, len: len, dot: svg("circle", { r: mag === 0 ? 5 : 7, class: "s-pulse" }, pulseLayer) };
      });
      var text = $("#circ-text");
      var o1 = outs[0], msg;
      if (mag === 0) {
        msg = "Magnet removed: the ferrite now treats both directions alike. The signal from port " + p + " splits between ports " + outs[0] + " and " + outs[1] +
          ", and part of it bounces straight back. No one-way behaviour.";
      } else {
        msg = "In at port " + p + ", out at port " + o1 + ". Port " + quiet[0] + " stays quiet.";
        if (mag === 1) {
          if (p === 1) msg += " The transmitter’s signal reaches the antenna, and none of it hits the delicate receiver.";
          if (p === 2) msg += " An echo arriving at the antenna goes to the receiver, not back into the transmitter.";
          if (p === 3) msg += " The roundabout always passes a signal to the next exit, so port 3 leads on to port 1.";
        } else {
          msg += " With the magnet flipped the roundabout runs the other way round.";
        }
      }
      function finish() {
        paths.forEach(function (pp) { pp.el.setAttribute("stroke-dasharray", "none"); pp.dot.remove(); });
        outs.forEach(function (o) { ports[o].classList.add("is-out"); });
        quiet.forEach(function (q) { ports[q].classList.add("is-quiet"); });
        text.textContent = msg;
      }
      if (reducedMotion()) { finish(); return; }
      text.textContent = "Signal entering port " + p + "…";
      var t0 = 0, DUR = 1300;
      function step(ts) {
        if (!t0) t0 = ts;
        var k = clamp((ts - t0) / DUR, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        paths.forEach(function (pp) {
          var l = pp.len * e, q = pp.el.getPointAtLength(l);
          pp.el.setAttribute("stroke-dasharray", l + " " + (pp.len + 10));
          pp.dot.setAttribute("cx", q.x); pp.dot.setAttribute("cy", q.y);
        });
        if (k < 1) anim = requestAnimationFrame(step); else finish();
      }
      anim = requestAnimationFrame(step);
    }
    $$("[data-circ-port]").forEach(function (b) { b.addEventListener("click", function () { send(parseInt(b.getAttribute("data-circ-port"), 10)); }); });
    $$("[data-circ-mag]").forEach(function (b) {
      b.addEventListener("click", function () {
        mag = parseInt(b.getAttribute("data-circ-mag"), 10);
        $$("[data-circ-mag]").forEach(function (o) { var on = o === b; o.classList.toggle("is-on", on); o.setAttribute("aria-pressed", on ? "true" : "false"); });
        drawSpin();
        if (lastPort) send(lastPort); else clearState();
      });
    });
    drawSpin();
  }

  /* ------------------------------------------------------------------ CH 6a: fabric permittivity */
  // Thesis Ch. 6, pp. 146 and 151: effective permittivity in the gap, and the material's own value.
  var SAMPLES = [
    { id: "lz", name: "Circuit-board check piece", phrase: "the circuit-board check piece", sub: "known value 1.96", eff: 1.65, er: 1.92,
      extra: "The maker’s value is 1.96, so the method is off by about 2%." },
    { id: "s1", name: "Fabric 1", phrase: "fabric 1", sub: "65% cotton, 35% polyester", eff: 1.33, er: 1.38,
      extra: "An independent resonance measurement of this fabric gave 1.41." },
    { id: "s2", name: "Fabric 2", phrase: "fabric 2", sub: "100% cotton", eff: 1.425, er: 1.53,
      extra: "Pure cotton slows the wave a little more than the blend." }
  ];
  function initFabric() {
    var body = $("#fabric-body"), root = $("#fabric-svg");
    var X0 = 52, X1 = 330, Y0 = 244, F0 = 13, F1 = 20, K = 15.5; // px per GHz of "air" phase
    function fx(f) { return X0 + (f - F0) / (F1 - F0) * (X1 - X0); }
    function fy(f, s) { return Y0 - (f * s - F0) * K - 14; }
    svg("path", { d: "M" + X0 + " 22V" + Y0 + "H" + (X1 + 16), class: "s-axis" }, root);
    svg("text", { x: X0, y: Y0 + 18, "text-anchor": "middle", class: "s-num", text: "13" }, root);
    svg("text", { x: X1, y: Y0 + 18, "text-anchor": "middle", class: "s-num", text: "20 GHz" }, root);
    svg("text", { class: "s-lbl", "text-anchor": "middle", transform: "translate(22 133) rotate(-90)", text: "how fast the phase turns" }, root);
    svg("line", { x1: fx(F0), y1: fy(F0, 1), x2: fx(F1), y2: fy(F1, 1), class: "s-wave-2" }, root);
    svg("text", { x: fx(F1) - 4, y: fy(F1, 1) + 20, "text-anchor": "end", class: "s-lbl", text: "empty (air)" }, root);
    var line = svg("line", { class: "s-wave" }, root);
    var lab = svg("text", { class: "s-lbl-strong", "text-anchor": "end" }, root);
    var rows = SAMPLES.map(function (s) {
      var btn = h("button", { type: "button", text: s.name });
      var c1 = h("td", {}, [btn, h("small", { text: s.sub })]);
      var tr = h("tr", {}, [c1, h("td", { class: "num", text: trim(s.eff, 3) }), h("td", { class: "num", text: fmt(s.er, 2) })]);
      tr.addEventListener("click", function () { select(s.id); });
      body.appendChild(tr);
      return { tr: tr, btn: btn };
    });
    function select(id) {
      SAMPLES.forEach(function (s, i) {
        var on = s.id === id;
        rows[i].tr.classList.toggle("is-on", on);
        rows[i].btn.setAttribute("aria-pressed", on ? "true" : "false");
        if (!on) return;
        var k = Math.sqrt(s.eff);
        line.setAttribute("x1", fx(F0)); line.setAttribute("y1", fy(F0, k));
        line.setAttribute("x2", fx(F1)); line.setAttribute("y2", fy(F1, k));
        lab.setAttribute("x", fx(F1) - 10); lab.setAttribute("y", fy(F1, k) - 2);
        lab.textContent = "with " + s.phrase;
        $("#fabric-text").textContent = "With " + s.phrase + " in the gap, the wave’s phase turns " + fmt(k, 3) +
          " times faster than in air. Squaring that gives the effective value, " + trim(s.eff, 3) +
          ". The calibration curve converts it to " + fmt(s.er, 2) + " for the material itself. " + s.extra;
      });
    }
    select("s1");
  }

  /* ------------------------------------------------------------------ CH 6b: leaky-wave antenna (illustrative tilt) */
  function initAntenna() {
    var root = $("#ant-svg"), input = $("#ant-f");
    var OX = 260, OY = 262;
    svg("line", { x1: OX, y1: OY, x2: OX, y2: 34, class: "s-ghost" }, root);
    svg("text", { x: OX, y: 24, "text-anchor": "middle", class: "s-lbl s-lbl-lg", text: "straight up" }, root);
    var beam = svg("path", { d: "M" + OX + " " + OY + "C" + (OX - 46) + " " + (OY - 90) + " " + (OX - 30) + " " + (OY - 214) + " " + OX + " " + (OY - 214) +
      "C" + (OX + 30) + " " + (OY - 214) + " " + (OX + 46) + " " + (OY - 90) + " " + OX + " " + OY + "Z", class: "s-beam" }, root);
    var arc = svg("path", { class: "s-dim" }, root);
    svg("rect", { x: 70, y: OY, width: 380, height: 16, rx: 3, class: "s-metal-dark" }, root);
    for (var i = 0; i < 12; i++) svg("rect", { x: 92 + i * 30, y: OY - 1, width: 12, height: 5, fill: "var(--surface)" }, root);
    svg("rect", { x: 70, y: OY + 16, width: 380, height: 22, rx: 3, class: "s-metal", opacity: 0.55 }, root);
    svg("text", { x: 260, y: OY + 60, "text-anchor": "middle", class: "s-lbl s-lbl-lg", text: "slotted lid above the waveguide (side view)" }, root);
    function update() {
      var f = parseFloat(input.value);
      var theta = (13.8 - f) / 0.6 * 14;      // illustrative only
      beam.setAttribute("transform", "rotate(" + theta.toFixed(2) + " " + OX + " " + OY + ")");
      if (theta > 0.5) {
        var r = 120, a = (theta - 90) * Math.PI / 180;
        arc.setAttribute("d", "M" + OX + " " + (OY - r) + "A" + r + " " + r + " 0 0 1 " + (OX + r * Math.cos(a)).toFixed(1) + " " + (OY + r * Math.sin(a)).toFixed(1));
      } else arc.setAttribute("d", "");
      $("#ant-out").textContent = fmt(f, 2).replace(/0$/, "") + " GHz";
      var d = 13.8 - f, msg;
      if (d < 0.025) msg = "13.8 GHz: every slot is exactly in step, so the beam points straight up. The thesis notes this is also the hardest point to match.";
      else msg = trim(f, 2) + " GHz: the slots are now slightly out of step with each other, so the beam " +
        (d <= 0.2 ? "leans a little" : d <= 0.4 ? "leans further" : "leans the furthest of the patterns shown") + " away from straight up. Lower the frequency and it leans more.";
      $("#ant-text").textContent = msg;
    }
    input.addEventListener("input", update);
    update();
  }

  /* ------------------------------------------------------------------ ALL RESULTS */
  var RESULTS = [
    { label: "Chapter 2 pin fence", sub: "what the pins allow", a: 10, b: 23, kind: "sim", note: "Stop band of the pins alone.", page: "p. 32" },
    { label: "Old connector, open end", sub: "at −10 dB", a: 12.5, b: 17, kind: "sim", note: "Earlier design, shown for comparison.", page: "p. 17" },
    { label: "Old connector, shorted end", sub: "at −10 dB", a: 11.5, b: 19, kind: "sim", note: "Earlier design, improved.", page: "p. 18" },
    { label: "New five-step connector", sub: "design band", a: 10, b: 25, kind: "meas", note: "Design target 10 to 25 GHz. Back-to-back measurement, plotted from 10 to 23 GHz, stays below −18 dB.", page: "pp. 23, 33–36" },
    { label: "Waveguide with new connectors", a: 12.5, b: 23, kind: "meas", note: "Lower edge set by the finite rows of pins.", page: "pp. 33–35" },
    { label: "Band-gap test: lab window", sub: "Ch. 3", a: 12.4, b: 18, kind: "meas", note: "Range the adapters allowed. The dispersion curve was extracted only here.", page: "p. 67" },
    { label: "Band-gap test: the pins’ band", sub: "Ch. 3", a: 17, b: 39, kind: "sim", note: "Guiding band of a waveguide built from the test pins. Mostly above the lab window.", page: "p. 70" },
    { label: "Square-pin line", sub: "with ridge", a: 10.7, b: 19.5, kind: "sim", note: "From the dispersion diagram. The line was also built.", page: "p. 87" },
    { label: "Grounded printed-cone line", sub: "with ridge", a: 9.3, b: 18.7, kind: "sim", note: "From the dispersion diagram. The line was also built.", page: "pp. 86–87" },
    { label: "Power divider", a: 10.3, b: 20.3, kind: "sim", note: "Reflection below −17 dB over 95% of the pins’ band.", page: "pp. 93–94" },
    { label: "3-dB hybrid coupler", a: 14, b: 16.5, kind: "meas", note: "16.6% bandwidth. Built and measured. Agrees with simulation.", page: "pp. 102–108" },
    { label: "Circulator, 15 GHz design", a: 12, b: 18, kind: "sim", note: "Almost 40% bandwidth around 15 GHz at −15 dB. Not built.", page: "pp. 122–126" },
    { label: "Circulator, 30 GHz design", a: 24, b: 36, kind: "sim", note: "Almost 40% bandwidth around 30 GHz at −15 dB. Not built.", page: "pp. 122–126" },
    { label: "Fabric measurement", sub: "plotted range", a: 13, b: 18, kind: "meas", note: "Frequency range of the plotted fabric measurements. The empty waveguide’s own band is 11 to 23 GHz.", page: "pp. 142, 151–154" },
    { label: "Leaky-wave antenna", sub: "beam patterns shown", a: 13.2, b: 13.8, kind: "sim", note: "Beam scans with frequency. Straight up at 13.8 GHz.", page: "pp. 159–162" }
  ];
  function initResults() {
    bandChart($("#results-chart"), { min: 8, max: 40, ticks: [10, 15, 20, 25, 30, 35, 40], refs: [[12.4, 18]], rows: RESULTS, tight: true });
    var tb = $("#results-table tbody");
    RESULTS.forEach(function (r) {
      var badge = h("span", { class: "badge badge-" + r.kind, text: r.kind === "meas" ? "Measured" : "Simulated" });
      tb.appendChild(h("tr", {}, [
        h("th", { scope: "row", text: r.label + (r.sub ? " (" + r.sub + ")" : "") }),
        h("td", { class: "num", text: trim(r.a, 2) + "–" + trim(r.b, 2) }),
        h("td", {}, [badge]),
        h("td", { text: r.note }),
        h("td", { class: "num", text: r.page })
      ]));
    });
  }

  /* ------------------------------------------------------------------ QUIZ */
  var QUIZ = [
    { q: "Why does the wave stay on the ridge instead of spreading out between the two metal plates?",
      opts: ["The pins form a solid wall with no openings", "Between the lid and the pin-tops, the gap is too thin for any wave in the stop band to fit", "The ridge is magnetised and attracts the wave", "Waves always follow the widest piece of metal"],
      right: 1, why: "The lid flips a reflected wave and the pin-tops do not. Between two such surfaces a wave needs at least a quarter wavelength of room, and the gap is smaller than that." },
    { q: "What is a band gap (stop band)?",
      opts: ["The physical air gap between the ridge and the lid", "The range of frequencies a connector reflects", "A range of frequencies that cannot travel through the field of pins", "The distance between two neighbouring pins"],
      right: 2, why: "It is a range of frequencies, not a distance. Inside it the pins act as a fence, so it is also the working band of the waveguide." },
    { q: "For a 5 mm pin under a 1 mm gap, the quick formulas predict a bandwidth ratio of 1.67 to 1. What does the thesis\u2019s full simulation of that pin give?",
      opts: ["Exactly the same ratio", "A much wider ratio, 2.39 to 1", "A narrower ratio than the formula", "No stop band at all"],
      right: 1, why: "The simulated ratio is 2.39 to 1, far wider than the formula\u2019s 1.67. The formulas show which way to move, but they are not accurate enough to design with." },
    { q: "A connector has a reflection of −20 dB. How much of the power bounces back?",
      opts: ["20%", "10%", "2%", "1%"],
      right: 3, why: "Every 10 dB is a factor of ten: −10 dB is a tenth, −20 dB is a hundredth, which is 1%." },
    { q: "Why does the thesis insist on including the ridge when working out the band?",
      opts: ["The ridge adds unwanted waves near the band edges, so the usable band is smaller than the pins alone suggest", "The ridge doubles the band", "Simulations cannot run without a ridge", "The ridge changes the colour of the dispersion diagram"],
      right: 0, why: "For square pins the ratio falls from 2.39 (pins alone) to 1.82 (with the ridge). Quoting the first number overstates what you can use." },
    { q: "In the circulator with the magnet on, a signal goes in at port 2. Where does it come out?",
      opts: ["Port 1", "Port 3", "Ports 1 and 3 equally", "It is absorbed in the ferrite"],
      right: 1, why: "A circulator passes each signal to the next port round: 1 to 2, 2 to 3, 3 to 1." },
    { q: "Which of these devices was actually built and measured in the thesis?",
      opts: ["The power divider", "The 30 GHz circulator", "The 3-dB hybrid coupler", "The leaky-wave antenna"],
      right: 2, why: "The coupler was fabricated and its measurements agree with simulation. The other three are reported from simulation only." }
  ];
  function initQuiz() {
    var list = $("#quiz-list"), score = $("#quiz-score");
    var answered = 0, correct = 0;
    function render() {
      list.textContent = ""; answered = 0; correct = 0; score.textContent = "";
      QUIZ.forEach(function (item, qi) {
        var fb = h("p", { class: "q-fb", id: "q-fb-" + qi });
        var opts = h("div", { class: "q-opts" });
        var buttons = item.opts.map(function (text, oi) {
          var b = h("button", { type: "button", class: "q-opt", text: text });
          b.addEventListener("click", function () {
            if (b.disabled) return;
            buttons.forEach(function (o) { o.disabled = true; });
            var ok = oi === item.right;
            b.classList.add(ok ? "is-right" : "is-wrong");
            if (!ok) buttons[item.right].classList.add("is-right");
            fb.textContent = (ok ? "Correct. " : "Not quite. ") + item.why;
            answered++; if (ok) correct++;
            score.textContent = "Answered " + answered + " of " + QUIZ.length + " · " + correct + " correct" + (answered === QUIZ.length ? "." : "");
            if (answered === QUIZ.length) {
              var again = h("button", { type: "button", class: "chip", text: "Try again", style: "margin-left:0.8rem" });
              again.addEventListener("click", function () { render(); list.scrollIntoView({ block: "start" }); });
              score.appendChild(again);
            }
          });
          opts.appendChild(b);
          return b;
        });
        list.appendChild(h("fieldset", { class: "q" }, [h("legend", { text: (qi + 1) + ". " + item.q }), opts, fb]));
      });
    }
    render();
  }

  /* ------------------------------------------------------------------ start */
  function start() {
    safe("tips", initTips);
    safe("theme", initTheme);
    safe("hero", initHero);
    safe("ruler", initRuler);
    safe("problem", initProblem);
    safe("fence", initFence);
    safe("ch2", initCh2);
    safe("ripple", initRipple);
    safe("dispersion", initDispersion);
    safe("shapes", initShapes);
    safe("devices", initDevices);
    safe("circulator", initCirculator);
    safe("fabric", initFabric);
    safe("antenna", initAntenna);
    safe("results", initResults);
    safe("quiz", initQuiz);
    safe("scroll", initScroll);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
