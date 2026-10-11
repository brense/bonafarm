/* Tiny dependency-free SVG charts. Marks carry series colour; text uses ink tokens. */
(function (g) {
  var NS = 'http://www.w3.org/2000/svg';
  var C = { ink: '#5F665C', grid: '#E4E7E0', axis: '#C9CEC4', surface: '#fff', brand: '#2F7D4F',
            seq: ['#E3F0E7', '#B5D6C0', '#7DB592', '#4A9468', '#1F5F3A'] };
  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, s, anchor, extra) {
    var t = el('text', Object.assign({ x: x, y: y, 'text-anchor': anchor || 'start' }, extra || {}), parent);
    t.textContent = s; return t;
  }
  function svg(container, w, h) {
    container.innerHTML = '';
    container.classList.add('chart');
    return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: w, height: h, role: 'img' }, container);
  }
  function width(c) { return Math.max(240, c.clientWidth || 320); }
  function niceMax(v) {
    var p = Math.pow(10, Math.floor(Math.log10(v || 1))), f = v / p;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  }
  function fmt(n) { return String(Math.round(n * 10) / 10).replace('.', ','); }
  function path(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join(' '); }

  /* column with 4px rounded top end, square at baseline */
  function col(parent, x, y, w, h, fill) {
    var r = Math.min(4, w / 2, h);
    if (h <= 0) return;
    el('path', { d: 'M' + x + ' ' + (y + h) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
      'H' + (x + w - r) + 'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) + 'V' + (y + h) + 'Z', fill: fill }, parent);
  }

  function barChart(c, o) {
    var W = width(c), H = o.height || 180, m = { t: 28, r: 8, b: 22, l: o.yLabel ? 34 : 28 };
    var s = svg(c, W, H), max = niceMax(Math.max.apply(null, o.values)), ih = H - m.t - m.b, iw = W - m.l - m.r;
    [0, .5, 1].forEach(function (f) {
      var y = m.t + ih * (1 - f);
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: f ? C.grid : C.axis, 'stroke-width': 1 }, s);
      text(s, m.l - 6, y + 4, fmt(max * f), 'end');
    });
    if (o.yLabel) text(s, 0, 10, o.yLabel);
    var n = o.values.length, slot = iw / n, bw = Math.min(24, slot - 2);
    o.values.forEach(function (v, i) {
      var h = ih * v / max, x = m.l + slot * i + (slot - bw) / 2, last = i === n - 1;
      col(s, x, m.t + ih - h, bw, h, o.highlightLast && !last ? C.seq[1] : (o.color || C.brand));
      text(s, x + bw / 2, H - 6, o.labels[i], 'middle');
      if (last && o.highlightLast) text(s, x + bw / 2, m.t + ih - h - 5, fmt(v), 'middle', { 'font-weight': 600 });
    });
  }

  function lineChart(c, o) {
    var W = width(c), H = o.height || 190, m = { t: 28, r: 64, b: 22, l: 34 };
    var s = svg(c, W, H), all = [].concat.apply([], o.series.map(function (x) { return x.values; }));
    var max = niceMax(Math.max.apply(null, all)), ih = H - m.t - m.b, iw = W - m.l - m.r, n = o.labels.length;
    [0, .5, 1].forEach(function (f) {
      var y = m.t + ih * (1 - f);
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: f ? C.grid : C.axis, 'stroke-width': 1,
                   'stroke-dasharray': f ? '3 3' : '' }, s);
      text(s, m.l - 6, y + 4, fmt(max * f), 'end');
    });
    if (o.yLabel) text(s, 0, 10, o.yLabel);
    var step = Math.ceil(n / 6);
    o.labels.forEach(function (l, i) { if (i % step === 0 || i === n - 1) text(s, m.l + iw * i / (n - 1), H - 6, l, 'middle'); });
    o.series.forEach(function (se, k) {
      var col_ = se.color || 'var(--cat-' + (k + 1) + ')';
      var pts = se.values.map(function (v, i) { return [m.l + iw * i / (n - 1), m.t + ih * (1 - v / max)]; });
      el('path', { d: path(pts), fill: 'none', stroke: col_, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, s);
      var e = pts[pts.length - 1];
      el('circle', { cx: e[0], cy: e[1], r: 4, fill: col_, stroke: C.surface, 'stroke-width': 2 }, s);
      text(s, e[0] + 9, e[1] + 4, se.name, 'start');
    });
  }

  function sparkline(c, values, color) {
    var W = width(c), H = c.clientHeight || 28, mx = Math.max.apply(null, values), mn = Math.min.apply(null, values);
    var s = svg(c, W, H), pts = values.map(function (v, i) {
      return [4 + (W - 8) * i / (values.length - 1), 4 + (H - 8) * (1 - (v - mn) / ((mx - mn) || 1))]; });
    el('path', { d: path(pts), fill: 'none', stroke: color || C.brand, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, s);
    var e = pts[pts.length - 1];
    el('circle', { cx: e[0], cy: e[1], r: 4, fill: color || C.brand, stroke: C.surface, 'stroke-width': 2 }, s);
  }

  function heatStrip(c, o) {
    var W = width(c), H = 52, s = svg(c, W, H), n = o.values.length, gap = 2, cw = (W - gap * (n - 1)) / n;
    var mx = Math.max.apply(null, o.values), mn = Math.min.apply(null, o.values);
    o.values.forEach(function (v, i) {
      var t = (v - mn) / ((mx - mn) || 1), idx = Math.min(4, Math.floor(t * 5));
      el('rect', { x: i * (cw + gap), y: 0, width: cw, height: 30, rx: 4, fill: C.seq[idx] }, s);
      text(s, i * (cw + gap) + cw / 2, 46, o.labels[i], 'middle');
    });
  }

  /* horizontal progress bar; value/max, or segments: [{value,color}] with 2px gaps */
  function gauge(c, o) {
    var W = width(c), H = 34, s = svg(c, W, H), bw = W, y = 18, h = 10;
    text(s, 0, 10, o.label || '');
    text(s, W, 10, fmt(o.value) + ' / ' + fmt(o.max), 'end');
    el('rect', { x: 0, y: y, width: bw, height: h, rx: 4, fill: C.seq[0] }, s);
    var segs = o.segments || [{ value: o.value, color: o.color || C.brand }], x = 0;
    segs.forEach(function (sg, i) {
      var w = bw * sg.value / o.max - (i ? 2 : 0);
      if (w > 0) el('rect', { x: x + (i ? 2 : 0), y: y, width: w, height: h, rx: 4, fill: sg.color }, s);
      x += bw * sg.value / o.max;
    });
  }

  g.Charts = { barChart: barChart, lineChart: lineChart, sparkline: sparkline, heatStrip: heatStrip, gauge: gauge, stackedBar: gauge };
  g.barChart = barChart; g.lineChart = lineChart; g.sparkline = sparkline; g.heatStrip = heatStrip; g.gauge = gauge; g.stackedBar = gauge;
})(window);
